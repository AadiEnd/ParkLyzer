import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CarFront, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useEffect, useRef, useState } from 'react'
import { getSlots } from '../api/client'

const cn = (...classes) => twMerge(clsx(...classes))

const SLOT_REFRESH_INTERVAL_MS = 20000

const STATUS_COLOR = {
  free: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  occupied: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
  reserved: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
}

const STATUS_DOT = {
  free: 'bg-emerald-400',
  occupied: 'bg-rose-400',
  reserved: 'bg-amber-400',
}

function CarMarker({ animatingOut }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { x: animatingOut ? 0 : -90, opacity: 0, scale: 0.9 }}
      animate={prefersReducedMotion ? { x: 0, opacity: 1, scale: 1 } : { x: 0, opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? {} : { x: 80, opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="absolute inset-y-2 left-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
    >
      <CarFront className="h-4 w-4" />
    </motion.div>
  )
}

export default function SlotGrid({ refreshKey, viewMode, onSlotsDataChange }) {
  const [slots, setSlots] = useState([])
  const [carStates, setCarStates] = useState({})
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const prevSlotsRef = useRef([])
  const prefersReducedMotion = useReducedMotion()

  function summarizeSlots(nextSlots) {
    const summary = {
      total: nextSlots.length,
      available: 0,
      occupied: 0,
      reserved: 0,
    }

    nextSlots.forEach((slot) => {
      if (slot.status === 'free') {
        summary.available += 1
      } else if (slot.status === 'occupied') {
        summary.occupied += 1
      } else if (slot.status === 'reserved') {
        summary.reserved += 1
      }
    })

    return summary
  }

  function buildRecentActivity(nextSlots) {
    return nextSlots
      .filter((slot) => slot.status === 'occupied' || slot.status === 'reserved')
      .map((slot) => ({
        slot_id: slot.slot_id,
        status: slot.status,
        zone: slot.zone,
        timeLabel: slot.status === 'reserved' && slot.reserved_until ? `until ${slot.reserved_until}` : null,
      }))
      .sort((a, b) => {
        if (a.status === b.status) return 0
        return a.status === 'reserved' ? -1 : 1
      })
  }

  useEffect(() => {
    const fetchSlots = () => {
      setStatus('loading')
      setError('')
      return getSlots()
        .then((nextSlots) => {
          const previousSlots = prevSlotsRef.current
          const nextStates = {}

          nextSlots.forEach((slot) => {
            const prev = previousSlots.find((entry) => entry.slot_id === slot.slot_id)
            if (prev && prev.status !== slot.status) {
              nextStates[slot.slot_id] = slot.status === 'occupied' ? 'enter' : slot.status === 'free' ? 'exit' : null
            }
          })

          setSlots(nextSlots)
          prevSlotsRef.current = nextSlots
          setStatus(nextSlots.length ? 'ready' : 'empty')
          onSlotsDataChange?.({ summary: summarizeSlots(nextSlots), activity: buildRecentActivity(nextSlots) })

          const entries = Object.entries(nextStates).filter(([, value]) => value)
          if (entries.length) {
            setCarStates((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
          }

          entries.forEach(([slotId, state]) => {
            if (state === 'exit') {
              window.setTimeout(() => {
                setCarStates((prev) => ({ ...prev, [slotId]: undefined }))
              }, 650)
            }
          })
        })
        .catch((err) => {
          setSlots([])
          setStatus('error')
          setError(err.message || 'Unable to load slots')
          onSlotsDataChange?.({ summary: summarizeSlots([]), activity: [] })
        })
    }

    fetchSlots()
    const interval = window.setInterval(fetchSlots, SLOT_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [refreshKey])

  if (status === 'loading') {
    return (
      <div className={cn('grid gap-3', viewMode === 'compact' ? 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4')}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="mt-3 h-3 w-12 rounded bg-white/10" />
            <div className="mt-6 h-8 rounded bg-white/10" />
          </div>
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            setStatus('loading')
            getSlots()
              .then((nextSlots) => {
                setSlots(nextSlots)
                setStatus(nextSlots.length ? 'ready' : 'empty')
                setError('')
                onSlotsDataChange?.({ summary: summarizeSlots(nextSlots), activity: buildRecentActivity(nextSlots) })
              })
              .catch((err) => {
                setStatus('error')
                setError(err.message || 'Unable to load slots')
              })
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p>No slots configured yet.</p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-3', viewMode === 'compact' ? 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4')}>
      {slots.map((slot) => {
        const animationState = carStates[slot.slot_id]
        const showCar = slot.status === 'occupied' || animationState === 'exit'
        const isAnimatingOut = animationState === 'exit'

        return (
          <motion.div
            key={slot.slot_id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            whileHover={prefersReducedMotion ? {} : { scale: 1.03, y: -4, rotateX: -8, rotateY: 8 }}
            className={cn(
              'relative overflow-hidden rounded-2xl border shadow-[0_18px_45px_-24px_rgba(2,6,23,0.95)] backdrop-blur-xl',
              viewMode === 'compact' ? 'p-2.5' : 'p-3',
              STATUS_COLOR[slot.status],
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_55%)]" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{slot.slot_id}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">{slot.zone}</div>
              </div>
              <div className={cn('mt-1 h-2.5 w-2.5 rounded-full', STATUS_DOT[slot.status])} />
            </div>

            <div className="relative mt-4 flex items-end justify-between">
              <div>
                <div className="text-[11px] capitalize text-slate-300">{slot.status}</div>
                <div className="mt-1 text-[11px] text-slate-400">{slot.reserved_until ? `Until ${slot.reserved_until}` : 'Open now'}</div>
              </div>
              <div className="relative h-9 w-12">
                <AnimatePresence mode="wait">
                  {showCar && <CarMarker key={`${slot.slot_id}-${animationState ?? 'active'}`} animatingOut={isAnimatingOut} />}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
