import { useEffect, useState } from 'react'
import { getSignedPhotoUrl } from '../lib/storage'

export function ProductThumbnail({
  path,
  alt,
  onClick,
  onLoaded,
}: {
  path: string | null
  alt: string
  onClick?: () => void
  onLoaded?: (url: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!path) {
      setUrl(null)
      return
    }
    getSignedPhotoUrl(path).then((signed) => {
      if (!cancelled) {
        setUrl(signed)
        onLoaded?.(signed)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  if (!url) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
        No Image
      </div>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="h-14 w-14 shrink-0 overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      </button>
    )
  }

  return <img src={url} alt={alt} className="h-14 w-14 shrink-0 rounded-md object-cover" />
}
