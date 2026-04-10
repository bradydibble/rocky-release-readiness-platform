# CRAG Artifact Prototype Prompt

**Purpose:** Generate a working interactive prototype for Stack to review and provide feedback
**Platform:** claude.ai (Artifacts feature)
**Estimated time:** 30 seconds to generate

---

## Instructions

1. Go to https://claude.ai
2. Start a new conversation
3. Copy and paste the prompt below
4. Claude will generate an interactive artifact you can immediately click through
5. Share the artifact link with Stack for feedback

---

## Prompt

```
Build a single-file React + Tailwind "CRAG — Rocky Linux Test Coordination" runnable artifact.

Brief:
A release candidate test coordination system for Rocky Linux. Admins create test runs for each RC (e.g., Rocky 9.6 RC); community members submit results with hardware/environment details.

## Data Model

TestRun:
- id: string (uuid)
- name: string (e.g., "Rocky 9.6 Beta Testing")
- description: string
- rockyVersion: string (e.g., "9.6")
- releaseType: "rc" | "major_rc" | "minor_rc"
- composeUrl: string (e.g., "https://dl.rockylinux.org/stg/rocky/9")
- startDate: ISO8601 string
- endDate: ISO8601 string
- status: "open" | "closed"

TestSection:
- id: string
- testRunId: string
- name: string (e.g., "Repository checks - x86_64")
- architecture: "x86_64" | "aarch64" | "ppc64le" | "s390x" | "all"
- sortOrder: number

TestCase:
- id: string
- sectionId: string
- name: string (e.g., "No Broken Packages - QA:Testcase Media Repoclosure")
- description: string
- canonicalId: string (e.g., "QA:Testcase_Media_Repoclosure")
- documentationUrl: string (testing.rocky.page link)
- blocking: "blocker" | "high_priority" | "non_blocking" | "normal"
- assignedTo: string | null

TestResult:
- id: string
- testCaseId: string
- submitterName: string | null (anonymous if null)
- submitterTier: "anonymous" | "community" | "core_team"
- trustWeight: number (0.25, 0.50, 0.75, 1.00)
- architecture: "x86_64" | "aarch64" | "ppc64le" | "s390x"
- deployType: "bare-metal" | "kvm" | "container" | "vm" | "cloud-vm"
- vendor: string (e.g., "HP", "Dell", "AWS")
- model: string (e.g., "PowerEdge T330")
- outcome: "PASS" | "FAIL" | "PARTIAL" | "SKIP"
- comment: string (optional)
- submittedAt: ISO8601 string

## UI Components

1. **Test Run List View** (default)
   - Cards showing open RC test runs with status badge (OPEN in green, CLOSED in gray)
   - Show: name, version, release type, date range, section count, result count
   - Click card to view run detail

2. **Test Run Detail View**
   - Run header: name, version, compose URL, dates, status, wrap-up notes
   - Sections accordion (per category/arch) with completion counters (e.g., "6/6 done")
   - Each section: list of test cases with: name, canonical ID, assigned user, blocking flag, result status
   - "Submit Result" button per test case

3. **Submit Result Form** (modal/panel)
   - Submitter name (optional, placeholder: "Anonymous")
   - Login method selector (Anonymous / Mattermost / Rocky Identity) — cosmetic only
   - Architecture dropdown
   - Deploy Type dropdown
   - Vendor / Model fields
   - Outcome: radio buttons (PASS/FAIL/PARTIAL/SKIP)
   - Comment: textarea (optional)
   - Submit button

4. **Coverage Matrix** (toggle view on test run)
   - Rows: architectures
   - Columns: sections
   - Weighted coverage: show both raw count and trust-weighted count
   - Cell colors: green (≥1 PASS), red (FAIL), yellow (PARTIAL), gray (untested)

5. **Trust Weight Display**
   - Show submitter tier badge on each result (Anonymous/Community/Core Team)
   - Release readiness shows weighted pass rate alongside raw pass rate

## Sample Data

Include 2 test runs:
1. "Rocky 9.6 Beta Testing" (open)
   - Version: 9.6, type: minor_rc
   - 3 sections: Community Testable Items (5 test cases), Repository checks - x86_64 (3 test cases), Cloud Image Testing (3 test cases)
   - 8 sample results across different arch/deploy/tier combinations

2. "Rocky 9.5 GA Validation" (closed)
   - Version: 9.5, type: minor_rc
   - 2 sections with 4 test cases each
   - 10 sample results

## Blocking Flag Display
- Blocker: red border/badge (🚫)
- High priority: orange badge (⚠️)
- Non-blocking: gray badge (↓)
- Normal: no badge

## Styling Requirements
- Modern, clean design (Vercel/Linear aesthetic)
- Status badges: rounded, colored
- Cards with subtle shadows and hover states
- Responsive: mobile-friendly
- Trust weight visible but not overwhelming — small tier badge on results
- Fast visual feedback: optimistic updates on submit

## State Management
- Store test runs, sections, test cases, results in component state
- Form state with validation
- Filter state

Build this as a single-file artifact with inline mock data. Focus on making the section/test-case hierarchy clear and the submit flow delightful. Use Lucide icons. Make the coverage matrix the hero visualization.

The goal: Stack should be able to click through a 9.6 RC test run, see which test cases are assigned to whom, submit a fake result for a specific test case, and immediately understand the coverage gap analysis.
```

---

## What Stack Will See

- **Working prototype** with 2 sample RC test runs
- **Section/test case hierarchy** matching the real playbook structure
- **Interactive result submission** per test case with trust tier selection
- **Coverage matrix** showing weighted vs raw coverage
- **Clean, modern UI** that looks production-ready

## Next Steps After Stack's Feedback

1. Stack reviews artifact and provides feedback
2. Iterate on design based on input
3. Build the real backend with API endpoints
4. Deploy POC to cairn-02 (crag.bradydibble.com)
5. Stack can use it for actual Rocky RC testing events

---

**This artifact approach:**
- Gets immediate feedback (30 seconds vs days)
- Shows real UX Stack can interact with
- Validates the concept before heavy development
- Follows modern product management principles
- Makes iteration fast and cheap
