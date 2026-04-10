# OnBelay - Rocky Linux Test Coordination Platform
## Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** October 9, 2025  
**Status:** Ready for Development  
**Project Type:** Internal Tool / Community Platform

---

## Executive Summary

OnBelay is a web-based test coordination platform designed for the Rocky Linux community to coordinate, track, and report testing efforts across releases. The platform prioritizes **simplicity and participation** over comprehensive test coverage, recognizing that "it works on my hardware" feedback is 1000x better than silence.

### Key Principles
1. **Simplicity First** - The vast majority of participants won't test a broad range of tests
2. **Lower the Barrier** - Quick reports (thumbs up/down) are the default
3. **Complement, Don't Replace** - This is not bugs.rockylinux.org; it's for coordination and visibility
4. **Community Driven** - Designed for people who previously didn't participate or report

---

## Goals and Objectives

### Primary Goals
1. Increase community participation in Rocky Linux testing from current levels to measurable engagement
2. Provide real-time visibility into test coverage across architectures and deployment types
3. Enable release managers to identify testing gaps and urgent needs
4. Create a lightweight alternative to formal bug reporting for validation and "smoke testing"

### Success Metrics
- Number of unique contributors per testing event
- Test reports submitted per event (target: 50+ for major releases)
- Time to identify coverage gaps (should be real-time)
- Ratio of quick reports to detailed reports (target: 70/30)
- Community satisfaction score (survey after each event)

### Non-Goals
- Replace bugs.rockylinux.org for bug tracking
- Provide detailed diagnostic tools
- Support automated test orchestration (though import is supported)
- Become a CI/CD system

---

## User Personas

### Persona 1: Casual Community Member (Primary)
**Name:** Alex the Hobbyist  
**Background:** Runs Rocky Linux on 2-3 homelab servers, follows community updates  
**Technical Level:** Intermediate (can install OS, configure services)  
**Motivation:** Wants to help but has limited time  
**Pain Points:**
- Formal bug reporting feels too heavy for "it just works" feedback
- Doesn't know what needs testing
- Unclear if their hardware/setup is useful for testing

**Needs:**
- Dead-simple reporting (< 1 minute)
- Clear guidance on what to test
- Visibility that their report matters

### Persona 2: Power User / Detailed Tester (Secondary)
**Name:** Jordan the SysAdmin  
**Background:** Manages 50+ Rocky Linux servers across multiple environments  
**Technical Level:** Advanced  
**Motivation:** Needs Rocky to be stable for production use  
**Pain Points:**
- Has time to do thorough testing
- Wants to link test failures to bug reports
- Needs to track testing across multiple scenarios

**Needs:**
- Detailed per-test reporting
- Ability to add custom test scenarios
- Integration with bug tracker
- Export results for documentation

### Persona 3: Release Manager (Admin)
**Name:** Casey the Coordinator  
**Background:** Rocky Linux Testing Team Lead  
**Technical Level:** Expert  
**Motivation:** Ensure comprehensive test coverage before release  
**Pain Points:**
- No visibility into what's been tested until it's reported elsewhere
- Can't identify gaps in coverage (architecture, test types)
- Difficult to encourage community participation

**Needs:**
- Create and manage test events
- Real-time coverage dashboard
- Identify urgent testing needs
- Export reports for release notes
- Request re-testing after fixes

---

## User Stories

### Epic 1: Quick Test Reporting
**As a** casual community member  
**I want to** quickly report that Rocky Linux works on my hardware  
**So that** I can contribute without spending significant time

**Acceptance Criteria:**
- Can submit a report in under 60 seconds
- Only requires: architecture selection, deployment type, and thumbs up/down/partial
- Optional comment field for hardware details
- Success confirmation visible immediately

### Epic 2: Detailed Test Reporting
**As a** power user  
**I want to** report granular test results across multiple test cases  
**So that** I can provide comprehensive feedback on specific functionality

**Acceptance Criteria:**
- Can select individual tests and mark each as PASS/FAIL/SKIP
- Can add custom test scenarios beyond standard list
- Can link to bug reports (bugs.rockylinux.org)
- Can add detailed comments per test or overall
- All individual test results are preserved and visible

### Epic 3: Event Management
**As a** release manager  
**I want to** create and manage testing events  
**So that** I can coordinate community testing efforts

**Acceptance Criteria:**
- Can create events with: name, description, Rocky version(s), test cases, date range
- Can mark events as open/closed
- Can flag specific tests for re-testing after fixes
- Can edit event details after creation
- Can archive old events

### Epic 4: Coverage Visibility
**As a** release manager  
**I want to** see test coverage across architectures and test cases  
**So that** I can identify gaps and prioritize testing efforts

**Acceptance Criteria:**
- Matrix view showing: tests × architectures with color coding
- Clear indication of untested areas (gray)
- Pass/fail/partial status with result counts
- "Urgent needs" banner highlighting critical gaps
- Filters for architecture, outcome, deployment type

### Epic 5: Test Guidance
**As a** community member  
**I want to** access step-by-step instructions for tests  
**So that** I can perform tests correctly and consistently

**Acceptance Criteria:**
- Test guides available for common tests
- Guides include: prerequisites, steps, expected results, estimated time
- Accessible via icon next to test names
- Modal display with clear formatting
- Works in both light and dark modes

### Epic 6: Results Export
**As a** release manager  
**I want to** export test results in multiple formats  
**So that** I can include them in release documentation and reports

**Acceptance Criteria:**
- JSON export with full event and results data
- Markdown export with formatted tables
- Exports include all metadata: event details, result counts, timestamps
- Download triggers immediately with proper filename

---

## Functional Requirements

### FR-1: Authentication & Authorization
**Priority:** P0 (Required for MVP)  
**Description:** User authentication and role-based access control

**Requirements:**
- FR-1.1: Users can submit reports anonymously (no login required)
- FR-1.2: Users can optionally provide a username (no password/account)
- FR-1.3: Admin role exists with additional permissions
- FR-1.4: Admin toggle in UI switches between user/admin modes
- FR-1.5: Admin functions are hidden from non-admin users

**Technical Notes:**
- For MVP, admin role can be hardcoded/config-based (no full auth system)
- Future: OAuth integration with Rocky Linux accounts

### FR-2: Test Event Management
**Priority:** P0 (Required for MVP)

**Requirements:**
- FR-2.1: Admins can create test events with required fields
- FR-2.2: Events include: name, description, Rocky version(s), test case list, date range
- FR-2.3: Events have status: draft, open, closed, archived
- FR-2.4: Admins can edit events (with change history in future)
- FR-2.5: Event list shows all events with filters (status, date)
- FR-2.6: Events can have "retest request" flags on specific test cases

**Data Validation:**
- Event name: required, 3-100 characters
- Start date must be before end date
- At least one Rocky version required
- At least one test case required

### FR-3: Quick Test Reporting
**Priority:** P0 (Required for MVP)

**Requirements:**
- FR-3.1: Default submission mode for all users
- FR-3.2: Required fields: architecture, deployment type
- FR-3.3: Feedback options: Works (👍), Minor Issues (⚠️), Broken (❌)
- FR-3.4: Optional fields: username, environment, comment
- FR-3.5: Auto-infers test case based on deployment type (VM → install-iso-vm, Physical → install-iso-physical)
- FR-3.6: Submission disabled if event is closed
- FR-3.7: Warning if duplicate submission detected (same user + arch + deploy within 5 minutes)

**UX Requirements:**
- Large, clear buttons for feedback selection
- Visual confirmation on submit
- Form resets after successful submission
- Emphasis that this is the easiest way to contribute

### FR-4: Detailed Test Reporting
**Priority:** P0 (Required for MVP)

**Requirements:**
- FR-4.1: Optional submission mode accessed via toggle
- FR-4.2: Per-test-case outcome selection (PASS/FAIL/SKIP)
- FR-4.3: Each test shows guide icon if guide exists
- FR-4.4: Tests flagged for retest show "Retest Needed" badge
- FR-4.5: Can add custom test scenarios with name and outcome
- FR-4.6: Can link bug reports by ID (format: ROCKY-####)
- FR-4.7: Comment field for overall notes
- FR-4.8: Must select at least one test to submit

**Data Preservation:**
- All individual test outcomes stored separately
- Custom tests preserved with category tag
- Bug links include URL, status, description

### FR-5: Automation Results Upload
**Priority:** P1 (Nice to Have)

**Requirements:**
- FR-5.1: Upload mode accessible via toggle
- FR-5.2: Accepts JUnit XML, TAP, and Sparky JSON formats
- FR-5.3: Parses file and extracts test results
- FR-5.4: Shows preview of parsed data before submission
- FR-5.5: Maps test names to event test cases (with fuzzy matching)
- FR-5.6: Tags submissions as "automated" with tool name

**Error Handling:**
- Clear error messages for unsupported formats
- Validation errors shown before submission
- Partial matches handled gracefully

### FR-6: Coverage Matrix
**Priority:** P0 (Required for MVP)

**Requirements:**
- FR-6.1: Toggle to show/hide matrix
- FR-6.2: Rows = test cases, Columns = architectures (x86_64, aarch64, ppc64le, s390x)
- FR-6.3: Color coding: Green (≥1 PASS), Red (any FAIL), Yellow (PARTIAL), Gray (untested)
- FR-6.4: Shows count of results on hover/click
- FR-6.5: Tests needing retest show indicator dot
- FR-6.6: Responsive design (horizontal scroll on mobile)

**Visual Design:**
- Border-based cells with clear status colors
- Accessible color choices (not relying solely on color)
- Print-friendly styles

### FR-7: Results Table
**Priority:** P0 (Required for MVP)

**Requirements:**
- FR-7.1: Displays all results for selected event
- FR-7.2: Columns: Username, Architecture, Deploy Type, Submission Type, Test Results, Bugs, Comment, Submitted At
- FR-7.3: Test Results column shows:
  - Quick reports: Single badge (Works/Issues/Broken)
  - Detailed reports: List of test badges with outcomes
  - Custom tests: Tagged distinctly with icon
- FR-7.4: Bug column shows linked bugs with status indicator
- FR-7.5: Filters: Architecture, Outcome, Deploy Type
- FR-7.6: Responsive table with horizontal scroll
- FR-7.7: Row hover highlighting

**Sorting:**
- Default: Most recent first
- Future: Sortable columns

### FR-8: Test Guides
**Priority:** P1 (Nice to Have)

**Requirements:**
- FR-8.1: Guides stored per test case per event
- FR-8.2: Guide structure: Title, Prerequisites (list), Steps (numbered), Expected Result, Estimated Time
- FR-8.3: Accessible via book icon next to test names
- FR-8.4: Modal display with clear formatting
- FR-8.5: Guides are optional (not all tests need guides)

**Content Requirements:**
- Guides written in clear, action-oriented language
- Steps are concrete and testable
- Prerequisites list all required resources
- Estimated time helps users plan

### FR-9: Urgent Needs Detection
**Priority:** P1 (Nice to Have)

**Requirements:**
- FR-9.1: Algorithm identifies critical testing gaps
- FR-9.2: Criteria: Zero results for test × architecture combination
- FR-9.3: Secondary criteria: Only FAIL results (needs validation)
- FR-9.4: Banner displays top 2-3 urgent needs
- FR-9.5: Updates in real-time as results submitted
- FR-9.6: Can be dismissed (per session)

**Display Logic:**
- Show on event detail page only
- Hide in present mode
- Friendly, non-alarming tone

### FR-10: Data Export
**Priority:** P0 (Required for MVP)

**Requirements:**
- FR-10.1: JSON export includes: Full event object, All results array
- FR-10.2: Markdown export includes: Event metadata, Summary statistics, Results table
- FR-10.3: Downloads trigger immediately with generated filename
- FR-10.4: Filename format: `{event-name-slug}-results.{json|md}`

**Future Enhancements:**
- CSV export option
- Excel export
- Custom report templates

### FR-11: Present Mode
**Priority:** P2 (Future)

**Requirements:**
- FR-11.1: Toggle button in actions bar
- FR-11.2: Hides: Filters, Form, Action buttons (except exit)
- FR-11.3: Shows: Full-width results table only
- FR-11.4: Floating "Exit Present Mode" button always visible (top-right)
- FR-11.5: Optimized for projection/screen sharing

**Use Case:**
- Demo during community calls
- Display on monitor during events
- Clean view for screenshots

### FR-12: Dark Mode
**Priority:** P1 (Nice to Have)

**Requirements:**
- FR-12.1: Toggle button in header (🌙 Dark / ☀️ Light)
- FR-12.2: Persists preference (localStorage)
- FR-12.3: Applies to all views: Event list, Event detail, Modals, Forms, Tables
- FR-12.4: Color scheme: Dark backgrounds (#1f2937, #111827), Light text (#e5e7eb), Subtle borders
- FR-12.5: Maintains accessibility (WCAG AA contrast)
- FR-12.6: Status badges remain colorful and readable

**Design Requirements:**
- Smooth transitions between modes
- No flash of unstyled content
- All interactive elements visible in both modes

---

## Technical Requirements

### TR-1: Technology Stack
**Frontend:**
- React 18+ (Functional components, Hooks)
- Tailwind CSS 3+ for styling
- Lucide React for icons
- No additional UI frameworks (keep it simple)

**Backend:**
- Node.js 18+ with Express or Fastify
- PostgreSQL 14+ for data persistence
- Optional: Redis for caching (future)

**Deployment:**
- Docker containers for easy deployment
- Nginx for reverse proxy
- SSL/TLS required for production

### TR-2: Data Storage
**Database Schema Required:**

```sql
-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  rocky_versions TEXT[] NOT NULL,
  test_cases TEXT[] NOT NULL,
  test_guides JSONB,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  retest_requests TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Test results table
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  username VARCHAR(255),
  architecture VARCHAR(20) NOT NULL CHECK (architecture IN ('x86_64', 'aarch64', 'ppc64le', 's390x')),
  deploy_type VARCHAR(20) NOT NULL CHECK (deploy_type IN ('bare-metal', 'kvm', 'container', 'vm', 'cloud-vm')),
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('gcp', 'aws', 'azure', 'on-prem', 'homelab', 'other')),
  submission_method VARCHAR(20) NOT NULL CHECK (submission_method IN ('quick', 'detailed', 'automated')),
  quick_feedback VARCHAR(20) CHECK (quick_feedback IN ('works', 'issues', 'broken')),
  automation_tool VARCHAR(50),
  test_results JSONB NOT NULL, -- Array of {testCase, outcome, duration, notes}
  bugs JSONB, -- Array of {id, url, status, description}
  custom_tests JSONB, -- Array of {name, category, outcome, notes}
  comment TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  ip_address INET -- For duplicate detection
);

-- Indexes
CREATE INDEX idx_test_results_event_id ON test_results(event_id);
CREATE INDEX idx_test_results_submitted_at ON test_results(submitted_at DESC);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_end_date ON events(end_date DESC);
```

### TR-3: API Endpoints

**Events:**
```
GET    /api/events                    - List all events (with filters)
GET    /api/events/:id                - Get single event
POST   /api/events                    - Create event (admin only)
PUT    /api/events/:id                - Update event (admin only)
DELETE /api/events/:id                - Delete event (admin only)
PATCH  /api/events/:id/status         - Change event status (admin only)
```

**Test Results:**
```
GET    /api/events/:id/results        - Get results for event (with filters)
POST   /api/events/:id/results        - Submit test result
GET    /api/events/:id/results/:rid   - Get single result
DELETE /api/results/:id               - Delete result (admin only)
```

**Coverage:**
```
GET    /api/events/:id/coverage       - Get coverage matrix data
GET    /api/events/:id/urgent-needs   - Get urgent testing needs
```

**Export:**
```
GET    /api/events/:id/export/json    - Export as JSON
GET    /api/events/:id/export/markdown - Export as Markdown
```

**Validation:**
```
GET    /api/system/health             - System health checks
GET    /api/validation                - Run validation checks
```

### TR-4: API Response Formats

**Event Object:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "rockyVersions": ["string"],
  "testCases": ["string"],
  "testGuides": {
    "test-name": {
      "title": "string",
      "prerequisites": ["string"],
      "steps": ["string"],
      "expectedResult": "string",
      "estimatedTime": "string"
    }
  },
  "startDate": "ISO8601",
  "endDate": "ISO8601",
  "status": "open|closed|draft|archived",
  "retestRequests": ["string"],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "createdBy": "string"
}
```

**Test Result Object:**
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "username": "string|null",
  "architecture": "x86_64|aarch64|ppc64le|s390x",
  "deployType": "bare-metal|kvm|container|vm|cloud-vm",
  "environment": "gcp|aws|azure|on-prem|homelab|other",
  "submissionMethod": "quick|detailed|automated",
  "quickFeedback": "works|issues|broken",
  "automationTool": "string",
  "testResults": [
    {
      "testCase": "string",
      "outcome": "PASS|FAIL|PARTIAL|SKIP",
      "duration": "number",
      "notes": "string"
    }
  ],
  "bugs": [
    {
      "id": "string",
      "url": "string",
      "status": "open|resolved",
      "description": "string"
    }
  ],
  "customTests": [
    {
      "name": "string",
      "category": "string",
      "outcome": "PASS|FAIL|PARTIAL",
      "notes": "string"
    }
  ],
  "comment": "string",
  "submittedAt": "ISO8601"
}
```

### TR-5: Validation Rules

**Server-Side Validation Required:**
1. Event dates: start < end, end must be in future for new events
2. Test results: eventId must exist, event must be open
3. Test results: testsRan must be subset of event.testCases
4. Bug links: validate URL format for bugs.rockylinux.org
5. Rate limiting: Max 10 submissions per IP per hour
6. Duplicate detection: Same username + arch + deploy within 5 minutes

**Client-Side Validation:**
- All server validations plus immediate UX feedback
- Form field validation on blur
- Submit button disabled until valid

### TR-6: Performance Requirements
- Page load time: < 2 seconds
- API response time: < 500ms for reads, < 1s for writes
- Coverage matrix calculation: < 1 second for 1000 results
- Support 100 concurrent users
- Database queries optimized with indexes
- Frontend bundle size: < 500KB gzipped

### TR-7: Security Requirements
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize all user inputs)
- CSRF protection on state-changing operations
- Rate limiting on all endpoints
- HTTPS only in production
- Content Security Policy headers
- Input validation on all fields
- No sensitive data in URLs
- Secure headers (HSTS, X-Frame-Options, etc.)

### TR-8: Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

### TR-9: Accessibility Requirements
- WCAG 2.1 Level AA compliance
- Keyboard navigation for all interactive elements
- Screen reader compatible (semantic HTML, ARIA labels)
- Color contrast ratios meet standards
- Focus indicators visible
- Form labels properly associated
- Error messages accessible

---

## Design Requirements

### DR-1: Visual Design System

**Color Palette:**

*Light Mode:*
- Background: #f9fafb (gray-50)
- Surface: #ffffff
- Border: #e5e7eb (gray-200)
- Text Primary: #111827 (gray-900)
- Text Secondary: #6b7280 (gray-600)
- Accent: #2563eb (blue-600)

*Dark Mode:*
- Background: #111827 (gray-900)
- Surface: #1f2937 (gray-800)
- Border: #374151 (gray-700)
- Text Primary: #f9fafb (gray-50)
- Text Secondary: #9ca3af (gray-400)
- Accent: #3b82f6 (blue-500)

**Status Colors:**
- Success/Pass: #10b981 (green-500)
- Warning/Partial: #f59e0b (amber-500)
- Error/Fail: #ef4444 (red-500)
- Info: #3b82f6 (blue-500)
- Neutral: #6b7280 (gray-500)

**Typography:**
- Font Family: System font stack (sans-serif)
- Headings: Bold, tight line-height
- Body: Regular, comfortable line-height (1.5)
- Code/Monospace: Consolas, Monaco, monospace

**Spacing:**
- Use Tailwind's spacing scale (4px base)
- Consistent padding: 4px, 8px, 12px, 16px, 24px, 32px
- Section spacing: 24px-32px

### DR-2: Component Library

**Buttons:**
- Primary: Blue background, white text, medium padding
- Secondary: Gray background, colored text
- Sizes: Small (px-3 py-1), Medium (px-4 py-2), Large (px-6 py-3)
- States: Default, Hover, Active, Disabled, Focus

**Forms:**
- Input fields: Border, rounded corners, focus ring
- Labels: Above fields, clear association
- Error states: Red border, error message below
- Required indicators: Asterisk or "(required)" text

**Cards:**
- White/dark background, subtle shadow
- Rounded corners (8px)
- Hover effect (shadow increase)
- Clickable cards: cursor pointer

**Tables:**
- Striped or hover rows
- Fixed header on scroll
- Responsive (horizontal scroll on mobile)
- Sort indicators on columns

**Modals:**
- Centered on viewport
- Backdrop overlay (semi-transparent black)
- Close button (X) in top-right
- Keyboard accessible (Escape to close)

**Badges:**
- Small, rounded-full
- Colored background with dark text
- Use semantic colors for status

### DR-3: Layout Requirements

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Navigation:**
- Fixed header with logo and controls
- Breadcrumb navigation on detail pages
- Back button visible on detail views

**Grid System:**
- Event list: 1 column (mobile), 2 columns (desktop)
- Forms: 1-2 column layouts depending on field count
- Tables: Responsive with horizontal scroll

**Mobile Considerations:**
- Touch-friendly tap targets (min 44×44px)
- Simplified navigation
- Bottom sheets for mobile forms (optional)
- Swipe gestures (future)

### DR-4: Animation & Transitions
- Smooth transitions: 150-300ms
- Hover effects on interactive elements
- Loading spinners for async operations
- Toast notifications for success/error
- Modal fade-in/out
- Collapsible sections with smooth expand/collapse

---

## Data Model Details

### Entity Relationships
```
Event (1) ──── (Many) TestResult
Event.id = TestResult.eventId

Event contains:
- Test cases (array)
- Test guides (nested object)
- Retest requests (array)

TestResult contains:
- Individual test outcomes (array)
- Bug references (array)
- Custom tests (array)
```

### Sample Test Cases by Event Type

**Installation Testing:**
- install-iso-vm
- install-iso-physical
- upgrade-point-release
- secure-boot
- live-image-boot

**System Services:**
- ssh-service
- firewalld
- auditd
- chronyd

**Hardware/Peripherals:**
- dual-monitors
- hardware-raid
- media-consistency-check

**Updates/Maintenance:**
- package-updates
- kernel-upgrade
- reboot-test

### Predefined Test Guides

Admins should be able to create guides for common tests. Suggested initial guides:
1. install-iso-vm - VM installation from ISO
2. install-iso-physical - Physical hardware installation
3. upgrade-point-release - Upgrade from previous point release
4. ssh-service - SSH service verification
5. secure-boot - Secure boot testing

---

## Success Criteria & Metrics

### Launch Criteria (MVP)
- [ ] All P0 functional requirements implemented
- [ ] Core user flows tested (quick report, detailed report, view results)
- [ ] Admin can create and manage events
- [ ] Coverage matrix displays correctly
- [ ] Export functions work (JSON, Markdown)
- [ ] Dark mode fully functional
- [ ] Responsive on mobile, tablet, desktop
- [ ] No critical bugs
- [ ] Performance meets requirements
- [ ] Security review passed

### Post-Launch Metrics (First 30 Days)

**Engagement:**
- Unique visitors: Track and report
- Reports submitted: Target 50+ for first major event
- Quick vs Detailed ratio: Monitor for UX insights
- Time to first report: < 2 minutes from landing

**Quality:**
- Error rate: < 1% of submissions fail
- Page load time: < 2 seconds (95th percentile)
- User-reported bugs: Track and fix within 7 days

**Community:**
- Community feedback: Survey after first event
- Feature requests: Collect and prioritize
- Social mentions: Track community discussion

---

## Future Considerations

### Phase 2 Features (Post-MVP)
1. **User Accounts & Authentication**
   - OAuth with Rocky Linux accounts
   - Personal dashboard showing submission history
   - Notification preferences

2. **Enhanced Test Guides**
   - Video walkthrough support
   - Community-contributed guides
   - Translations for internationalization

3. **Advanced Coverage Analytics**
   - Trend charts over time
   - Comparison between releases
   - Hardware compatibility matrix

4. **Integration Enhancements**
   - Webhook support for CI/CD systems
   - API for automated submission
   - Slack/Discord notifications

5. **Gamification (Optional)**
   - Contributor leaderboards
   - Badges for milestones
   - Recognition for top testers

### Phase 3 Features (Future)
1. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Offline support

2. **Advanced Automation**
   - Test orchestration
   - Automated environment provisioning
   - Continuous testing workflows

3. **Community Features**
   - Discussion threads per test
   - Shared test configurations
   - Mentor/mentee pairing

### Technical Debt to Address
- Implement proper auth system (replace hardcoded admin)
- Add comprehensive API rate limiting
- Implement caching layer (Redis)
- Add full-text search
- Database connection pooling
- Horizontal scaling support

### Known Limitations
- No real-time updates (requires page refresh)
- No collaborative editing of events
- Limited to bugs.rockylinux.org for bug tracking
- No mobile app (web-only)
- English-only interface (initially)

---

## Appendix

### A. Glossary
- **Quick Report**: Simple thumbs-up/down feedback submission
- **Detailed Report**: Granular per-test-case result submission
- **Coverage Matrix**: Visual grid showing test×architecture coverage
- **Test Guide**: Step-by-step instructions for performing a test
- **Retest Request**: Flag indicating a test needs re-validation after fix
- **Present Mode**: Clean display mode for demos/projection

### B. Reference Materials
- Rocky Linux Testing Documentation: https://docs.rockylinux.org/
- Bug Tracker: https://bugs.rockylinux.org/
- Community Forums: https://forums.rockylinux.org/
- GitHub: https://github.com/rocky-linux/

### C. Open Questions
1. Should we support multiple simultaneous events? (Decision: Yes, but with clear UI separation)
2. How long should we retain closed event data? (Decision: Indefinitely, but archived after 6 months)
3. Should anonymous submissions be allowed? (Decision: Yes, to lower barrier)
4. What's the process for marking bugs as resolved? (Decision: Manual admin action initially, webhook in future)

### D. Risks & Mitigation

**Risk: Low adoption**  
*Mitigation:* Start with engaged community members, make quick reporting extremely easy, promote heavily

**Risk: Spam submissions**  
*Mitigation:* Rate limiting, IP tracking, admin moderation tools

**Risk: Incomplete test coverage**  
*Mitigation:* Urgent needs detection, direct outreach to community for specific gaps

**Risk: Technical infrastructure costs**  
*Mitigation:* Start with minimal hosting, optimize database, implement caching

---

## Approval & Sign-off

**Product Owner:** Rocky Linux Testing Team Lead  
**Technical Lead:** TBD  
**Design Lead:** TBD  

**Approved:** ☐  
**Date:** __________

---

**Document Version History:**
- v1.0 (2025-10-09): Initial PRD based on prototype development
