const BASE_URL = 'http://localhost:8000'

export async function sendChatMessage(userId, message) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, message }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Chat request failed')
  return res.json()
}

export async function getSlots() {
  const res = await fetch(`${BASE_URL}/slots`)
  if (!res.ok) throw new Error('Failed to fetch slots')
  return res.json()
}

export async function createReservation(slotId, userId, durationMinutes) {
  const res = await fetch(`${BASE_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId, user_id: userId, duration_minutes: durationMinutes }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Reservation failed')
  return res.json()
}
