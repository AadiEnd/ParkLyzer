import { useState } from 'react'
import { sendChatMessage } from '../api/client'

export default function ChatWindow({ userId, onSlotsChanged }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setSending(true)
    try {
      const { reply } = await sendChatMessage(userId, text)
      setMessages((prev) => [...prev, { role: 'agent', text: reply }])
      onSlotsChanged()
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'agent', text: `Error: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg h-96">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-100 text-gray-900'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex border-t border-gray-300 p-2 gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about parking..."
          disabled={sending}
        />
        <button
          className="bg-blue-500 text-white rounded px-3 py-1 text-sm disabled:opacity-50"
          onClick={handleSend}
          disabled={sending}
        >
          Send
        </button>
      </div>
    </div>
  )
}
