import { useEffect, useState } from 'react'
import { getSignedPhotoUrl } from '../lib/storage'

export function ProductThumbnail({ path, alt }: { path: string | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!path) {
      setUrl(null)
      return
    }
    getSignedPhotoUrl(path).then((signed) => {
      if (!cancelled) setUrl(signed)
    })
    return () => {
      cancelled = true
    }
  }, [path])

  if (!url) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
        No Image
      </div>
    )
  }

  return <img src={url} alt={alt} className="h-14 w-14 shrink-0 rounded-md object-cover" />
}
