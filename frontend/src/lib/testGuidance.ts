/**
 * Static guidance for common test case types.
 * Matched by checking whether the test case name (lowercased) contains a key.
 * Used in TestCaseRow to show inline step-by-step instructions.
 */

export interface Guidance {
  steps: string[]
  expect: string
  timeEstimate?: string
}

const GUIDANCE_MAP: Record<string, Guidance> = {
  'selinux': {
    steps: [
      'Run: getenforce',
      'Run: ausearch -m avc -ts today 2>/dev/null | tail -20',
    ],
    expect: '"Enforcing" with no AVC denial lines in the output',
    timeEstimate: '1 min',
  },
  'firewalld': {
    steps: [
      'Run: systemctl status firewalld',
      'Run: firewall-cmd --get-default-zone',
    ],
    expect: 'Service active, default zone is "public"',
    timeEstimate: '1 min',
  },
  'dnf update': {
    steps: ['Run: sudo dnf update -y'],
    expect: 'Completes without errors (exit 0)',
    timeEstimate: '5–15 min',
  },
  'ssh': {
    steps: [
      'Run: systemctl status sshd',
      'From another machine: ssh user@hostname',
    ],
    expect: 'sshd active and SSH login succeeds',
    timeEstimate: '2 min',
  },
  'ntp': {
    steps: [
      'Run: chronyc tracking',
      'Check the "Reference ID" line is not 0.0.0.0',
    ],
    expect: 'System clock synchronized (Reference ID populated)',
    timeEstimate: '1 min',
  },
  'chrony': {
    steps: [
      'Run: systemctl status chronyd',
      'Run: chronyc tracking',
    ],
    expect: 'chronyd active, reference clock shown',
    timeEstimate: '1 min',
  },
  'boot target': {
    steps: ['Run: systemctl get-default'],
    expect: '"multi-user.target" or "graphical.target"',
    timeEstimate: '30 sec',
  },
  'kernel panic': {
    steps: [
      'Boot the system normally',
      'Run: journalctl -b -p err --no-pager | head -30',
    ],
    expect: 'No kernel panics in boot journal',
    timeEstimate: '5 min',
  },
  'repoclosure': {
    steps: [
      'Run: dnf repoquery --unresolved 2>&1 | head -20',
      'Or: dnf check 2>&1',
    ],
    expect: 'No unresolved dependencies',
    timeEstimate: '5 min',
  },
  'gpg': {
    steps: ['Run: rpm -Va --nofiles --nomd5 2>&1 | grep -v "^.$" | head -20'],
    expect: 'No GPG signature failures (lines starting with "..5......")',
    timeEstimate: '3 min',
  },
  'checksum': {
    steps: [
      'Download the CHECKSUM file from the Rocky mirror',
      'Run: sha256sum -c CHECKSUM 2>&1 | grep -v OK',
    ],
    expect: 'All checksums match (no failures)',
    timeEstimate: '10 min',
  },
  'podman': {
    steps: [
      'Run: sudo dnf install -y podman',
      'Run: podman run --rm docker.io/library/hello-world',
    ],
    expect: '"Hello from Docker!" message printed',
    timeEstimate: '3 min',
  },
  'container': {
    steps: [
      'Run: podman pull rockylinux:9',
      'Run: podman run --rm rockylinux:9 cat /etc/rocky-release',
    ],
    expect: 'Rocky Linux release line printed',
    timeEstimate: '3 min',
  },
  'graphical install': {
    steps: [
      'Boot from Rocky Linux ISO',
      'Select "Install Rocky Linux" from the boot menu',
      'Follow the graphical Anaconda installer',
      'Complete installation and reboot',
    ],
    expect: 'System boots to login screen without errors',
    timeEstimate: '30–60 min',
  },
  'kickstart': {
    steps: [
      'Prepare a kickstart file (ks.cfg)',
      'Boot the ISO with inst.ks=http://... or inst.ks=hd:... on the kernel cmdline',
      'Installation completes unattended',
    ],
    expect: 'System installs and reboots without human intervention',
    timeEstimate: '20–45 min',
  },
  'upgrade': {
    steps: [
      'On a running Rocky 9.x system: sudo dnf update -y',
      'Reboot: sudo reboot',
      'After reboot: cat /etc/rocky-release',
    ],
    expect: 'Release file shows new version, system functional',
    timeEstimate: '15–30 min',
  },
  'cloud-init': {
    steps: [
      'Launch the cloud image instance',
      'SSH in using the injected key',
      'Run: cloud-init status',
    ],
    expect: '"status: done" with no errors',
    timeEstimate: '10 min',
  },
  'aws': {
    steps: [
      'Launch the Rocky AMI in EC2',
      'Wait for instance to reach "running" state',
      'SSH in: ssh rocky@<public-ip>',
      'Run: curl -s http://169.254.169.254/latest/meta-data/instance-id',
    ],
    expect: 'Instance ID returned from IMDS',
    timeEstimate: '10 min',
  },
  'sudo': {
    steps: [
      'Log in as a non-root user in the wheel group',
      'Run: sudo whoami',
    ],
    expect: '"root" printed without errors',
    timeEstimate: '1 min',
  },
  'fips': {
    steps: [
      'Run: sudo fips-mode-setup --enable',
      'Reboot: sudo reboot',
      'After reboot: fips-mode-setup --check',
    ],
    expect: '"FIPS mode is enabled" after reboot',
    timeEstimate: '10 min',
  },
  'reboot': {
    steps: [
      'Run: sudo reboot',
      'After system comes back up, log in and check: journalctl -b -p err --no-pager | wc -l',
    ],
    expect: 'System reboots cleanly, no new critical errors',
    timeEstimate: '5 min',
  },
  'networkmanager': {
    steps: [
      'Run: nmcli general status',
      'Run: nmcli device status',
    ],
    expect: 'NetworkManager running, primary interface connected',
    timeEstimate: '1 min',
  },
  'web server': {
    steps: [
      'Run: sudo dnf install -y httpd',
      'Run: sudo systemctl start httpd',
      'Run: curl -s http://localhost/ | head -5',
    ],
    expect: 'httpd starts, test page served on localhost',
    timeEstimate: '3 min',
  },
  'httpd': {
    steps: [
      'Run: sudo dnf install -y httpd',
      'Run: sudo systemctl start httpd',
      'Run: curl -s http://localhost/ | head -5',
    ],
    expect: 'httpd starts, test page served on localhost',
    timeEstimate: '3 min',
  },
  'epel': {
    steps: [
      'Run: sudo dnf install -y epel-release',
      'Run: dnf repolist | grep epel',
    ],
    expect: 'EPEL repo appears in repo list',
    timeEstimate: '2 min',
  },
  'branding': {
    steps: [
      'Run: cat /etc/rocky-release',
      'Run: cat /etc/os-release | head -5',
    ],
    expect: 'Rocky Linux branding with correct version number',
    timeEstimate: '30 sec',
  },
  'release file': {
    steps: [
      'Run: cat /etc/rocky-release',
      'Run: rpm -q rocky-release',
    ],
    expect: 'Correct release version string',
    timeEstimate: '30 sec',
  },
  'python': {
    steps: [
      'Run: python3 --version',
      'Run: python3 -c "import ssl; print(ssl.OPENSSL_VERSION)"',
    ],
    expect: 'Python version matches expected, SSL module loads',
    timeEstimate: '1 min',
  },
  'cockpit': {
    steps: [
      'Run: sudo systemctl start cockpit',
      'Open a browser to https://<host>:9090',
      'Log in with system credentials',
    ],
    expect: 'Cockpit dashboard loads with system overview',
    timeEstimate: '3 min',
  },
  'journal': {
    steps: [
      'Run: journalctl -b -p err --no-pager | head -20',
      'Run: journalctl -b -p warning --no-pager | wc -l',
    ],
    expect: 'No unexpected error-level entries in system journal',
    timeEstimate: '2 min',
  },
  'ping': {
    steps: [
      'Run: ping -c 3 8.8.8.8',
      'Run: ping -c 3 google.com',
    ],
    expect: 'Both IPv4 and DNS-resolved pings succeed',
    timeEstimate: '1 min',
  },
  'ipv4': {
    steps: [
      'Run: ip addr show',
      'Run: ping -c 3 8.8.8.8',
    ],
    expect: 'IPv4 address assigned, external connectivity works',
    timeEstimate: '1 min',
  },
  'ipv6': {
    steps: [
      'Run: ip -6 addr show',
      'Run: ping -6 -c 3 ::1',
    ],
    expect: 'IPv6 address present, loopback ping succeeds',
    timeEstimate: '1 min',
  },
  'locale': {
    steps: [
      'Run: localectl status',
      'Run: locale',
    ],
    expect: 'System locale and keyboard layout set correctly',
    timeEstimate: '30 sec',
  },
  'timezone': {
    steps: [
      'Run: timedatectl status',
    ],
    expect: 'Timezone and NTP sync status correct',
    timeEstimate: '30 sec',
  },
  'migrate2rocky': {
    steps: [
      'Download migrate2rocky.sh from the Rocky wiki',
      'Run: sudo bash migrate2rocky.sh -r',
      'Reboot and verify: cat /etc/rocky-release',
    ],
    expect: 'System migrated to Rocky Linux, all packages re-signed',
    timeEstimate: '30–60 min',
  },
  'libvirt': {
    steps: [
      'Run: sudo dnf install -y libvirt virt-install',
      'Run: sudo systemctl start libvirtd',
      'Run: virsh list --all',
    ],
    expect: 'libvirtd running, virsh connects successfully',
    timeEstimate: '5 min',
  },
  'virsh': {
    steps: [
      'Run: virsh list --all',
      'Run: virsh capabilities | head -20',
    ],
    expect: 'virsh connects to hypervisor, capabilities listed',
    timeEstimate: '2 min',
  },
  'open-vm-tools': {
    steps: [
      'Run: sudo dnf install -y open-vm-tools',
      'Run: systemctl status vmtoolsd',
      'Run: vmware-toolbox-cmd stat speed',
    ],
    expect: 'VMware tools daemon running, guest info available',
    timeEstimate: '3 min',
  },
  'vmware': {
    steps: [
      'Create a new VM in VMware with Rocky ISO',
      'Install Rocky as a guest OS',
      'Install open-vm-tools and verify integration services',
    ],
    expect: 'Rocky boots as VMware guest, tools functional',
    timeEstimate: '30 min',
  },
  'hyper-v': {
    steps: [
      'Create a Gen 2 VM in Hyper-V with Rocky ISO',
      'Install Rocky as a guest OS',
      'Run: lsmod | grep hv_',
    ],
    expect: 'Rocky boots as Hyper-V guest, hv_* modules loaded',
    timeEstimate: '30 min',
  },
  'openscap': {
    steps: [
      'Run: sudo dnf install -y openscap-scanner scap-security-guide',
      'Run: oscap --version',
      'Run: sudo oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_cis /usr/share/xml/scap/ssg/content/ssg-rl9-ds.xml 2>&1 | tail -5',
    ],
    expect: 'OpenSCAP runs and produces compliance results',
    timeEstimate: '10 min',
  },
  'crypto-policies': {
    steps: [
      'Run: update-crypto-policies --show',
      'Run: update-crypto-policies --set FUTURE',
      'Run: update-crypto-policies --show',
    ],
    expect: 'Policy changes applied correctly',
    timeEstimate: '2 min',
  },
  'audit': {
    steps: [
      'Run: systemctl status auditd',
      'Run: sudo ausearch -m login --start today | tail -10',
    ],
    expect: 'auditd running, audit events being recorded',
    timeEstimate: '2 min',
  },
  'raspberry': {
    steps: [
      'Write Rocky image to SD card: sudo dd if=Rocky-*.img of=/dev/sdX bs=4M status=progress',
      'Insert SD card and power on Raspberry Pi',
      'SSH in or connect monitor; verify: cat /etc/rocky-release',
    ],
    expect: 'Raspberry Pi boots Rocky Linux, login works',
    timeEstimate: '15 min',
  },
  'secure boot': {
    steps: [
      'Enable Secure Boot in UEFI/BIOS settings',
      'Boot from Rocky ISO or installed system',
      'Run: mokutil --sb-state',
    ],
    expect: '"SecureBoot enabled" reported, system boots normally',
    timeEstimate: '10 min',
  },
  'raid': {
    steps: [
      'During install, select custom partitioning',
      'Create a RAID device from two disks',
      'Complete installation on RAID volume',
      'After boot: cat /proc/mdstat',
    ],
    expect: 'RAID array healthy, system boots from RAID',
    timeEstimate: '45 min',
  },
  'luks': {
    steps: [
      'During install, enable disk encryption',
      'Complete installation, reboot',
      'Enter passphrase at boot prompt',
      'Run: lsblk | grep crypt',
    ],
    expect: 'LUKS volume unlocked, system boots after passphrase',
    timeEstimate: '30 min',
  },
  'lvm': {
    steps: [
      'During install, use automatic LVM partitioning',
      'After boot: lvs',
      'Run: pvs && vgdisplay',
    ],
    expect: 'LVM volumes created and mounted correctly',
    timeEstimate: '5 min',
  },
  'vagrant': {
    steps: [
      'Run: vagrant init rockylinux/9',
      'Run: vagrant up',
      'Run: vagrant ssh -c "cat /etc/rocky-release"',
    ],
    expect: 'Vagrant box boots, SSH access works, Rocky version correct',
    timeEstimate: '10 min',
  },
}

/**
 * Category-level fallback guidance keyed by section name substring.
 * If no test-specific match is found, we try matching section name.
 */
const CATEGORY_GUIDANCE: Record<string, { overview: string; generalSteps: string[] }> = {
  'Repository': {
    overview: 'Verify DNF repos are complete and consistent.',
    generalSteps: ['dnf repolist --all', 'dnf repoquery --unresolved', 'dnf check'],
  },
  'Cloud Image': {
    overview: 'Verify cloud images boot and cloud-init completes.',
    generalSteps: ['Launch image in cloud or with virt-install', 'SSH in', 'cloud-init status', 'cat /etc/rocky-release'],
  },
  'Virtualization': {
    overview: 'Verify KVM/QEMU host functionality.',
    generalSteps: ['lsmod | grep kvm', 'virsh list --all', 'virt-install a test VM'],
  },
  'Guest Compatibility': {
    overview: 'Verify Rocky works as a VM guest on VMware/Hyper-V.',
    generalSteps: ['Boot Rocky as guest', 'Install guest tools', 'Check integration services'],
  },
  'Upgrade': {
    overview: 'Verify in-place upgrades preserve system state.',
    generalSteps: ['sudo dnf update -y', 'sudo reboot', 'cat /etc/rocky-release', 'systemctl --failed'],
  },
  'Security': {
    overview: 'Verify security and compliance tools function.',
    generalSteps: ['oscap --version', 'fips-mode-setup --check', 'update-crypto-policies --show'],
  },
  'Installer': {
    overview: 'Install Rocky via the Anaconda graphical/text installer.',
    generalSteps: ['Boot from ISO', 'Complete installer', 'Reboot', 'Verify login'],
  },
  'Operations': {
    overview: 'Verify integration with management and migration tools.',
    generalSteps: ['Follow tool-specific docs', 'Verify Rocky functions as target'],
  },
  'SIG': {
    overview: 'Verify SIG/AltArch hardware support.',
    generalSteps: ['Flash image to media', 'Boot device', 'Verify peripherals'],
  },
  'Final Release': {
    overview: 'Final verification before release.',
    generalSteps: ['Verify checksums', 'Verify GPG signatures', 'Check release notes'],
  },
  'Post-Installation': {
    overview: 'Verify core system services after fresh install.',
    generalSteps: ['systemctl --failed', 'journalctl -b -p err', 'getenforce'],
  },
  'Community Testable': {
    overview: 'Community-accessible checks that verify basic system health.',
    generalSteps: ['Check system services', 'Verify package manager', 'Test basic networking'],
  },
}

/**
 * Look up guidance for a test case by name.
 * Falls back to category-level guidance based on section name if no specific match.
 * Returns null if neither matches.
 */
export function getGuidance(testCaseName: string, sectionName?: string): Guidance | null {
  const lower = testCaseName.toLowerCase()
  for (const [key, guidance] of Object.entries(GUIDANCE_MAP)) {
    if (lower.includes(key)) return guidance
  }

  // Fallback: category-level guidance from section name
  if (sectionName) {
    const secLower = sectionName.toLowerCase()
    for (const [key, cat] of Object.entries(CATEGORY_GUIDANCE)) {
      if (secLower.includes(key.toLowerCase())) {
        return {
          steps: cat.generalSteps.map((s) => `Run: ${s}`),
          expect: cat.overview,
        }
      }
    }
  }

  return null
}

/**
 * Keyword priority order for the Guided Journey.
 * Tests whose names contain an earlier keyword are shown first.
 * "install / installation" tests are intentionally omitted — if the user
 * reached the journey, the install already worked.
 */
export const journeyOrder: string[] = [
  'boot',
  'first boot',
  'reboot',
  'journal',
  'selinux',
  'network',
  'networkmanager',
  'hostname',
  'firewall',
  'firewalld',
  'dnf',
  'package',
  'repo',
  'repository',
  'service',
  'systemd',
  'failed service',
  'ntp',
  'chrony',
  'time',
  'ssh',
  'sshd',
]

/**
 * Mapping from r3p-helper.sh check keys → test case info for bulk upload preview.
 */
export interface CheckMapping {
  sectionName: string
  testCasePattern: string
  outcomeIfTrue: 'PASS' | 'FAIL'
  outcomeIfFalse: 'FAIL' | 'PASS'
}

export const HELPER_CHECK_MAP: Record<string, CheckMapping> = {
  selinux_enforcing: {
    sectionName: 'Post-Installation Requirements',
    testCasePattern: 'selinux in enforcing mode',
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
  firewalld_active: {
    sectionName: 'Post-Installation Requirements',
    testCasePattern: "firewalld active and default zone",
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
  dnf_update_clean: {
    sectionName: 'Post-Installation Requirements',
    testCasePattern: 'dnf update produces no errors',
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
  boot_target_ok: {
    sectionName: 'Community Testable Items',
    testCasePattern: 'default boot target is graphical or multi-user',
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
  ntp_synced: {
    sectionName: 'Post-Installation Requirements',
    testCasePattern: 'ntp/chrony synchronized',
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
  ssh_active: {
    sectionName: 'Community Testable Items',
    testCasePattern: 'basic ssh daemon installs and starts',
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
  failed_services: {
    sectionName: 'Post-Installation Requirements',
    testCasePattern: 'all default enabled services start without errors',
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
  boot_errors: {
    sectionName: 'Post-Installation Requirements',
    testCasePattern: 'system journal: no critical',
    outcomeIfTrue: 'PASS',
    outcomeIfFalse: 'FAIL',
  },
}
