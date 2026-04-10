# Existing Rocky Linux Testing Playbooks

**Purpose:** Reference material for R3P design. Documents the existing testing tools, workflows, team structure, and canonical playbook format used by the Rocky Linux Testing Team.

**Sources:**
- https://github.com/rocky-linux/testing — testing infrastructure and tooling
- https://github.com/rocky-linux/OpenQA-Fedora-Installation — OpenQA install scripts
- Rocky QA and Testing Team document (team roster, testing methods, hardware validation)
- Rocky Linux 9.6 Beta Testing playbook (canonical real-world example of a complete test run)

---

## 1. Actual Playbook Structure (Rocky 9.6 Example)

The Rocky 9.6 Beta Testing run is the canonical example of a R3P test event. Understanding this structure directly drives the data model.

### Test Run
A test run is scoped to a specific Rocky Linux release candidate. It includes:
- **Version**: e.g., "9.6"
- **Compose location**: e.g., `https://dl.rockylinux.org/stg/rocky/9`
- **About/Notes**: Special instructions, known issues, and operational notes
- **Status**: Open → Concluded (with a written wrap-up)

Example notes from the 9.6 run:
> Do NOT use mirror list with betas and pre-release. Edit used repos in /etc/yum.repos.d — Comment mirrorlist; Uncomment baseurl; Change /etc/dnf/vars/contentdir from pub/rocky to stg/rocky.

### Priority Flags

| Flag | Meaning |
|------|---------|
| `:exclamation:` | High priority |
| `:x:` | Release blocker (automatic fail if unresolved) |
| `:arrow_down:` | Non-blocking issue |

### Sections (within a test run)
Each section has a title, optional architecture scope, and a completion counter (e.g., "17/17 done"). The actual taxonomy from the 9.6 run:

| Section | Arch Scope | Count |
|---------|-----------|-------|
| Community Testable Items | all | 17 |
| Repository checks | x86_64 | 6 |
| Repository checks | aarch64 | 6 |
| Repository checks | s390x (9.x only) | 5 |
| Repository checks | ppc64le (9.x only) | 5 |
| Installer Requirements (OpenQA tests) | x86_64 | 16 |
| Installer Requirements (OpenQA tests) | aarch64 | 15 |
| Post-Installation Requirements | x86_64 | 14 |
| Post-Installation Requirements | aarch64 | 14 |
| Cloud Image Requirements | all | 12 |
| Cloud Image Testing | all | 10 |
| SIG/AltArch — Raspberry Pi 3/3b/4/5 | arm | 10 |
| Final release | all | 4 |
| Operations | all | 9 |

### Test Cases
Each test case has:
- **Name**: Short identifier, e.g., "No Broken Packages - QA:Testcase Media Repoclosure"
- **Description**: Full acceptance criteria and instructions
- **Canonical ID**: QA:Testcase reference (e.g., `QA:Testcase_Media_Repoclosure`)
- **Documentation URL**: `https://testing.rocky.page/documentation/QA/<Testcase_Name>/`
- **Assigned user**: @handle or full name (pre-assigned, not self-selected)
- **Status**: Done / Not done (checkbox)
- **Blocking flag**: Inline emoji

Example test case:
```
No Broken Packages - QA:Testcase Media Repoclosure

Critical errors, such as undeclared conflicts, unresolved dependencies, or modules
relying on packages from another stream will be considered an automatic blocker.
https://testing.rocky.page/documentation/QA/Testcase_Media_Repoclosure/

Trevor Cooper   [done]
```

### Status Updates
Admins post narrative progress updates during the run (not test case results — these are editorial posts about overall run state). Example from Stack's 9.6 wrap-up:

> "9.6 Wrap-up — Testing team has concluded 9.6 and is finishing this run. There are a few notes of things we are going to follow up on for next release: Better cloud image testing options + documentation to do so. boot.iso will be the only optical test; USB disk testing for physical boot to be used going forward with Fedora Media Writer..."

### Assignments
The 9.6 playbook shows clear ownership patterns:
- `@lumarel` — Owns most Post-Installation and Live image tests
- `Trevor Cooper` — Owns most aarch64 Installer and Repo check tests
- `@alangm` (Alan Marshall) — Owns most x86_64 Installer tests
- `@tcooper` / `Trevor Cooper` — Repo checks across all architectures
- `Bryan` — Raspberry Pi tests

This assignment-first model is a key design element: test cases have a designated owner, but any community member can submit additional results.

---

## 2. Community Testing Team Roster

The Rocky Linux QA and Testing Team has 25+ members with diverse hardware capabilities. This is the ground truth for what hardware diversity R3P's gap analysis must cover.

### Leadership
- **Chris Stackpole (@stack)** — Team Co-Lead
- **Trevor Cooper (@tcooper)** — Team Lead, OpenQA expert
- **Jessica Jonutz (@jessjonutz)** — Team Coordinator

### Member Hardware Capabilities

| Member | Handle | Primary Environments |
|--------|--------|---------------------|
| Rich Alloway | @ralloway | x86_64; VirtualBox, VMware Fusion, AWS, GCE, Azure, Hyper-V, Vagrant |
| Jay Rachwal | @jraculla | KVM, physical servers, VirtualBox, AWS |
| Josh Moore | @dreddpenguin | Physical server, manual install |
| Haroon Rafique | — | VMware ESX |
| Leo Song | @casong99 | Naver Cloud; HP/Dell/Lenovo bare metal; XEN/RHV/ESX; aarch64 |
| Alex Haydock | @alexhaydock | x86_64 physical; Kickstart, Terraform, Vagrant; UEFI Secure Boot |
| Ruairidh MacLeod | @rkm | Physical hardware, dual-boot, Kickstart/Packer, Azure, Docker/VirtualBox |
| Trevor Cooper | @tcooper | Intel/AMD/NVIDIA/Mellanox; HPC; Lustre, OFED, NVIDIA kernel modules |
| Dave Thacker | — | Intel/Dell/HPE; ESXi, Proxmox, oVirt; package comparison |
| Ricardo de Guzman Jr | @deguzmanricardo | Physical servers, VMware; web server testing |
| Peter Wirdemo | — | Proxmox/KVM; Intel hardware; ZFS; CentOS migrations |
| James Tervit | @jamest65 | Bare metal; DPDK/VPP; Intel Xeon 2nd/3rd Gen; Tier 4 DC |
| Gerald Shin | @gerald | XenServer/ESXi/KVM; Kickstart; Naver Cloud; DellEMC/Citrix/VMware HCL |
| Kent Brodie | @kcb | VM + bare metal; Katello/Foreman deployment testing |
| Samuel Perticara | @dz00te | Proxmox/KVM, Hyper-V, VMware; HPE bare metal; Kickstart/Packer |
| Gabriel Graves | @NebraskaCoder | VMware Workstation/ESXi; AWS, Azure, Vultr, DigitalOcean; Ansible |
| Tyler Woodall | @tyler | HPE products; VMware; GCP/DigitalOcean |
| Pedro Batista | @pedroalvesbatista | VMware; Vagrant/Terraform; HPE/IBM/Dell servers; Raspberry Pi; AWS/Azure/GCP |
| Lukas Magauer | @lumarel | VMware platform; Ansible; Katello/Uyuni; multi-arch |
| Steve Capper | Steve.Capper@arm.com | ARM hardware (ARM Partner) |
| Alan Marshall | @alangm | x86_64; Vagrant, VirtualBox; Dell workstation + T610; OpenQA |
| Joshua Wilding | @joshwilding2011 | VirtualBox + physical x86_64 |
| Kostiantyn Bank | — | KVM; nginx; migration testing |
| Bryan | — | Raspberry Pi 3/3b/4/5 |

### Hardware Coverage Summary
- **Architectures**: x86_64 (dominant), aarch64, ARM (Raspberry Pi), s390x, ppc64le
- **Clouds**: AWS, GCE/GCP, Azure, Oracle, DigitalOcean, Naver Cloud, Vultr
- **Hypervisors**: KVM, VMware ESXi/Fusion/Workstation, VirtualBox, Hyper-V, Proxmox, XenServer, oVirt, RHV
- **Bare metal vendors**: HP/HPE, Dell (PowerEdge, workstations, laptops), Lenovo (ThinkPad), IBM
- **SIG/AltArch**: Raspberry Pi 3, 3B, 4, 5

---

## 3. rocky-linux/testing Repository Tooling

Source: https://github.com/rocky-linux/testing

### `openqa-docker/` — OpenQA Deployment
Podman/Docker-based OpenQA deployment for local testing infrastructure:
- Web UI on port 80
- VNC access on port 5991
- Worker node architecture (central server + distributed workers)
- Data stored in `data/` folder; PostgreSQL data in `data-postgres/`

**R3P integration:** R3P's OpenQA integration should support both `openqa.rockylinux.org` (primary) and self-hosted instances.

### `rpminspect/` — RPM Inspection Tooling
Five wrapper scripts for automated RPM comparison against upstream:
- `rpminspect_wrapper.sh` — main execution wrapper
- `compare_rpminspect.sh` — compare packages across distributions
- `parse_rpminspect.sh` — parse inspection results
- `repo_sync.sh` — repository synchronization
- `summary_rpminspect.sh` — result summaries
- `rocky.yaml` — Koji server integration config

**40+ inspection categories**: license, metadata, ELF, ABI compatibility, changelogs, patches, upstream sources, etc.

**R3P integration:** rpminspect results can be ingested as automated test results for Package testing test cases via an `rpminspect_mappings` table (parallel to `openqa_mappings`).

### `test-reports/` — Hardware Test Report Hierarchy
Existing structured YAML hierarchy for hardware test reports, collected via `xsos --scrub` (anonymizes PII):

```
Resource Type/
├── cloud/
├── container/
├── physical/
└── hypervisor/
    └── Vendor/             (HP, Dell, AWS, etc.)
        └── Model/          (PowerEdge T330, etc.)
            └── Rocky Version/  (9.5, 9.6, etc.)
                └── UUID.yaml   (individual report)
```

Reports capture: BIOS/firmware details, OS config, CPU specs/flags, memory, storage/filesystem, network interfaces.

**R3P integration:** This hierarchy directly defines the `hardware_profiles` table schema — `resource_type` (cloud/container/physical/hypervisor), `vendor`, `model`, `submodel`. The `raw_metadata JSONB` column accepts xsos output for structured storage and parsing.

### `report_parser/` — Structured Field Extraction
Python parsers extract structured fields from xsos sosreport output:
- `parse_cpu.py` — processor details
- `parse_memory.py` — RAM configuration
- `parse_storage.py` — disk information
- `parse_dmidecode.py` — hardware ID/DMI info
- `parse_dm_multipath.py` — device mapper multipath
- `parse_ethtool.py` — NIC vendor/model/speed
- `parse_lspci.py` — PCIe device info
- `parse_operating_system.py` — OS metadata

**R3P integration:** These parsers define the structured fields available in `hardware_profiles` — NIC, storage, processor, BIOS type, etc.

### `comps/` and `repo_compare/` — Package Group Comparisons
- `comps/`: Package group definitions comparing Rocky vs RHEL (BaseOS, AppStream, PowerTools, Resilient Storage)
- `repo_compare/`: HTML comparison scripts
  - `repo_compare_html.sh` — full repository comparison
  - `module_compare_html.sh` — module version analysis
  - `repo_compare_launcher.sh` — batch comparison across RHEL8/Rocky8

**R3P integration:** Results from repo comparisons can map to Package testing test cases. Not a primary integration target but useful reference.

---

## 4. OpenQA-Fedora-Installation Repository

Source: https://github.com/rocky-linux/OpenQA-Fedora-Installation

Installation automation scripts for setting up OpenQA testing infrastructure (accompanies a YouTube tutorial):

**Single-machine setup:**
- `install-openqa.sh` — base install
- `install-openqa-post.sh` — Fedora post-install
- `install-openqa-post-rocky.sh` — Rocky Linux post-install

**Multi-server setup:**
- `install-openqa-server.sh` — central server component
- `install-openqa-worker.sh` — worker nodes (connect via FQDN + API key)

**Architecture variants:**
- `install-openqa-post-rocky-aarch64.sh` — ARM architecture support

**Context:** These scripts set up the OpenQA infrastructure that R3P integrates with. The primary Rocky Linux instance is at `openqa.rockylinux.org`. Teams can also run self-hosted instances using these scripts.

---

## 5. Testing Method Taxonomy

The QA team's authoritative testing method categories. These map to the `test_method` field in R3P's data model and replace the generic single `test_type` field:

| Method | `test_method` value | Description | Primary Environments |
|--------|--------------------|-----------|--------------------|
| Installer testing | `installer` | Anaconda/kickstart install flows | physical, vm |
| Image testing | `image` | Pre-built image validation | cloud, container, vm |
| Migration testing | `migration` | EL variant to Rocky migration | physical, vm |
| Package testing | `package` | RPM/repo correctness | any |
| Hardware validation | `hardware_validation` | Physical hardware compatibility certification | physical |

**Sub-types for image testing** (tracked via `architecture` + section name):
- Physical DVD/USB boot
- VM (KVM, VMware, VirtualBox, Hyper-V, Proxmox)
- Cloud (EC2, Azure, GCP, Oracle, DigitalOcean)
- ARM (Raspberry Pi, aarch64 cloud)
- Container (Base, Minimal, UBI)

---

## 6. Automated Tool Inventory

All tools mentioned in QA team documentation, with R3P integration status:

| Tool | Purpose | R3P Integration Status |
|------|---------|------------------------|
| OpenQA | Automated installer/UI testing (screenshot-based) | **Planned — Phase 2** — poll `openqa.rockylinux.org` API every 15 min |
| rpminspect | RPM comparison, 40+ inspection categories | **Planned — Phase 2** — `rpminspect_mappings` table, webhook/poll |
| Sparky/Sparrow6 | Documentation-based automation (Raku) | **Planned — Phase 2** — webhook endpoint for result submission |
| Kickstart tests | Podman-based install testing (282 tests) | **Research needed** — result format and integration path TBD |
| t_functional | RPM comparison CI script (sig-core PoC) | **Not planned** — superseded by rpminspect |
| pkgdiff | Package diff tool | **Not planned** — limited automation value vs rpminspect |
| abi-compliance-checker | ABI compatibility | **Not planned** — specialized, rpminspect covers this |
| Packer + Kickstart + Ansible | Image build + QA playbook pipeline | **Research needed** — potential automated result source |
| repo_compare scripts | Rocky vs RHEL HTML package diff | **Not planned** — informational output not machine-parseable |
| xsos | Hardware diagnostics collection | **Planned — Phase 2** — raw_metadata JSONB field accepts xsos output |

---

## 7. Hardware Validation Sheet Template

The QA team's structured hardware validation template, used for certification and historical record-keeping:

| Field | Description | R3P Schema Location |
|-------|-------------|---------------------|
| Make/Vendor | e.g., HP, Dell, Lenovo, AWS | `hardware_profiles.vendor` |
| Model | e.g., "PowerEdge T330" | `hardware_profiles.model` |
| Submodel | e.g., "A1", "H8-1160t" | `hardware_profiles.submodel` |
| Architecture | x86_64, aarch64, ppc64le, s390x | `hardware_profiles.architecture` |
| Processor | CPU make/model | `hardware_profiles.processor` |
| Video/GPU | Display adapter | `hardware_profiles.raw_metadata` (JSONB) |
| NIC | Network interface card | `hardware_profiles.nic` |
| Storage | Drive type and size | `hardware_profiles.storage` |
| BIOS type | UEFI or Legacy | `hardware_profiles.bios_type` |
| Partition scheme | LVM, standard, RAID, GPT | `hardware_profiles.partition_scheme` |
| Encryption | LUKS yes/no | `hardware_profiles.encryption` |
| Package Groups | What groups were tested | result `test_method` + `comment` |
| Additional steps | Extra config required | result `comment` |
| Final Assessment | PASS / FAIL / notes | result `outcome` + `comment` |

### Data Reporting Hierarchy from QA Document

The QA team's hardware reporting hierarchy maps directly to R3P's `hardware_profiles` table:

```
Vendor → Model → Submodel → Tested by [contributor]

Examples:
  HP → Pavilion → H8-1160t → Tested by Stack
  Dell → PowerEdge → T330 → Tested by contributor
  Lenovo → ThinkPad → W530 → Tested by Pedro Alves
```

This is exactly what R3P's hardware gap analysis dashboard should display: which Vendor/Model/Architecture combinations have confirmed PASS results for a given Rocky RC, and which combinations remain untested.
