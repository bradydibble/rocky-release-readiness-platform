# Rocky Linux Testing Ecosystem Research

**Research Date:** October 4, 2025
**Sources:**
- https://testing.rocky.page/
- https://ciqinc.atlassian.net/wiki/spaces/ENG/pages/1703215114/Rocky+Linux+RESF+Testing+Context
- https://ciqinc.atlassian.net/wiki/spaces/ENG/pages/1734377473/Sparky+Testing+Framework+Complete+Guide
- https://openqa.rockylinux.org/
- https://bugs.rockylinux.org

## Executive Summary

The Rocky Enterprise Software Foundation (RESF) employs a multi-layered testing approach combining automated infrastructure testing with community-driven verification. As of September 2025, the testing infrastructure includes:

- **230 of 282 kickstart tests passing** (81.6% pass rate)
- **~20 documentation tests** via Sparky
- **3 active SIG-specific test suites** (Slurm, ZFS, others)
- **23 failed tests, 22 timeout issues** under investigation

Recent achievements include catching Rocky 9.6 configuration changes before release, identifying ZFS issues across multiple versions, and preventing documentation drift through automated validation.

## Testing Infrastructure Components

### 1. OpenQA Platform

**What it is:** Automated testing infrastructure with the motto "Life is too short for manual testing!"

**Access:** https://openqa.rockylinux.org/

**Current Coverage:**
- Multiple architectures: x86_64, AArch64, PowerPC, s390x
- Continuous integration for Rocky Updates
- Pre-release validation testing
- Installation and GUI testing focus

**Dashboard Organization:**
- Rocky Updates
- Rocky AArch64
- Rocky PowerPC
- Rocky s390x

**Key Features:**
- Automated installation testing via Anaconda
- Visual/screenshot-based validation
- Test schedulers and result forwarders
- Integration with messaging systems
- JSON-based REST-like API for external scripting

**2025 Development:**
- Model Context Protocol (MCP) integration announced (September 2025)
- AI-friendly interface for LLM interaction
- Results forwarded to ResultsDB when available
- Bug status updates via /bugs API route

### 2. Kickstart Testing Framework

**What it is:** Container-based automated installation testing using Podman

**Repository:** https://github.com/grayeul/kickstart-tests (bobtests branch - Bob's fork)

**Technical Specifications:**
- **Resource Requirements:** 2-3GB RAM per core, 8 threads maximum
- **Test Count:** 282 total tests (230 passing as of Sept 2025)
- **Execution Time:** 3-6 hours for full suite
- **Performance Limitation:** Degrades beyond 8 threads even with NVME storage

**Current Status:**
- 23 failures requiring investigation
- 22 timeout issues under investigation
- ~50 Rocky-specific patches need upstreaming

**Known Issues:**
- Performance bottleneck at 8 cores
- Rocky 10 compatibility (CRB repository changes)
- Timing issue: testing happens after package release

### 3. Sparky/Sparrow6 Framework

**What it is:** Raku-based (Perl 6) automation framework designed for community-accessible testing

**Repository:** https://github.com/melezhik/Sparrow6

**Core Philosophy:**
- Documentation-based test creation ("copy-paste from docs")
- Multi-language support (Bash, Python, Ruby, Perl, Raku)
- Simple contribution model for sysadmins
- Focus on real-world use cases

**Technical Details:**
- **Web Interface:** Crow server on port 4000
- **Installation:** Three-stage Zef workaround required
- **Local Development:** file:// URLs for testing without git commits
- **Primary Maintainer:** Mahilzik (European timezone, very responsive)

**Active Test Repositories:**
- `Sparky_Getting_Started` - Onboarding for new contributors
- `Sparky_Unbound` - DNS testing (found 9.5→9.6 upgrade issues)
- `Sparky_WP_LAMP` - WordPress/LAMP stack testing
- `Sparky_ZFS` - ZFS functionality testing (catches issues every release)
- `Sparky_Slurm` - HPC workload manager testing

**Key Insight from Chris Stack Stackpole:**
> "For the most part if everything is set right, we are copy pasting out of documentation to write our shell script."

### 4. Bug Tracking

**Platform:** MantisBT (Mantis Bug Tracker)

**Access:** https://bugs.rockylinux.org

**Structure:**
- Project selection (Rocky-Linux-8, Rocky-Linux-9, Cloud, etc.)
- Issue views: Unassigned, Resolved, Recently Modified
- Current status: 148 unresolved issues, 25 resolved, 8 recently modified
- Tracks bugs across versions and SIGs

## Testing Team Organization

### Leadership
- **Chris Stack Stackpole** - Testing Team Lead (US timezone, travels frequently)
- **Trevor Cooper** - OpenQA Expert, meeting moderator
- **Bob (grayeul)** - Kickstart tests maintainer

### Core Team Members
- Neil Hanlon - Core contributor
- Alan Marshall - OpenQA specialist
- Skip Grube - Core contributor
- Howard Van Der Wal - OpenQA contributor
- Ryan Smith - New member

### External Support
- **Mahilzik (Alexey Melezhik)** - Sparky/Sparrow6 creator (European timezone)

### CIQ Representatives
- **Peter Nelson** - Head of Engineering at CIQ
- **Max Spevack** - CIQ team member
- **Greg** - CIQ liaison coordinating volunteer efforts

### Communication
- **Meeting Schedule:** Weekly Thursdays at 4:00 PM PT (confirmed active)
- **Channel:** Rocky Linux Testing Chat on Mattermost
- **Response Times:** Mahilzik (European hours), Chris Stack (US hours, periodic)

## Current Testing Challenges

### Technical Issues
1. **Performance Bottleneck:** Testing doesn't scale beyond 8 cores effectively
2. **Rocky 10 Compatibility:** CRB repository changes require test updates
3. **Interface Management:** Sparky web UI becomes unwieldy with many tests
4. **Upstream Integration:** ~50 Rocky-specific patches need upstreaming

### Process Challenges
1. **Timing Issue:** Testing happens after package release
2. **Documentation Drift:** Need more automated verification
3. **Upgrade Testing:** Missing flags and configuration changes between versions
4. **Resource Constraints:** Need automation scripts for setup

### Version-Specific Issues
- **Rocky 9.5 → 9.6:** Configuration changes in Unbound DNS requiring documentation updates
- **Rocky 10:** Repository structure changes from CRB
- **ZFS:** Consistent issues in 9.4, 9.5, 9.6 releases

## Active Initiatives (September 2025)

### High Priority
1. **Sparky UI Redesign** - Need frontend developer for test categorization
2. **Rocky 10 Updates** - Adapting tests for new repository structure
3. **Kickstart Debugging** - 23 failures and 22 timeouts need investigation

### Medium Priority
4. **Documentation Coverage** - Convert docs to Sparky tests
5. **SIG Testing** - IPA, Storage, HPC specific tests needed
6. **Automation Scripts** - One-command setup for testing environments

### Long Term
7. **Performance Investigation** - Solve 8-core bottleneck
8. **Upstream Integration** - Reduce Rocky-specific patches
9. **Repository Architecture** - Decide on consolidated vs. distributed tests

## Strategic Direction: Fedora Test Days Model

### What RESF Wants to Implement

**Goal:** Adopt Fedora's community-driven Test Days approach

**Desired Benefits:**
- **Community Engagement:** Open participation for anyone willing to test
- **Developer Support:** Real-time assistance via chat channels
- **Focused Testing:** Specific features/changes per event
- **Pre-Release Timing:** Testing occurs between branch and release dates
- **Quality Assurance:** Community-verified release readiness

## Current Testing Website

**URL:** https://testing.rocky.page/

**Content:** Rocky Linux Testing Team Wiki
- Documentation site using Material for MkDocs
- Sections: Members, Documentation, Guidelines, SOPs
- Release Criteria for Rocky Linux 8, 9, 10
- Links to Mattermost, openQA, weekly meetings
- Contact: info@rockylinux.org
- License: Attribution-Share Alike 4.0 International

**Purpose:** Documentation hub for testing processes and guidelines

## Integration Opportunities for R3P

### Existing Infrastructure to Leverage
1. **OpenQA API** - Pull automated test results
2. **Sparky Webhooks** - Receive test results from Sparky
3. **rpminspect** - `rocky-linux/testing/rpminspect/` contains wrapper scripts and Koji integration config; R3P can consume rpminspect comparison results as automated package test results via an `rpminspect_mappings` table
4. **MantisBT** - Link bug reports from R3P results
5. **Apollo Build System** - Query build status, compose IDs
6. **testing.rocky.page** - Could host R3P or link to it
7. **Mattermost** - Notifications, community engagement, and OAuth login for community members
8. **RESF Identity** - OIDC/OAuth integration for core team members

### Data Points to Track
- Architecture coverage (x86_64, aarch64, ppc64le, s390x)
- Test environment (physical, VM, container, cloud)
- Resource type (physical, hypervisor, container, cloud) — from `test-reports/` hierarchy
- Vendor/Model/Submodel (HP, Dell, Lenovo; specific server/workstation models)
- Rocky version (8.x, 9.x, 10.x) and compose ID
- Hardware details: BIOS type (UEFI/Legacy), partition scheme, encryption, NIC vendor/model, storage type (NVMe/SSD/HDD)
- Test source (manual, OpenQA, Sparky, rpminspect)

### Scope Note
R3P specifically targets **release candidate testing events** — the pre-release community testing cycle for each Rocky Linux minor or major version (e.g., 9.8 RC, 10.2 RC, 11.0). It is not designed for ongoing package update testing during the life of a minor version. Sparky, rpminspect, and other automated tools may contribute results as data sources, but R3P's primary workflow is coordinating community testers for the RC validation playbook.

## Key Insights for R3P

### What Works Well
1. **Multiple Testing Approaches:** Automated (OpenQA, Sparky) + Manual coverage
2. **Documentation-Driven Tests:** Lower barrier to contribution
3. **Active Community:** Weekly meetings, responsive maintainers
4. **Real Issue Discovery:** ZFS problems caught 3 releases in a row
5. **Diverse Architecture Support:** Beyond just x86_64

### What Needs Improvement
1. **Visibility:** Hard to see overall testing coverage and gaps
2. **Coordination:** No central place to see what needs testing
3. **Recognition:** No way to acknowledge community contributors
4. **Accessibility:** Sparky setup is complex for newcomers
5. **Metrics:** Limited release readiness insights

### R3P's Role
R3P can serve as the **coordination layer** that:
- Shows what's been tested (automated + manual)
- Highlights what needs testing (gaps)
- Makes manual testing approachable
- Recognizes contributors
- Provides release confidence metrics (raw + trust-weighted)
- Integrates all testing sources into one view

## Testing Philosophy

From Chris Stack Stackpole:
> "Right now, I just want to make sure we've got good coverage of a lot of different tests... If you're doing something that you're really interested in, chances are somebody else wants that too."

This community-first, coverage-focused philosophy should guide R3P's design.

## References

- **Testing Wiki:** https://testing.rocky.page/
- **OpenQA Platform:** https://openqa.rockylinux.org/
- **Testing Repositories:** https://git.resf.org/testing (17 active repos)
- **Bug Tracker:** https://bugs.rockylinux.org
- **Documentation:** https://docs.rockylinux.org
- **Sparky Framework:** https://github.com/melezhik/Sparrow6
- **Kickstart Tests:** https://github.com/grayeul/kickstart-tests
- **rpminspect Tools:** https://github.com/rocky-linux/testing/tree/main/rpminspect
