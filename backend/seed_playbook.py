#!/usr/bin/env python3
"""
Seed script: Rocky Linux 9.8 Beta test playbook.

Creates one release (Rocky Linux 9.8), one milestone (beta), and ~143 test cases
across 14 sections — mirroring the canonical Rocky 9.x playbook structure.

Usage:
  python seed_playbook.py --base-url http://localhost:8000 --token <ADMIN_TOKEN>

Optional:
  --release-name "Rocky Linux 9.8"  (default)
  --milestone    "beta"             (default)
  --start-date   "2026-04-01"       ISO date, optional
  --end-date     "2026-04-21"       ISO date, optional
"""

import argparse
import json
import sys
import urllib.request
import urllib.error


def api(base: str, path: str, method: str = "GET", body=None,
        token_cookie: str = "") -> dict:
    url = f"{base}/api/v1{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token_cookie:
        req.add_header("Cookie", f"admin_session={token_cookie}")
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 204:
                return {}
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        print(f"HTTP {e.code} on {method} {path}: {body_text}", file=sys.stderr)
        sys.exit(1)


def login(base: str, token: str) -> str:
    """Login and return the session cookie value."""
    url = f"{base}/api/v1/auth/login"
    data = json.dumps({"token": token}).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            # Extract session cookie
            set_cookie = resp.getheader("Set-Cookie", "")
            for part in set_cookie.split(";"):
                part = part.strip()
                if part.startswith("admin_session="):
                    return part[len("admin_session="):]
            return ""
    except urllib.error.HTTPError as e:
        print(f"Login failed: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


# ── Playbook data ─────────────────────────────────────────────────────────────

SECTIONS = [
    {
        "name": "Community Testable Items",
        "architecture": None,
        "test_cases": [
            ("No Broken Packages - QA:Testcase Media Repoclosure", "blocker"),
            ("Release-blocking package installability", "blocker"),
            ("Default boot target is graphical or multi-user", "blocker"),
            ("System boots without kernel panic", "blocker"),
            ("SELinux not reporting errors on clean install", "blocker"),
            ("NetworkManager brings up default interface on boot", "blocker"),
            ("Basic web server (httpd) installs and starts", "normal"),
            ("Basic SSH daemon installs and starts", "normal"),
            ("Firewalld installs and starts, default zone set", "normal"),
            ("DNF update completes without errors on fresh install", "normal"),
            ("System clock synchronized via chrony after install", "normal"),
            ("EPEL repository can be installed and used", "normal"),
            ("Rocky Linux branding correct (release file, motd)", "normal"),
            ("Basic container runtime (podman) installs and runs hello-world", "normal"),
            ("Python 3 and pip available and functional", "normal"),
            ("Cockpit installs and web console is reachable", "normal"),
            ("System journal logs no critical errors after clean boot", "normal"),
        ],
    },
    {
        "name": "Repository Checks",
        "architecture": "x86_64",
        "test_cases": [
            ("BaseOS repo: package count matches RHEL 9 baseline", "blocker"),
            ("AppStream repo: modules and streams available", "blocker"),
            ("CRB (CodeReady Builder) repo available and functional", "blocker"),
            ("Extras repo available and functional", "blocker"),
            ("No packages with incorrect dist tag", "blocker"),
            ("No duplicate package names across BaseOS/AppStream", "blocker"),
        ],
    },
    {
        "name": "Repository Checks",
        "architecture": "aarch64",
        "test_cases": [
            ("BaseOS repo: package count matches RHEL 9 baseline (aarch64)", "blocker"),
            ("AppStream repo: modules and streams available (aarch64)", "blocker"),
            ("CRB repo available and functional (aarch64)", "blocker"),
            ("Extras repo available and functional (aarch64)", "blocker"),
            ("No packages with incorrect dist tag (aarch64)", "blocker"),
            ("No duplicate package names across BaseOS/AppStream (aarch64)", "blocker"),
        ],
    },
    {
        "name": "Repository Checks",
        "architecture": "s390x",
        "test_cases": [
            ("BaseOS repo: package count matches RHEL 9 baseline (s390x)", "blocker"),
            ("AppStream repo: modules and streams available (s390x)", "blocker"),
            ("CRB repo available and functional (s390x)", "blocker"),
            ("Extras repo available and functional (s390x)", "blocker"),
            ("No packages with incorrect dist tag (s390x)", "blocker"),
        ],
    },
    {
        "name": "Repository Checks",
        "architecture": "ppc64le",
        "test_cases": [
            ("BaseOS repo: package count matches RHEL 9 baseline (ppc64le)", "blocker"),
            ("AppStream repo: modules and streams available (ppc64le)", "blocker"),
            ("CRB repo available and functional (ppc64le)", "blocker"),
            ("Extras repo available and functional (ppc64le)", "blocker"),
            ("No packages with incorrect dist tag (ppc64le)", "blocker"),
        ],
    },
    {
        "name": "Installer Requirements (OpenQA)",
        "architecture": "x86_64",
        "test_cases": [
            ("Graphical install - Server with GUI, LVM auto-partition (BIOS)", "blocker"),
            ("Graphical install - Server with GUI, LVM auto-partition (UEFI)", "blocker"),
            ("Graphical install - Minimal Install (BIOS)", "blocker"),
            ("Graphical install - Minimal Install (UEFI)", "blocker"),
            ("Text mode install - Minimal", "blocker"),
            ("Kickstart install from network (HTTP)", "blocker"),
            ("Kickstart install - LVM thin provisioning", "blocker"),
            ("Kickstart install - LUKS encrypted disk", "blocker"),
            ("Upgrade from Rocky 9.7 using dnf", "blocker"),
            ("Custom partition layout: separate /home and /var", "blocker"),
            ("RAID1 software RAID install", "blocker"),
            ("Secure Boot install (UEFI + Secure Boot enabled)", "blocker"),
            ("Install with custom hostname and static IP via Anaconda", "normal"),
            ("Install with custom user and root password via Anaconda", "normal"),
            ("Boot ISO (minimal boot media) installs from network repo", "blocker"),
            ("Anaconda language/locale/keyboard selection preserved post-install", "normal"),
        ],
    },
    {
        "name": "Installer Requirements (OpenQA)",
        "architecture": "aarch64",
        "test_cases": [
            ("Graphical install - Server with GUI, LVM auto-partition (UEFI aarch64)", "blocker"),
            ("Graphical install - Minimal Install (UEFI aarch64)", "blocker"),
            ("Text mode install - Minimal (aarch64)", "blocker"),
            ("Kickstart install from network (HTTP, aarch64)", "blocker"),
            ("Kickstart install - LUKS encrypted disk (aarch64)", "blocker"),
            ("Upgrade from Rocky 9.7 using dnf (aarch64)", "blocker"),
            ("Custom partition layout: separate /home and /var (aarch64)", "blocker"),
            ("Secure Boot install (UEFI + Secure Boot enabled, aarch64)", "blocker"),
            ("Install with custom hostname and static IP (aarch64)", "normal"),
            ("Install with custom user and root password (aarch64)", "normal"),
            ("Boot ISO installs from network repo (aarch64)", "blocker"),
            ("Serial console install (aarch64)", "normal"),
            ("VirtIO disk install in KVM (aarch64)", "blocker"),
            ("iSCSI target install (aarch64)", "normal"),
            ("Anaconda locale/keyboard selection preserved (aarch64)", "normal"),
        ],
    },
    {
        "name": "Post-Installation Requirements",
        "architecture": "x86_64",
        "test_cases": [
            ("dnf update produces no errors on fresh install", "blocker"),
            ("SELinux in enforcing mode, no denials on clean boot", "blocker"),
            ("Firewalld active and default zone is 'public'", "blocker"),
            ("All default enabled services start without errors", "blocker"),
            ("System journal: no critical/emergency log entries on first boot", "blocker"),
            ("IPv4 and IPv6 networking functional (ping test)", "blocker"),
            ("NTP/chrony synchronized after 5 minutes", "normal"),
            ("Sudo works for wheel group member", "normal"),
            ("SSH key-based login works", "normal"),
            ("Locale and timezone set correctly per install choice", "normal"),
            ("dnf install of @^server-product-environment succeeds", "normal"),
            ("FIPS mode can be enabled via fips-mode-setup", "normal"),
            ("System survives reboot without data loss (3x reboot test)", "blocker"),
            ("kernel-modules-extra installs without dependency errors", "normal"),
        ],
    },
    {
        "name": "Post-Installation Requirements",
        "architecture": "aarch64",
        "test_cases": [
            ("dnf update produces no errors on fresh install (aarch64)", "blocker"),
            ("SELinux in enforcing mode, no denials on clean boot (aarch64)", "blocker"),
            ("Firewalld active and default zone is 'public' (aarch64)", "blocker"),
            ("All default enabled services start without errors (aarch64)", "blocker"),
            ("System journal: no critical entries on first boot (aarch64)", "blocker"),
            ("IPv4 and IPv6 networking functional (aarch64)", "blocker"),
            ("NTP/chrony synchronized after 5 minutes (aarch64)", "normal"),
            ("Sudo works for wheel group member (aarch64)", "normal"),
            ("SSH key-based login works (aarch64)", "normal"),
            ("Locale and timezone set correctly (aarch64)", "normal"),
            ("dnf install of @^server-product-environment succeeds (aarch64)", "normal"),
            ("FIPS mode can be enabled (aarch64)", "normal"),
            ("System survives reboot without data loss (aarch64)", "blocker"),
            ("kernel-modules-extra installs without dependency errors (aarch64)", "normal"),
        ],
    },
    {
        "name": "Cloud Image Requirements",
        "architecture": None,
        "test_cases": [
            ("AWS EC2 x86_64 image boots and cloud-init completes", "blocker"),
            ("AWS EC2 aarch64 image boots and cloud-init completes", "blocker"),
            ("Azure x86_64 image boots and waagent runs", "blocker"),
            ("Azure aarch64 image boots and waagent runs", "blocker"),
            ("GCP x86_64 image boots with correct metadata agent", "blocker"),
            ("Oracle Cloud x86_64 image boots correctly", "normal"),
            ("DigitalOcean Droplet x86_64 image boots correctly", "normal"),
            ("cloud-init: hostname set from instance metadata", "blocker"),
            ("cloud-init: SSH authorized key injected correctly", "blocker"),
            ("cloud-init: User data scripts execute on first boot", "normal"),
            ("Rocky Linux release version correct in cloud image", "blocker"),
            ("Cloud image disk size expandable via cloud-init growpart", "normal"),
        ],
    },
    {
        "name": "Cloud Image Testing",
        "architecture": None,
        "test_cases": [
            ("AWS: EBS volume attach and detach without errors", "normal"),
            ("AWS: Instance metadata service (IMDSv2) accessible", "normal"),
            ("Azure: Azure CLI installs and authenticates", "normal"),
            ("GCP: gcloud SDK installs and lists instances", "normal"),
            ("Container image (OCI): podman pull rockylinux:9 works", "normal"),
            ("Container image: dnf update in container succeeds", "normal"),
            ("Container image (minimal): size under 200MB", "normal"),
            ("Container image: systemd-based container starts without issues", "normal"),
            ("GenericCloud image: QEMU/KVM boot test with VirtIO", "normal"),
            ("EC2: IPv6 dual-stack networking functional in VPC", "normal"),
        ],
    },
    {
        "name": "SIG/AltArch — Raspberry Pi",
        "architecture": "aarch64",
        "test_cases": [
            ("Raspberry Pi 4 (4GB): boots from MicroSD card", "normal"),
            ("Raspberry Pi 4 (8GB): boots from USB SSD", "normal"),
            ("Raspberry Pi 5: boots from MicroSD card", "normal"),
            ("Raspberry Pi 3B+: boots and reaches login prompt", "normal"),
            ("GPIO access functional (sysfs or gpiod)", "normal"),
            ("HDMI output and framebuffer console work", "normal"),
            ("USB peripherals (keyboard, mouse) recognized", "normal"),
            ("Wired Ethernet (Pi 4/5) gets DHCP address", "normal"),
            ("WiFi adapter (Pi 4/5) associates with WPA2 network", "normal"),
            ("dnf update succeeds and system reboots cleanly", "normal"),
        ],
    },
    {
        "name": "Final Release Checks",
        "architecture": None,
        "test_cases": [
            ("No Broken Packages: full repoclosure passes all arches", "blocker"),
            ("Release notes accurate and accessible at rockylinux.org", "blocker"),
            ("SHA256 checksums match published values for all ISOs", "blocker"),
            ("GPG signatures valid on all released packages", "blocker"),
        ],
    },
    {
        "name": "Operations",
        "architecture": None,
        "test_cases": [
            ("Migration from CentOS Stream 9 via migrate2rocky", "normal"),
            ("Migration from AlmaLinux 9 via migrate2rocky", "normal"),
            ("Katello/Foreman registration and content sync", "normal"),
            ("Satellite 6 registration (RHSM-compatible)", "normal"),
            ("Ansible managed node: yum module works correctly", "normal"),
            ("Ansible managed node: service and user modules work", "normal"),
            ("System logging to remote rsyslog server", "normal"),
            ("SSSD + FreeIPA domain join and authentication", "normal"),
            ("Samba AD domain join and share mount", "normal"),
        ],
    },
    # ── s390x: Installer + Post-Install ───────────────────────────────────────
    # s390x has no physical installer media; installs via HMC/z/VM or kickstart.
    # DASD disk handling and s390-tools are critical validation items.
    {
        "name": "Installer Requirements",
        "architecture": "s390x",
        "test_cases": [
            ("z/VM guest install via kickstart (DASD disk)", "blocker"),
            ("z/VM guest install via kickstart (SCSI/FCP disk)", "blocker"),
            ("LPAR install via kickstart (DASD disk)", "blocker"),
            ("KVM guest install on s390x host via kickstart", "blocker"),
            ("Upgrade from Rocky 9.7 using dnf (s390x)", "blocker"),
            ("Text mode install via VNC (s390x)", "blocker"),
            ("LUKS encrypted DASD install", "normal"),
            ("LVM auto-partition on DASD (s390x)", "blocker"),
            ("Network install via FTP/HTTP repo (s390x)", "normal"),
        ],
    },
    {
        "name": "Post-Installation Requirements",
        "architecture": "s390x",
        "test_cases": [
            ("dnf update produces no errors on fresh install (s390x)", "blocker"),
            ("SELinux in enforcing mode, no denials on clean boot (s390x)", "blocker"),
            ("Firewalld active and default zone is 'public' (s390x)", "blocker"),
            ("All default enabled services start without errors (s390x)", "blocker"),
            ("System journal: no critical entries on first boot (s390x)", "blocker"),
            ("IPv4 networking functional via OSA or HiperSockets (s390x)", "blocker"),
            ("s390-tools (chccwdev, lszdev, cio_ignore) installed and functional", "blocker"),
            ("DASD device online/offline cycle without data loss", "blocker"),
            ("FCP/zFCP storage path (multipath) functional", "normal"),
            ("System survives reboot without data loss (s390x)", "blocker"),
            ("NTP/chrony synchronized after 5 minutes (s390x)", "normal"),
            ("Sudo works for wheel group member (s390x)", "normal"),
            ("SSH key-based login works (s390x)", "normal"),
            ("FIPS mode can be enabled (s390x)", "normal"),
        ],
    },
    # ── ppc64le: Installer + Post-Install ─────────────────────────────────────
    # Power Systems use LPAR/PowerVM or KVM. VSCSI/NVME storage paths differ.
    {
        "name": "Installer Requirements",
        "architecture": "ppc64le",
        "test_cases": [
            ("Graphical install - Minimal Install via HMC VNC (LPAR)", "blocker"),
            ("Kickstart install via network (ppc64le LPAR)", "blocker"),
            ("KVM guest install on ppc64le host (VirtIO)", "blocker"),
            ("Upgrade from Rocky 9.7 using dnf (ppc64le)", "blocker"),
            ("LVM auto-partition on VSCSI disk (ppc64le)", "blocker"),
            ("Text mode install - Minimal (ppc64le)", "blocker"),
            ("LUKS encrypted disk install (ppc64le)", "normal"),
            ("Kickstart install - custom partition layout (ppc64le)", "normal"),
            ("Boot from SAN (NPIV/FC) storage (ppc64le)", "normal"),
        ],
    },
    {
        "name": "Post-Installation Requirements",
        "architecture": "ppc64le",
        "test_cases": [
            ("dnf update produces no errors on fresh install (ppc64le)", "blocker"),
            ("SELinux in enforcing mode, no denials on clean boot (ppc64le)", "blocker"),
            ("Firewalld active and default zone is 'public' (ppc64le)", "blocker"),
            ("All default enabled services start without errors (ppc64le)", "blocker"),
            ("System journal: no critical entries on first boot (ppc64le)", "blocker"),
            ("IPv4 and IPv6 networking functional (ppc64le)", "blocker"),
            ("System survives reboot without data loss (ppc64le)", "blocker"),
            ("NTP/chrony synchronized after 5 minutes (ppc64le)", "normal"),
            ("Sudo works for wheel group member (ppc64le)", "normal"),
            ("SSH key-based login works (ppc64le)", "normal"),
            ("FIPS mode can be enabled (ppc64le)", "normal"),
            ("IBM Power-specific kernel parameters preserved after update", "normal"),
        ],
    },
    # ── Virtualization (KVM Host) ──────────────────────────────────────────────
    # Rocky is heavily used as a KVM hypervisor host. This section covers
    # core libvirt/KVM functionality that must work on a fresh Rocky install.
    {
        "name": "Virtualization — KVM Host",
        "architecture": "x86_64",
        "test_cases": [
            ("KVM/QEMU installed and kvm kernel module loads", "blocker"),
            ("libvirtd service starts and virsh list succeeds", "blocker"),
            ("virt-install creates and boots a guest VM", "blocker"),
            ("VirtIO NIC: guest gets DHCP address from host bridge", "blocker"),
            ("VirtIO disk: guest I/O survives 1GB dd write/read", "blocker"),
            ("virsh snapshot-create and snapshot-revert work", "normal"),
            ("Guest migration: virsh migrate (offline) to another host", "normal"),
            ("Storage pool (dir type) create, define, start, autostart", "normal"),
            ("Guest console via virsh console works", "normal"),
            ("Nested virtualization: guest can load kvm_intel module", "normal"),
        ],
    },
    {
        "name": "Virtualization — KVM Host",
        "architecture": "aarch64",
        "test_cases": [
            ("KVM/QEMU installed and kvm kernel module loads (aarch64)", "blocker"),
            ("libvirtd service starts and virsh list succeeds (aarch64)", "blocker"),
            ("virt-install creates and boots an aarch64 guest VM", "blocker"),
            ("VirtIO NIC: guest gets DHCP address from host bridge (aarch64)", "blocker"),
            ("VirtIO disk: guest I/O survives 1GB dd write/read (aarch64)", "blocker"),
            ("virsh snapshot-create and snapshot-revert work (aarch64)", "normal"),
            ("Storage pool (dir type) create, define, start, autostart (aarch64)", "normal"),
        ],
    },
    # ── Guest Compatibility (VMware / Hyper-V) ─────────────────────────────────
    # Significant enterprise deployments run Rocky as a guest on VMware ESXi
    # and Microsoft Hyper-V. open-vm-tools and hyperv-* packages must function.
    {
        "name": "Guest Compatibility — VMware / Hyper-V",
        "architecture": "x86_64",
        "test_cases": [
            ("VMware ESXi 8.x: Rocky boots as VM guest", "normal"),
            ("open-vm-tools installs and vmtoolsd service runs in VMware guest", "normal"),
            ("VMware: shared folder (vmhgfs-fuse) mounts correctly", "normal"),
            ("VMware: guest clock syncs to host via VMware Tools", "normal"),
            ("Microsoft Hyper-V: Rocky boots as Generation 2 VM guest", "normal"),
            ("Hyper-V: hyperv-* integration packages install and run", "normal"),
            ("Hyper-V: synthetic NIC gets DHCP address", "normal"),
            ("Hyper-V: Enlightened SCSI disk I/O functional", "normal"),
            ("Xen PV guest: boots and domU tools are functional", "normal"),
        ],
    },
    # ── Upgrade Paths ─────────────────────────────────────────────────────────
    # The release notes specify supported upgrade paths. All minor versions
    # within the 9.x stream should be testable upgrade sources.
    {
        "name": "Upgrade Paths",
        "architecture": "x86_64",
        "test_cases": [
            ("In-place upgrade from Rocky 9.6 → 9.8 via dnf", "blocker"),
            ("In-place upgrade from Rocky 9.7 → 9.8 via dnf", "blocker"),
            ("Upgrade preserves SELinux enforcing mode", "blocker"),
            ("Upgrade preserves custom kernel parameters (grub)", "blocker"),
            ("Upgrade preserves /etc customizations (no .rpmnew collisions)", "normal"),
            ("Upgraded system passes full repoclosure", "blocker"),
            ("Upgraded system: all originally enabled services still start", "normal"),
            ("Leapp pre-upgrade report: no inhibitors for clean RHEL 8.10 system", "normal"),
        ],
    },
    {
        "name": "Upgrade Paths",
        "architecture": "aarch64",
        "test_cases": [
            ("In-place upgrade from Rocky 9.6 → 9.8 via dnf (aarch64)", "blocker"),
            ("In-place upgrade from Rocky 9.7 → 9.8 via dnf (aarch64)", "blocker"),
            ("Upgrade preserves SELinux enforcing mode (aarch64)", "blocker"),
            ("Upgraded system passes full repoclosure (aarch64)", "blocker"),
        ],
    },
    # ── Security & Compliance ─────────────────────────────────────────────────
    # DISA STIG and CIS compliance are key enterprise requirements.
    # OpenSCAP is Rocky's primary tool for compliance scanning.
    {
        "name": "Security & Compliance",
        "architecture": None,
        "test_cases": [
            ("OpenSCAP: scap-security-guide installs from AppStream", "blocker"),
            ("OpenSCAP: DISA STIG profile scan produces report (xccdf)", "normal"),
            ("OpenSCAP: CIS Level 1 profile scan completes without error", "normal"),
            ("FIPS 140-3: fips-mode-setup --enable and reboot succeeds", "normal"),
            ("FIPS: OpenSSL reports FIPS provider active after enable", "normal"),
            ("FIPS: ssh with non-FIPS cipher rejected after enable", "normal"),
            ("crypto-policies: update-crypto-policies --set FUTURE succeeds", "normal"),
            ("GPG: all installed packages pass rpm --verify check", "blocker"),
            ("Audit daemon: auditd starts and logs security events", "normal"),
        ],
    },
]


def main():
    parser = argparse.ArgumentParser(description="Seed Rocky Linux 9.8 Beta test playbook")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--token", required=True, help="Admin token")
    parser.add_argument("--release-name", default="Rocky Linux 9.8")
    parser.add_argument("--milestone", default="beta")
    parser.add_argument("--start-date", default=None, help="ISO date e.g. 2026-04-10")
    parser.add_argument("--end-date", default=None, help="ISO date e.g. 2026-04-24")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    print(f"Connecting to {base}…")

    # Login
    session = login(base, args.token)
    if not session:
        print("Warning: could not extract session cookie — requests may fail", file=sys.stderr)

    def authenticated(path: str, method: str = "GET", body=None) -> dict:
        return api(base, path, method=method, body=body, token_cookie=session)

    # Create release
    print(f"Creating release: {args.release_name}…")
    name_parts = args.release_name.rsplit(" ", 1)
    release_name = name_parts[0] if len(name_parts) > 1 else args.release_name
    version = name_parts[1] if len(name_parts) > 1 else "9.8"

    release = authenticated("/releases", method="POST", body={
        "name": release_name,
        "version": version,
        "notes": f"Community testing run for {args.release_name}",
    })
    release_id = release["id"]
    print(f"  Created release #{release_id}: {release_name} {version}")

    # Create milestone
    print(f"Creating milestone: {args.milestone}…")
    ms_body: dict = {"name": args.milestone, "status": "open"}
    if args.start_date:
        ms_body["start_date"] = args.start_date
    if args.end_date:
        ms_body["end_date"] = args.end_date
    milestone = authenticated(f"/milestones/releases/{release_id}", method="POST", body=ms_body)
    milestone_id = milestone["id"]
    print(f"  Created milestone #{milestone_id}: {args.milestone}")

    # Create sections and test cases
    total_tc = 0
    for i, section_def in enumerate(SECTIONS):
        sec_body: dict = {"name": section_def["name"], "sort_order": i * 10}
        if section_def["architecture"]:
            sec_body["architecture"] = section_def["architecture"]

        arch_label = f" ({section_def['architecture']})" if section_def["architecture"] else ""
        print(f"Creating section: {section_def['name']}{arch_label}…")
        section = authenticated(f"/milestones/{milestone_id}/sections", method="POST", body=sec_body)
        section_id = section["id"]

        for j, (tc_name, blocking) in enumerate(section_def["test_cases"]):
            authenticated(f"/sections/{section_id}/test-cases", method="POST", body={
                "name": tc_name,
                "blocking": blocking,
                "sort_order": j * 10,
            })
            total_tc += 1

        print(f"  → {len(section_def['test_cases'])} test cases added")

    print(f"\nDone! Created:")
    print(f"  Release: {release_name} {version} (id={release_id})")
    print(f"  Milestone: {args.milestone} (id={milestone_id})")
    print(f"  Sections: {len(SECTIONS)}")
    print(f"  Test cases: {total_tc}")
    print(f"\nVisit your R3P instance and navigate to the milestone to see the full playbook.")


if __name__ == "__main__":
    main()
