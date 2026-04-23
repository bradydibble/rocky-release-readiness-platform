#!/usr/bin/env bash
# r3p-helper.sh — Rocky Linux Release Readiness Platform test helper
#
# Run on your Rocky Linux test instance:
#   curl -sSL https://r3p.bradydibble.com/r3p-helper.sh | bash
#
# Or with direct submission:
#   bash r3p-helper.sh --milestone-id 2 --api-url https://r3p.bradydibble.com
#
# Output: JSON blob with system info and check results, printed to stdout.

set -euo pipefail

MILESTONE_ID=""
API_URL=""
SUBMITTER_NAME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --milestone-id) MILESTONE_ID="$2"; shift 2 ;;
    --api-url)      API_URL="$2";      shift 2 ;;
    --name)         SUBMITTER_NAME="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# ── Collect system info ────────────────────────────────────────────────────────

ARCH=$(uname -m)
KERNEL=$(uname -r)

# Rocky Linux version
ROCKY_VERSION=""
if [[ -f /etc/rocky-release ]]; then
  ROCKY_VERSION=$(grep -oP '\d+\.\d+' /etc/rocky-release | head -1)
fi

# CPU and RAM
CPU_MODEL=$(grep -m1 "model name" /proc/cpuinfo 2>/dev/null | cut -d: -f2 | sed 's/^ *//' || echo "unknown")
RAM_GB=$(awk '/MemTotal/ { printf "%.0f", $2/1024/1024 }' /proc/meminfo 2>/dev/null || echo "0")
HARDWARE_NOTES="${CPU_MODEL}, ${RAM_GB}GB RAM"

# Deployment type guess via DMI
DEPLOY_TYPE="bare-metal"
if systemd-detect-virt --vm -q 2>/dev/null; then
  VIRT=$(systemd-detect-virt --vm 2>/dev/null || echo "vm")
  case "$VIRT" in
    kvm)         DEPLOY_TYPE="vm-kvm" ;;
    vmware)      DEPLOY_TYPE="vm-vmware" ;;
    oracle)      DEPLOY_TYPE="vm-virtualbox" ;;
    microsoft)   DEPLOY_TYPE="vm-hyperv" ;;
    amazon)      DEPLOY_TYPE="cloud-aws" ;;
    *)           DEPLOY_TYPE="vm-other" ;;
  esac
elif [[ -f /sys/hypervisor/type ]]; then
  DEPLOY_TYPE="vm-xen"
fi

# ── Run checks ────────────────────────────────────────────────────────────────

# selinux_enforcing: SELinux is in Enforcing mode
selinux_enforcing=false
if command -v getenforce &>/dev/null; then
  [[ "$(getenforce 2>/dev/null)" == "Enforcing" ]] && selinux_enforcing=true
fi

# firewalld_active: firewalld service is running
firewalld_active=false
if systemctl is-active --quiet firewalld 2>/dev/null; then
  firewalld_active=true
fi

# failed_services: number of failed systemd units
failed_services=0
failed_services=$(systemctl list-units --state=failed --no-legend 2>/dev/null | wc -l | tr -d ' ')

# dnf_update_clean: dnf check produces no errors
dnf_update_clean=false
if command -v dnf &>/dev/null; then
  if dnf check &>/dev/null; then
    dnf_update_clean=true
  fi
fi

# boot_errors: number of error-level journal entries since last boot
boot_errors=0
if command -v journalctl &>/dev/null; then
  boot_errors=$(journalctl -b -p err --no-pager -q 2>/dev/null | wc -l | tr -d ' ')
fi

# ntp_synced: chrony or systemd-timesyncd is synchronized
ntp_synced=false
if command -v chronyc &>/dev/null; then
  ref=$(chronyc tracking 2>/dev/null | grep "Reference ID" | awk '{print $4}')
  [[ "$ref" != "00000000" && -n "$ref" ]] && ntp_synced=true
elif timedatectl show --property=NTPSynchronized --value 2>/dev/null | grep -q "yes"; then
  ntp_synced=true
fi

# ssh_active: sshd is running
ssh_active=false
if systemctl is-active --quiet sshd 2>/dev/null || systemctl is-active --quiet ssh 2>/dev/null; then
  ssh_active=true
fi

# boot_target_ok: default boot target is multi-user or graphical
boot_target_ok=false
if command -v systemctl &>/dev/null; then
  target=$(systemctl get-default 2>/dev/null)
  [[ "$target" == "multi-user.target" || "$target" == "graphical.target" ]] && boot_target_ok=true
fi

# ── Build JSON output ─────────────────────────────────────────────────────────

json_bool() { [[ "$1" == "true" ]] && echo "true" || echo "false"; }

OUTPUT=$(cat <<EOF
{
  "arch": "${ARCH}",
  "deploy_type": "${DEPLOY_TYPE}",
  "hardware_notes": "${HARDWARE_NOTES}",
  "kernel": "${KERNEL}",
  "rocky_version": "${ROCKY_VERSION}",
  "checks": {
    "selinux_enforcing": $(json_bool $selinux_enforcing),
    "firewalld_active": $(json_bool $firewalld_active),
    "failed_services": ${failed_services},
    "dnf_update_clean": $(json_bool $dnf_update_clean),
    "boot_errors": ${boot_errors},
    "ntp_synced": $(json_bool $ntp_synced),
    "ssh_active": $(json_bool $ssh_active),
    "boot_target_ok": $(json_bool $boot_target_ok)
  }
}
EOF
)

echo "$OUTPUT"

# ── Optional direct submission ────────────────────────────────────────────────

if [[ -n "$MILESTONE_ID" && -n "$API_URL" ]]; then
  echo "" >&2
  echo "Submitting to ${API_URL} milestone #${MILESTONE_ID}..." >&2

  NAME_FIELD=""
  if [[ -n "$SUBMITTER_NAME" ]]; then
    NAME_FIELD=", \"submitter_name\": \"${SUBMITTER_NAME}\""
  fi

  # Build results array from check map
  # selinux_enforcing → Post-Installation Requirements / SELinux in enforcing mode
  # firewalld_active  → Post-Installation Requirements / Firewalld active and default zone
  # failed_services=0 → Post-Installation Requirements / All default enabled services start
  # dnf_update_clean  → Post-Installation Requirements / dnf update produces no errors
  # boot_errors=0     → Post-Installation Requirements / System journal: no critical
  # ntp_synced        → Post-Installation Requirements / NTP/Chrony synchronized
  # ssh_active        → Community Testable Items / Basic ssh daemon installs and starts
  # boot_target_ok    → Community Testable Items / Default boot target is graphical or multi-user

  RESULTS_JSON=""
  add_result() {
    local section="$1" tc_name="$2" outcome="$3"
    if [[ -n "$RESULTS_JSON" ]]; then RESULTS_JSON+=","; fi
    RESULTS_JSON+="{\"section_name\":\"${section}\",\"test_case_name\":\"${tc_name}\",\"outcome\":\"${outcome}\"}"
  }

  [[ "$selinux_enforcing" == "true" ]] && SEL_OUT="PASS" || SEL_OUT="FAIL"
  add_result "Post-Installation Requirements" "selinux in enforcing mode" "$SEL_OUT"

  [[ "$firewalld_active" == "true" ]] && FW_OUT="PASS" || FW_OUT="FAIL"
  add_result "Post-Installation Requirements" "firewalld active and default zone" "$FW_OUT"

  [[ "$failed_services" -eq 0 ]] && SVC_OUT="PASS" || SVC_OUT="FAIL"
  add_result "Post-Installation Requirements" "all default enabled services start without errors" "$SVC_OUT"

  [[ "$dnf_update_clean" == "true" ]] && DNF_OUT="PASS" || DNF_OUT="FAIL"
  add_result "Post-Installation Requirements" "dnf update produces no errors" "$DNF_OUT"

  [[ "$boot_errors" -eq 0 ]] && BOOT_OUT="PASS" || BOOT_OUT="FAIL"
  add_result "Post-Installation Requirements" "system journal: no critical" "$BOOT_OUT"

  [[ "$ntp_synced" == "true" ]] && NTP_OUT="PASS" || NTP_OUT="FAIL"
  add_result "Post-Installation Requirements" "ntp/chrony synchronized" "$NTP_OUT"

  [[ "$ssh_active" == "true" ]] && SSH_OUT="PASS" || SSH_OUT="FAIL"
  add_result "Community Testable Items" "basic ssh daemon installs and starts" "$SSH_OUT"

  [[ "$boot_target_ok" == "true" ]] && TGT_OUT="PASS" || TGT_OUT="FAIL"
  add_result "Community Testable Items" "default boot target is graphical or multi-user" "$TGT_OUT"

  SUBMIT_PAYLOAD="{\"arch\":\"${ARCH}\",\"deploy_type\":\"${DEPLOY_TYPE}\",\"hardware_notes\":\"${HARDWARE_NOTES}\"${NAME_FIELD},\"results\":[${RESULTS_JSON}]}"

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$SUBMIT_PAYLOAD" \
    "${API_URL}/api/v1/milestones/${MILESTONE_ID}/bulk-import")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [[ "$HTTP_CODE" == "200" ]]; then
    IMPORTED=$(echo "$BODY" | grep -oP '"imported":\s*\K\d+' || echo "?")
    SKIPPED=$(echo "$BODY" | grep -oP '"skipped":\s*\K\d+' || echo "?")
    echo "Done: ${IMPORTED} results submitted, ${SKIPPED} skipped." >&2
  else
    echo "Submission failed (HTTP ${HTTP_CODE}): ${BODY}" >&2
    exit 1
  fi
fi
