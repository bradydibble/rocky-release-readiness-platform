# Fedora Test Days Research

**Research Date:** October 4, 2025
**Sources:**
- https://fedoraproject.org/wiki/QA/Test_Days
- https://testdays.fedoraproject.org/archive/211.html
- https://fedoraproject.org/wiki/QA:Tools
- Cloned repositories: testdays-web, resultsdb, resultsdb_frontend, resultsdb_api

## Overview

Fedora Test Days are community-driven quality assurance events focused on testing specific software changes, features, or critical areas of the Fedora distribution before a release.

## Key Characteristics

### Purpose
- Verify the quality of upcoming Fedora releases
- Test specific changes, upgrades, and system components
- Identify and resolve potential issues before full release

### Timing
- Occur between the branch date and full release of a Fedora version
- Open to anyone willing to participate
- Typically centered on testing specific "Changes" or important distribution areas

### Process
- Participants follow specific instructions on the Test Day page
- Testing can be done on real hardware or virtual machines
- Recommended to have backups due to potential instability of development releases
- Developers are available during tests to provide support
- Discussion happens in dedicated Matrix chat channels
- Participants can report test successes or issues

## Technical Architecture

### TestDays-Web Application

**Tech Stack:**
- **Backend:** Flask (Python)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Authentication:** Flask-OIDC (OpenID Connect)
- **Frontend:** Jinja2 templates with Jinjax components
- **Features:** Flask-Login, Flask-WTF, Flask-Caching, CAPTCHA support

**Repository:** https://pagure.io/fedora-qa/testdays-web

**Key Models:**

1. **Testday Model:**
   - id, name, testday_url, start/end dates
   - is_draft flag
   - Structure stored as JSON history (versioned)
   - Tracks author and timestamp for each structure change

2. **Testcase Model:**
   - ULID (26-character unique identifier) as primary key
   - URL to test instructions
   - Belongs to a testday
   - Preserves identity across name/URL changes

3. **Result Model:**
   - Links testday, testcase, and user
   - Profile field (hardware/environment description)
   - Result field (PASS/FAIL/INFO)
   - Optional bugs field (validated URLs only)
   - Optional comment field
   - Soft deletion with 'removed' flag

**Metadata Format:**
Test day structure is defined in a simple text format:
```
= Section Name
* Test case name; https://link-to-testcase; ULID
! ProfileText: Custom column name
```

**Result Submission:**
- Logged-in users can submit results
- Form includes: profile, result dropdown, bugs (validated), comment
- Profile is saved in cookie for convenience
- Users can edit/delete their own results
- Bug URLs are validated against allowed TLDs

**Display Features:**
- Grid view with test cases as columns, user/profile as rows
- Results grouped by sections
- Separate display for current user vs others
- Wiki export format (`.wiki` endpoint)
- Color-coded results for visual scanning

### ResultsDB

**Tech Stack:**
- **Backend:** Flask (Python) with SQLAlchemy
- **Database:** PostgreSQL with text pattern indexing
- **API:** RESTful JSON API v2.0
- **Message Bus:** Integration with messaging systems

**Repository:** https://github.com/release-engineering/resultsdb

**Key Models:**

1. **Testcase:**
   - name (unique), ref_url
   - Text pattern ops index on name

2. **Result:**
   - testcase_name (foreign key)
   - outcome (PASSED/INFO/FAILED/NEEDS_INSPECTION + custom)
   - submit_time, note, ref_url
   - Indexed on testcase_name, submit_time, outcome

3. **ResultData:**
   - Key-value pairs attached to results
   - Allows arbitrary metadata (architecture, version, hardware, etc.)
   - Indexed on key+value for fast filtering

4. **Group:**
   - UUID-based grouping of related results
   - description, ref_url
   - Many-to-many relationship with results

**API Design:**
- Pagination support with prev/next links
- Query filtering by testcase, outcome, time range
- Bulk result submission
- Group creation and management
- Configurable query limits

**Integration:**
- Can be used standalone or with libtaskotron
- Supports daily database dumps for testing/analysis
- Message bus integration for result notifications
- Can use real-life Fedora data dumps

### ResultsDB Frontend

**Purpose:** Simple browsing interface for ResultsDB data

**Tech Stack:**
- Flask (Python)
- Connects to ResultsDB API endpoint
- Runs on separate port (5002) from ResultsDB (5001)

**Repository:** https://pagure.io/taskotron/resultsdb_frontend

### ResultsDB API Client

**Purpose:** Python library for programmatic access to ResultsDB

**Features:**
- Pythonic wrapper around JSON/REST interface
- Named parameters, parameter skipping
- Functions matching JSON/REST methods

**Repository:** https://pagure.io/taskotron/resultsdb_api

## Architecture Insights

### Separation of Concerns
- **TestDays-Web:** Event coordination, community interaction, simplified UX
- **ResultsDB:** Generic results storage engine, API-first design
- **ResultsDB Frontend:** Results browsing and exploration
- **ResultsDB API:** Programmatic access for automation

### Integration Pattern
TestDays-Web can use ResultsDB as backend via the resultsdb-api Python library, or operate independently with its own database.

### Data Model Philosophy
- **ULID for testcases:** Allows test case metadata to change while preserving result linkage
- **Profile field:** Flexible text field for environment description (not enforced schema)
- **JSON structure history:** Version control for test day structure changes
- **Soft deletion:** Results marked as removed rather than deleted

## User Experience Patterns

### For Testers
1. Browse upcoming test days
2. Select a test day to participate in
3. Follow test case instructions (external wiki links)
4. Submit results via simple form
5. See their results alongside others in grid view
6. Edit results if needed

### For Test Day Creators (Admins)
1. Create new test day with name, dates, URL
2. Define structure using text metadata format
3. Add test cases with links to instructions
4. Publish (remove draft status)
5. Monitor results during event
6. Export results to wiki format

### For Automation
1. Query ResultsDB API for testcases
2. Submit results programmatically with metadata
3. Group related results (e.g., CI pipeline runs)
4. Query results by various filters

## Strengths

1. **Proven at Scale:** Used by Fedora QA for years
2. **Simple Metadata Format:** Easy to edit test day structure
3. **ULID Tracking:** Robust handling of test case changes
4. **Flexible Profile Field:** Accommodates various hardware/environment descriptions
5. **API-First ResultsDB:** Enables automation and integration
6. **Community Friendly:** Low barrier to participation
7. **OIDC Authentication:** Secure, federated identity

## Limitations

1. **Fedora-Specific Design:** Many assumptions baked into UI/UX
2. **Limited Analytics:** No built-in coverage metrics, gap analysis
3. **No Automated Result Integration:** Requires manual correlation with OpenQA/CI
4. **Basic Visualization:** Grid view is functional but not insightful
5. **No Gamification:** No contributor recognition, leaderboards, badges
6. **Limited Mobile Experience:** Not optimized for testing on physical devices
7. **Manual Test Day Setup:** No templating or cloning of previous events
8. **No Hardware Diversity Tracking:** Profile field is free text

## Example Test Day Structure

From Fedora CoreOS Test Day (211):

**Sections:**
- Architecture-specific tests (aarch64, ppc64le, s390x, x86_64)
- Platform launch tests (AWS, Azure, GCP, etc.)
- Advanced configuration tests (networking, partitioning, containers)
- Really advanced config (SwapOnZRAM, timezones, toolbox)

**Test Cases:**
- Each has name, link to wiki instructions
- Users enter hardware/environment in profile field
- Results shown as PASS/FAIL with optional comments

**Results Display:**
- Tabular grid with test cases as columns
- User+Profile as rows
- Color coding for pass/fail
- Links to bug reports

## Applicability to R3P

### What to Adopt
- ULID tracking for test cases
- Simple text-based metadata format for test day structure
- Profile field concept for hardware/environment (plus structured `hardware_profiles` table)
- Result validation (especially bug URL whitelisting)
- OIDC authentication pattern
- Soft deletion of results

### What to Improve
- Add automated result integration (OpenQA, Sparky, rpminspect)
- Build analytics dashboard for coverage gaps
- Add hardware diversity tracking with structured data
- Modernize UI/UX with component framework
- Add mobile-first responsive design
- Implement contributor recognition features
- Add templating/cloning for test runs
- Add trust-weighted results (team vs community vs anonymous)
- Support pre-assigned test case ownership

### What to Avoid
- Fedora-specific branding and assumptions
- Over-reliance on external wiki for test instructions
- Limited result metadata (extend beyond simple profile field)
- Separate ResultsDB deployment complexity (integrate cleanly)

## References

- **Fedora Test Days:** https://fedoraproject.org/wiki/QA/Test_Days
- **TestDays-Web Repo:** https://pagure.io/fedora-qa/testdays-web
- **ResultsDB Repo:** https://github.com/release-engineering/resultsdb
- **ResultsDB Frontend:** https://pagure.io/taskotron/resultsdb_frontend
- **ResultsDB API:** https://pagure.io/taskotron/resultsdb_api
- **Example Test Day:** https://testdays.fedoraproject.org/archive/211.html
