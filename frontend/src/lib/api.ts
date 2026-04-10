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
  created_at: string
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
  created_at: string
  release_name: string
  release_version: string
  sections: Section[]
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
export const createMilestone = (releaseId: number, body: { name: string; status?: string }) =>
  request<MilestoneStub>(`/milestones/releases/${releaseId}`, { method: 'POST', body: JSON.stringify(body) })
export const updateMilestone = (id: number, body: Partial<{ name: string; status: string }>) =>
  request<MilestoneStub>(`/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteMilestone = (id: number) =>
  request<void>(`/milestones/${id}`, { method: 'DELETE' })
export const getCoverage = (id: number) => request<CoverageGrid>(`/milestones/${id}/coverage`)
export const carryForward = (milestoneId: number, sourceMilestoneId: number) =>
  request<{ copied: number }>(`/milestones/${milestoneId}/carry-forward`, {
    method: 'POST',
    body: JSON.stringify({ source_milestone_id: sourceMilestoneId }),
  })

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
  },
) =>
  request<Result>(`/test-cases/${testCaseId}/results`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
export const deleteResult = (id: number) =>
  request<void>(`/results/${id}`, { method: 'DELETE' })

// ── auth ─────────────────────────────────────────────────────────────────────

export const login = (token: string) =>
  request<{ ok: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ token }) })
export const logout = () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' })
export const getMe = () => request<{ is_admin: boolean }>('/auth/me')
