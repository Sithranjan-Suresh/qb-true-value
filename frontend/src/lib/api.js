const BASE_URL = import.meta.env.VITE_API_BASE_URL

async function request(path, options) {
  const response = await fetch(`${BASE_URL}${path}`, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail =
      typeof body.detail === 'string'
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail.map((e) => `${e.loc?.at(-1)}: ${e.msg}`).join('; ')
          : `Request failed with status ${response.status}`
    throw new Error(detail)
  }
  return response.json()
}

export function getLeaderboard() {
  return request('/api/qbs')
}

export function getQBDetail(qbId, season) {
  return request(`/api/qbs/${qbId}/${season}`)
}

export function getQBSeasons(qbId) {
  return request(`/api/qbs/${qbId}`)
}

export function postWhatIf(payload) {
  return request('/api/whatif', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function getMethodology() {
  return request('/api/methodology')
}
