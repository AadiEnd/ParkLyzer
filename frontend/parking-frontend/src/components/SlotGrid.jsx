import { useEffect, useState } from 'react'
import { getSlots } from '../api/client'

const STATUS_COLOR = {
  free: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
}

export default function SlotGrid({ refreshKey }) {
  const [slots, setSlots] = useState([])

  useEffect(() => {
    const fetchSlots = () => getSlots().then(setSlots).catch(() => {})
    fetchSlots()
    const interval = setInterval(fetchSlots, 4000)
    return () => clearInterval(interval)
  }, [refreshKey])

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {slots.map((slot) => (
        <div
          key={slot.slot_id}
          className={`${STATUS_COLOR[slot.status]} text-white rounded-lg p-3 text-center shadow`}
        >
          <div className="font-semibold">{slot.slot_id}</div>
          <div className="text-xs opacity-90">{slot.zone}</div>
          <div className="text-xs capitalize">{slot.status}</div>
        </div>
      ))}
    </div>
  )
}
