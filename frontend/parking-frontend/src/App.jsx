import { motion, useReducedMotion } from 'framer-motion'
import { CarFront, Clock3, Sparkles, UserCircle2, Wifi } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCurrentUser, logoutUser } from './api/client'
import SlotGrid from './components/SlotGrid'
import ChatWindow from './components/ChatWindow'

const cn = (...classes) => twMerge(clsx(...classes))

function App() {
  const [userId, setUserId] = useState('guest')
  const [refreshKey, setRefreshKey] = useState(0)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState('')
  const [viewMode, setViewMode] = useState('spaced')
  const [menuOpen, setMenuOpen] = useState(false)
  const [slotSummary, setSlotSummary] = useState({ total: 0, available: 0, occupied: 0, reserved: 0 })
  const [slotActivity, setSlotActivity] = useState([])
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data?.user) {
          setUser(data.user)
          setUserId(data.user_id || 'guest')
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id)
    }
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const message = params.get('auth_error')
    if (message) {
      setAuthMessage(decodeURIComponent(message))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    function handleResizeOrScroll() {
      if (!menuOpen || !triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const nextLeft = Math.max(12, Math.min(rect.right - 224, window.innerWidth - 236))
      const nextTop = Math.max(12, rect.bottom + 8)
      setMenuPosition({ top: nextTop, left: nextLeft })
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleResizeOrScroll, true)
    window.addEventListener('resize', handleResizeOrScroll)
    if (menuOpen) {
      requestAnimationFrame(handleResizeOrScroll)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleResizeOrScroll, true)
      window.removeEventListener('resize', handleResizeOrScroll)
    }
  }, [menuOpen])

  async function handleSignOut() {
    try {
      await logoutUser()
    } catch {
      // Ignore logout errors and clear local state.
    }
    setUser(null)
    setUserId('guest')
    setMenuOpen(false)
  }

  function handleGoogleLogin() {
    window.location.href = 'http://localhost:8000/auth/google/login'
  }

  function handleSlotsDataChange(nextData) {
    setSlotSummary(nextData.summary)
    setSlotActivity(nextData.activity)
  }

  function handleToggleMenu() {
    setMenuOpen((open) => {
      const next = !open
      if (next && triggerRef.current) {
        requestAnimationFrame(() => {
          const rect = triggerRef.current.getBoundingClientRect()
          const nextLeft = Math.max(12, Math.min(rect.right - 224, window.innerWidth - 236))
          const nextTop = Math.max(12, rect.bottom + 8)
          setMenuPosition({ top: nextTop, left: nextLeft })
        })
      }
      return next
    })
  }

  const menuContent = menuOpen ? (
    <motion.div
      ref={menuRef}
      initial={prefersReducedMotion ? false : { opacity: 0, y: -6, scale: 0.96 }}
      animate={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? {} : { opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed z-[9999] w-56 rounded-xl border border-white/10 bg-slate-950/90 p-2 shadow-[0_20px_45px_-20px_rgba(2,6,23,0.95)] backdrop-blur-xl"
      style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
    >
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false)
          if (user) {
            handleSignOut()
          }
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
          user
            ? 'bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
            : 'text-slate-200 hover:bg-white/10 hover:text-white',
        )}
      >
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border', user ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-white/10 bg-white/5')}>
          <UserCircle2 className={cn('h-4 w-4', user ? 'text-emerald-200' : 'text-slate-300')} />
        </div>
        <span>{user ? 'Sign out' : 'Guest mode'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setMenuOpen(false)
          handleGoogleLogin()
        }}
        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/10">
          <span className="text-[11px] font-semibold text-slate-100">G</span>
        </div>
        <span>Sign in with Google</span>
      </button>
    </motion.div>
  ) : null

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_40%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#111827_100%)] px-3 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <motion.header
          initial={prefersReducedMotion ? false : { opacity: 0, y: -16 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="glass-card flex flex-col gap-4 overflow-visible rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_65px_-30px_rgba(15,23,42,0.95)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.2)]">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">ParkLyzer</h1>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300">
                  Live
                </span>
              </div>
              <p className="text-sm text-slate-400">AI parking concierge</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {authMessage ? (
              <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {authMessage}
              </div>
            ) : null}
            <div className={cn('flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-300', prefersReducedMotion ? '' : 'shadow-[0_0_24px_rgba(56,189,248,0.16)]')}>
              <Wifi className="h-4 w-4 text-emerald-300" />
              <span>Streaming status</span>
            </div>
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                onClick={handleToggleMenu}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-2 text-sm text-slate-300 transition hover:border-emerald-400/20 hover:bg-emerald-500/10"
                disabled={authLoading}
              >
                {user?.picture ? (
                  <img src={user.picture} alt={user.name || 'Avatar'} className="h-8 w-8 rounded-full border border-white/10" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                )}
                <span className="pr-1 text-sm font-medium text-white">{user ? (user.name || user.email || 'Signed in') : 'Guest'}</span>
              </button>

              {menuOpen ? createPortal(menuContent, document.body) : null}
            </div>
          </div>
        </motion.header>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
            className="glass-card rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_65px_-30px_rgba(15,23,42,0.95)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-300">Occupancy map</p>
                <h2 className="text-xl font-semibold text-white">Parking slots</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewMode((current) => (current === 'spaced' ? 'compact' : 'spaced'))}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  viewMode === 'compact'
                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.15)]'
                    : 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-emerald-400/20 hover:bg-emerald-500/10 hover:text-emerald-200',
                )}
              >
                <Sparkles className="h-4 w-4" />
                <span>{viewMode === 'compact' ? 'Compact view' : 'Adaptive view'}</span>
              </button>
            </div>
            <SlotGrid refreshKey={refreshKey} viewMode={viewMode} onSlotsDataChange={handleSlotsDataChange} />
          </motion.section>

          <div className="flex h-full flex-col gap-4">
            <motion.section
              initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
              className="glass-card rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_65px_-30px_rgba(15,23,42,0.95)] backdrop-blur-xl"
            >
              <ChatWindow userId={userId} onSlotsChanged={() => setRefreshKey((k) => k + 1)} slotsSummary={slotSummary} />
            </motion.section>

            {viewMode === 'compact' ? null : (
              <motion.section
                initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.16, ease: 'easeOut' }}
                className="glass-card flex flex-1 flex-col rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_65px_-30px_rgba(15,23,42,0.95)] backdrop-blur-xl"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Recent activity</p>
                    <h3 className="text-lg font-semibold text-white">Live feed</h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                    Live
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {slotActivity.length ? (
                    <ul className="space-y-1.5">
                      {slotActivity.slice(0, 6).map((item, index) => (
                        <li key={`${item.slot_id}-${item.status}-${index}`} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-2.5 py-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                            <Clock3 className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-white">{item.slot_id}</span>
                              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]', item.status === 'reserved' ? 'bg-amber-500/15 text-amber-200' : 'bg-rose-500/15 text-rose-200')}>
                                {item.status}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="truncate">{item.zone}</span>
                              {item.timeLabel ? <span>• {item.timeLabel}</span> : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-slate-400">
                      No recent activity
                    </div>
                  )}
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
