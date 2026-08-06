const BASE_URL = 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Request failed')
  }
  return res.json()
}

export async function sendChatMessage(userId, message) {
  return request('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, message }),
  })
}

export async function getSlots() {
  return request('/slots')
}

export async function createReservation(slotId, userId, durationMinutes) {
  return request('/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId, user_id: userId, duration_minutes: durationMinutes }),
  })
}

export async function getCurrentUser() {
  return request('/auth/me')
}

export async function logoutUser() {
  return request('/auth/logout', { method: 'POST' })
}
