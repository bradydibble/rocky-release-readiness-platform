# Other Linux Distribution Testing Approaches

**Research Date:** October 4, 2025
**Purpose:** Understand how other major distributions coordinate community testing

## Debian

### Testing Approach

**Distribution Model:**
- Rolling "testing" branch that becomes next stable release
- Current testing: "forky" (will become Debian 14)
- Latest stable: Debian 13 "trixie" (released August 9, 2025)

### Community Testing

**No Formal Test Days:** Debian does not appear to have organized "test day" events similar to Fedora.

**Testing Process:**
- Users run the "testing" distribution continuously
- Bug reports filed via bug tracking system
- Upgrade testing requested before stable releases
- Mailing list coordination (debian-testing@lists.debian.org)

**Release Testing:**
- Before Trixie release, community asked to test upgrades from bookworm
- Issues reported to upgrade-reports pseudo-package
- Focus on real-world upgrade scenarios

### Debian Day

**Annual Event:** August 16th
- General community celebration, not focused on testing
- 2025 events were social gatherings

### Observations

**Strengths:**
- Continuous testing via rolling "testing" branch
- Real-world usage provides valuable feedback
- Low coordination overhead

**Limitations:**
- No centralized test coordination
- Hard to see testing coverage
- No structured test day events
- Relies heavily on individual bug reports

**Applicability to Rocky:**
- Rocky's point-release model differs from Debian's rolling testing
- Rocky would benefit from structured test events that Debian lacks
- Bug tracking integration remains important

## Ubuntu

### Testing Approach

**Release Cycle:** Predictable 6-month releases with LTS every 2 years

### Community Testing Events

**Testing Weeks:**
- Historical example: Ubuntu 20.04 Testing Week
- Focused community testing period before release
- Not as formalized as Fedora Test Days

**SRU (Stable Release Update) Cycles:**
- Regular testing windows for updates
- Example: July 14 - August 10, 2025 (4 weeks)
- Bug verification: July 21 - August 8, 2025
- Regression testing included

### Coordination

**Ubuntu Community Hub:**
- Discourse-based community discussions
- Events calendar
- Governance sync meetings (started 2025)

**Ubuntu Summit:**
- Annual in-person + virtual event
- 2025: New hybrid format with London hub + global watch parties
- Focus on showcasing innovation, less on testing coordination

### Observations

**Strengths:**
- Regular SRU testing cycles provide structure
- Active community hub for coordination
- Clear communication through Discourse

**Limitations:**
- Testing weeks not as prominent as Fedora Test Days
- No dedicated testing coordination tool
- Limited visibility into testing coverage

**Applicability to Rocky:**
- SRU-style testing cycles could work for Rocky Updates
- Community hub approach worth considering
- Still lacks the visibility/coordination CRAG aims to provide

## openSUSE

### Testing Approach

**Testing Core Team:**
- Formal team of global members
- Regular meetings
- Mailing list: testing@lists.opensuse.org
- Open to all contributors

### Tools

**Primary:** openQA
- Heavily invested in openQA development
- 2025: Integrated Model Context Protocol (MCP) into openQA
- Conference workshops on openQA testing (oSC 2025)

**Integration:**
- Results from automated testing well-integrated
- Focus on automation over manual community test days

### Community Events

**openSUSE Conference 2025:**
- June 26-28 in Nuremberg, Germany
- Testing workshops and QA contributions discussed
- Hybrid virtual + in-person format

### Observations

**Strengths:**
- Strong openQA integration and development
- Formal testing team structure
- AI/MCP integration leadership

**Limitations:**
- No Test Days equivalent
- Primarily automation-focused
- Less emphasis on broad community manual testing

**Applicability to Rocky:**
- Rocky already uses openQA
- Testing team structure similar to Rocky's
- CRAG could complement openQA like Fedora does

## Arch Linux

### Testing Approach

**Formal Testing Team:**
- Arch Testing Team is official group
- Responsible for testing packages in testing repositories
- Application process: email arch-testing-accounts@archlinux.org

### Process

**Repository Model:**
- Packages submitted to testing repos first
- Team members test packages for correctness
- "Signoff" system: packages need 2+ signoffs to move to core/extra
- Command-line tool: signoff(1) from arch-signoff package

### Coordination

**Communication:**
- Mailing list: arch-dev-public
- IRC: #archlinux-testing
- Regular status updates on testing packages

### Signoff System

**Requirements:**
- At least two signoffs per package
- Testers vouch for package correctness
- Includes installation testing and dependency checks

### Observations

**Strengths:**
- Clear process with signoff requirements
- Formal team structure
- Command-line integration for signoffs
- Good coordination channels

**Limitations:**
- Focused on package testing, not distribution testing
- Rolling release model differs from Rocky
- Less broad community participation

**Applicability to Rocky:**
- Signoff concept could work for Rocky Updates testing
- Formal team structure aligns with Rocky Testing Team
- Not directly applicable to ISO/installation testing

## Comparative Analysis

| Distribution | Testing Model | Tool/Platform | Community Participation | Coordination |
|--------------|---------------|---------------|------------------------|--------------|
| **Fedora** | Test Days | TestDays-web + ResultsDB | High - open to all | Centralized events |
| **Debian** | Continuous | Bug tracker + mailing lists | Medium - testing branch users | Decentralized |
| **Ubuntu** | Testing weeks | Discourse + bug tracker | Medium - structured cycles | Hub-based |
| **openSUSE** | Automation-first | openQA | Low - primarily team | Team-centric |
| **Arch** | Package signoff | CLI tools + IRC | Medium - formal testers | Process-driven |
| **Rocky (current)** | Multi-layered | openQA + Sparky | Low-Medium - team + volunteers | Weekly meetings |

## Key Takeaways for CRAG

### What's Missing Across Distributions

1. **Visibility:** Most distributions lack clear view of testing coverage
2. **Coordination:** No centralized "what needs testing" dashboard
3. **Recognition:** Minimal acknowledgment of testing contributors
4. **Integration:** Manual and automated testing often siloed
5. **Metrics:** Limited release readiness indicators

### What Fedora Does Right

1. **Structured Events:** Test Days create focused community testing
2. **Low Barrier:** Simple result submission process
3. **Centralized Tool:** Single place to submit and view results
4. **Event-Driven:** Creates momentum and participation

### What Others Do Well

1. **Arch Signoffs:** Clear package approval process
2. **openSUSE openQA:** Deep automation integration
3. **Ubuntu SRU Cycles:** Regular, predictable testing windows
4. **Debian Continuous:** Real-world testing via rolling branch

### CRAG's Opportunity

CRAG can combine the best aspects:
- **Fedora's Test Days** → Event coordination and community engagement
- **openSUSE's openQA focus** → Deep automated testing integration
- **Arch's signoff system** → Clear approval/confidence metrics
- **Ubuntu's SRU cycles** → Regular testing cadence
- **+ Novel features** → Gap visualization, contributor recognition, multi-source aggregation, trust-weighted results

### Unique Value Propositions for CRAG

1. **Unified View:** Show automated (openQA, Sparky, rpminspect) + manual results together
2. **Gap Analysis:** Proactively identify what hardware/arch combinations need testing
3. **Hardware Diversity:** Track testing across physical/VM/container/cloud environments
4. **Trust-Weighted Results:** Team member results carry more weight than drive-bys
5. **Modern UX:** 2025 web standards, mobile-friendly, real-time updates
6. **API-First:** Enable testing at scale (CI, MCP, bulk submission)
7. **Community-Centric:** Recognition, leaderboards, contribution tracking

## Conclusion

While other distributions have testing processes, **none have a comprehensive community testing coordination platform** that combines:
- Event coordination (Test Days)
- Automated result integration
- Coverage visualization
- Contributor recognition
- Modern, accessible UX
- Trust-weighted results

This represents a clear opportunity for CRAG to be best-in-class and potentially influence other distributions' approaches.

## References

- **Debian Testing:** https://wiki.debian.org/DebianTesting
- **Ubuntu Testing:** https://discourse.ubuntu.com/c/testing
- **openSUSE Testing:** https://en.opensuse.org/openSUSE:Testing_Core_team
- **Arch Testing:** https://wiki.archlinux.org/title/Arch_Testing_Team
