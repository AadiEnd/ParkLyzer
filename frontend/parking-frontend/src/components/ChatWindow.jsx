import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bot, SendHorizonal, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useState } from 'react'
import { sendChatMessage } from '../api/client'

const cn = (...classes) => twMerge(clsx(...classes))

const QUICK_ACTIONS = ['Show available slots', 'Reserve a spot', 'Help me park']

export default function ChatWindow({ userId, onSlotsChanged, slotsSummary = { total: 0, available: 0, occupied: 0, reserved: 0 } }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  async function handleSend(textOverride = null) {
    const text = (textOverride ?? input).trim()
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

  function handleQuickAction(text) {
    handleSend(text)
  }

  return (
    <div className="flex h-128 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-300">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Assistant</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span>Active</span>
            </div>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
          AI guidance
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleQuickAction(action)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-emerald-500/10"
            >
              {action}
            </button>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={`${m.role}-${i}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-3 py-2.5 text-sm leading-6 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.9)]',
                  m.role === 'user'
                    ? 'ml-auto border border-cyan-400/20 bg-cyan-500/15 text-cyan-50'
                    : 'border border-white/10 bg-white/8 text-slate-100',
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  {m.role === 'user' ? <Sparkles className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  <span>{m.role === 'user' ? 'You' : 'Assistant'}</span>
                </div>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-slate-950/60 px-3 py-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Available', value: slotsSummary.available, accent: 'text-emerald-300' },
            { label: 'Occupied', value: slotsSummary.occupied, accent: 'text-rose-300' },
            { label: 'Reserved', value: slotsSummary.reserved, accent: 'text-amber-300' },
            { label: 'Total', value: slotsSummary.total, accent: 'text-cyan-300' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-center">
              <div className={cn('text-[11px] uppercase tracking-[0.2em] text-slate-400', item.accent)}>{item.label}</div>
              <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-slate-950/55 p-2.5">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-2 py-2 shadow-[0_10px_30px_-16px_rgba(2,6,23,0.95)]">
          <input
            className="flex-1 bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-slate-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about parking..."
            disabled={sending}
          />
          <button
            className="rounded-full bg-emerald-500/90 p-2 text-white transition hover:scale-105 disabled:opacity-50"
            onClick={() => handleSend()}
            disabled={sending}
            type="button"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
