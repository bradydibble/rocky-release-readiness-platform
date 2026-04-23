const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const username = localStorage.getItem('r3p_username')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(username ? { 'X-Username': username } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── types ────────────────────────────────────────────────────────────────────

export type MilestoneStub = {
  id: number
  name: string
  status: 'open' | 'closed'
  start_date: string | null
  end_date: string | null
  download_url: string | null
  created_at: string
  test_case_count: number
  result_count: number
}

export type Release = {
  id: number
  name: string
  version: string
  notes: string | null
  created_at: string
  milestones: MilestoneStub[]
}

export type ResultCount = {
  pass_count: number
  fail_count: number
  partial_count: number
  skip_count: number
}

export type TestCase = {
  id: number
  section_id: number
  name: string
  procedure_url: string | null
  blocking: 'blocker' | 'normal'
  sort_order: number
  admin_signoff: boolean
  signoff_by: string | null
  signoff_at: string | null
  counts_by_arch: Record<string, ResultCount>
}

export type Section = {
  id: number
  milestone_id: number
  name: string
  architecture: string | null
  sort_order: number
  test_cases: TestCase[]
}

export type MilestoneDetail = {
  id: number
  release_id: number
  name: string
  status: 'open' | 'closed'
  start_date: string | null
  end_date: string | null
  download_url: string | null
  created_at: string
  release_name: string
  release_version: string
  sections: Section[]
}

export type HardwareEntry = {
  arch: string
  deploy_type: string
  hardware_notes: string
  result_count: number
}

export type Result = {
  id: number
  test_case_id: number
  outcome: 'PASS' | 'FAIL' | 'PARTIAL' | 'SKIP'
  arch: string
  deploy_type: string
  hardware_notes: string | null
  comment: string | null
  submitter_name: string | null
  submit_time: string
  carried_from_milestone_id: number | null
  submission_method: 'quick' | 'detailed'
  quick_outcome: 'works' | 'issues' | 'broken' | null
  bug_url: string | null
}

export type CoverageCell = {
  pass_count: number
  fail_count: number
  partial_count: number
  skip_count: number
  total: number
}

export type CoverageGrid = {
  sections: { id: number; name: string; architecture: string | null }[]
  arches: string[]
  grid: Record<string, CoverageCell>
}

export type UrgentNeed = {
  section_name: string
  test_case_id: number
  test_case_name: string
  blocking: string
}

export type CategorySectionSummary = {
  section_id: number
  name: string
  arch: string | null
  total: number
  covered: number
}

export type CategorySummary = {
  category: string
  label: string
  total: number
  covered: number
  by_arch: Record<string, ArchSummary>
  sections: CategorySectionSummary[]
}

export type ArchSummary = {
  total: number
  covered: number
  confidence: 'none' | 'low' | 'medium' | 'high'
}

export type CoverageSummary = {
  total_tests: number
  total_with_results: number
  categories: CategorySummary[]
  by_arch: Record<string, ArchSummary>
  hardware_configs: number
}

// ── releases ─────────────────────────────────────────────────────────────────

export const getReleases = () => request<Release[]>('/releases')
export const getRelease = (id: number) => request<Release>(`/releases/${id}`)
export const createRelease = (body: { name: string; version: string; notes?: string }) =>
  request<Release>('/releases', { method: 'POST', body: JSON.stringify(body) })
export const updateRelease = (id: number, body: Partial<{ name: string; version: string; notes: string }>) =>
  request<Release>(`/releases/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteRelease = (id: number) =>
  request<void>(`/releases/${id}`, { method: 'DELETE' })

// ── milestones ───────────────────────────────────────────────────────────────

export const getMilestone = (id: number) => request<MilestoneDetail>(`/milestones/${id}`)
export const createMilestone = (releaseId: number, body: { name: string; status?: string; start_date?: string; end_date?: string; download_url?: string }) =>
  request<MilestoneStub>(`/milestones/releases/${releaseId}`, { method: 'POST', body: JSON.stringify(body) })
export const updateMilestone = (id: number, body: Partial<{ name: string; status: string; start_date: string; end_date: string; download_url: string }>) =>
  request<MilestoneStub>(`/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteMilestone = (id: number) =>
  request<void>(`/milestones/${id}`, { method: 'DELETE' })
export const getCoverage = (id: number) => request<CoverageGrid>(`/milestones/${id}/coverage`)
export const getUrgentNeeds = (id: number) => request<UrgentNeed[]>(`/milestones/${id}/urgent-needs`)
export const getHardwareCoverage = (id: number) => request<HardwareEntry[]>(`/milestones/${id}/hardware-coverage`)
export const getCoverageSummary = (id: number) => request<CoverageSummary>(`/milestones/${id}/coverage-summary`)
export const carryForward = (milestoneId: number, sourceMilestoneId: number) =>
  request<{ copied: number }>(`/milestones/${milestoneId}/carry-forward`, {
    method: 'POST',
    body: JSON.stringify({ source_milestone_id: sourceMilestoneId }),
  })
export const resetMilestone = (milestoneId: number) =>
  request<{ reset: number }>(`/milestones/${milestoneId}/reset`, { method: 'POST' })

// ── sections ─────────────────────────────────────────────────────────────────

export const createSection = (milestoneId: number, body: { name: string; architecture?: string; sort_order?: number }) =>
  request<Section>(`/milestones/${milestoneId}/sections`, { method: 'POST', body: JSON.stringify(body) })
export const updateSection = (id: number, body: Partial<{ name: string; architecture: string; sort_order: number }>) =>
  request<Section>(`/sections/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteSection = (id: number) =>
  request<void>(`/sections/${id}`, { method: 'DELETE' })

// ── test cases ───────────────────────────────────────────────────────────────

export const createTestCase = (
  sectionId: number,
  body: { name: string; procedure_url?: string; blocking?: string; sort_order?: number },
) => request<TestCase>(`/sections/${sectionId}/test-cases`, { method: 'POST', body: JSON.stringify(body) })
export const updateTestCase = (
  id: number,
  body: Partial<{ name: string; procedure_url: string; blocking: string; sort_order: number }>,
) => request<TestCase>(`/test-cases/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteTestCase = (id: number) =>
  request<void>(`/test-cases/${id}`, { method: 'DELETE' })
export const signoffTestCase = (id: number) =>
  request<TestCase>(`/test-cases/${id}/signoff`, { method: 'POST' })
export const removeSignoff = (id: number) =>
  request<TestCase>(`/test-cases/${id}/signoff`, { method: 'DELETE' })

// ── results ──────────────────────────────────────────────────────────────────

export const getResults = (testCaseId: number) =>
  request<Result[]>(`/test-cases/${testCaseId}/results`)
export const submitResult = (
  testCaseId: number,
  body: {
    outcome: string
    arch: string
    deploy_type: string
    hardware_notes?: string
    comment?: string
    submitter_name?: string
    submission_method?: string
    quick_outcome?: string
    bug_url?: string
  },
) =>
  request<Result>(`/test-cases/${testCaseId}/results`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
export const deleteResult = (id: number) =>
  request<void>(`/results/${id}`, { method: 'DELETE' })

// ── bulk import ──────────────────────────────────────────────────────────────

export type BulkResultItem = {
  section_name: string
  test_case_name: string
  outcome: string
  comment?: string
}

export type BulkImportRequest = {
  submitter_name?: string
  arch: string
  deploy_type: string
  hardware_notes?: string
  results: BulkResultItem[]
}

export type BulkImportResponse = {
  imported: number
  skipped: number
  unmatched: string[]
}

export const bulkImport = (milestoneId: number, body: BulkImportRequest) =>
  request<BulkImportResponse>(`/milestones/${milestoneId}/bulk-import`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

// ── export ───────────────────────────────────────────────────────────────────

export const exportMilestoneJson = (milestoneId: number) =>
  `${BASE}/milestones/${milestoneId}/export/json`
export const exportMilestoneMarkdown = (milestoneId: number) =>
  `${BASE}/milestones/${milestoneId}/export/markdown`

// ── auth ─────────────────────────────────────────────────────────────────────

export type UserProfile = {
  id: number
  username: string
  display_name: string
  role: 'tester' | 'admin'
  is_test_team: boolean
}

export type MeResponse = {
  is_admin: boolean
  user: UserProfile | null
}

export const login = (token: string) =>
  request<{ ok: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ token }) })
export const registerUser = (body: { username: string; display_name: string; password: string }) =>
  request<{ ok: boolean; user: UserProfile }>('/auth/register', { method: 'POST', body: JSON.stringify(body) })
export const loginUser = (body: { username: string; password: string }) =>
  request<{ ok: boolean; user: UserProfile }>('/auth/login-user', { method: 'POST', body: JSON.stringify(body) })
export const logout = () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' })
export const getMe = () => request<MeResponse>('/auth/me')

// ── admin user management ───────────────────────────────────────────────────

export type AdminUserItem = {
  id: number
  username: string
  display_name: string
  role: string
  is_test_team: boolean
  disabled: boolean
  created_at: string
  last_login: string | null
  result_count: number
}

export const getAdminUsers = () => request<AdminUserItem[]>('/admin/users')
export const updateAdminUser = (
  userId: number,
  body: Partial<{ role: string; is_test_team: boolean; disabled: boolean }>,
) => request<AdminUserItem>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) })
