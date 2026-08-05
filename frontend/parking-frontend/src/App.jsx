import { useState } from 'react'
import SlotGrid from './components/SlotGrid'
import ChatWindow from './components/ChatWindow'

function App() {
  const [userId, setUserId] = useState('guest')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Parking Lot Assistant</h1>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-600">User ID:</label>
        <input
          className="border border-gray-300 rounded px-2 py-1"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      <SlotGrid refreshKey={refreshKey} />

      <ChatWindow userId={userId} onSlotsChanged={() => setRefreshKey((k) => k + 1)} />
    </div>
  )
}

export default App
