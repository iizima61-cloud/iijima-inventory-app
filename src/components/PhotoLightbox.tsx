import { useEffect } from 'react'

interface PhotoLightboxProps {
  urls: string[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function PhotoLightbox({ urls, index, onClose, onNavigate }: PhotoLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < urls.length - 1) onNavigate(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, urls.length, onClose, onNavigate])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
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

      <img
        src={urls[index]}
        alt=""
        className="max-h-full max-w-full rounded-md object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {urls.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
          {index + 1} / {urls.length}
        </p>
      )}
    </div>
  )
}
