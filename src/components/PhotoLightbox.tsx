import { useEffect, useRef, useState } from 'react'

interface PhotoLightboxProps {
  urls: string[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

const MIN_SCALE = 1
const MAX_SCALE = 5

export function PhotoLightbox({ urls, index, onClose, onNavigate }: PhotoLightboxProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [index])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < urls.length - 1) onNavigate(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, urls.length, onClose, onNavigate])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor))
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 })
      return next
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset }
    setDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current) return
    const { startX, startY, origin } = dragState.current
    setOffset({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) })
  }

  const stopDragging = () => {
    dragState.current = null
    setDragging(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-lg text-white hover:bg-white/20"
        aria-label="閉じる"
      >
        ✕
      </button>

      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(index - 1)
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20 sm:left-4"
          aria-label="前の写真"
        >
          ‹
        </button>
      )}
      {index < urls.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(index + 1)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20 sm:right-4"
          aria-label="次の写真"
        >
          ›
        </button>
      )}

      <div
        className="flex h-full w-full items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => {
            setScale(1)
            setOffset({ x: 0, y: 0 })
          }}
        >
          <img
            src={urls[index]}
            alt=""
            draggable={false}
            style={{ transform: `scale(${scale})`, transition: dragging ? 'none' : 'transform 0.15s ease-out' }}
            className={`max-h-[85vh] max-w-[90vw] select-none rounded-md object-contain ${
              scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            }`}
          />
        </div>
      </div>

      {urls.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
          {index + 1} / {urls.length}
        </p>
      )}
      <p className="absolute bottom-4 right-4 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
        スクロールで拡大縮小・ドラッグで移動
      </p>
    </div>
  )
}
