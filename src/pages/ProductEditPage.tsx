import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getOrCreateManufacturer } from '../lib/lookups'
import { uploadProductPhoto, deleteProductPhoto, getSignedPhotoUrl } from '../lib/storage'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../lib/categories'
import { guessColorFromCode } from '../lib/colorGuess'
import { ConfirmDialog } from '../components/ConfirmDialog'

const DEFAULT_SWATCH = '#cbd5e1'

interface ExistingPhoto {
  id: string
  storage_path: string
  url: string | null
}

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [productNames, setProductNames] = useState<string[]>([])
  const [nameToManufacturer, setNameToManufacturer] = useState<Map<string, string>>(new Map())
  const [locations, setLocations] = useState<string[]>([])
  const [manufacturerName, setManufacturerName] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [code, setCode] = useState('')
  const [colorCode, setColorCode] = useState('')
  const [swatchColor, setSwatchColor] = useState(DEFAULT_SWATCH)
  const [swatchTouched, setSwatchTouched] = useState(false)
  const [unit, setUnit] = useState('缶')
  const [standardStock, setStandardStock] = useState('0')
  const [currentStock, setCurrentStock] = useState('0')
  const [note, setNote] = useState('')
  const [location, setLocation] = useState('')
  const [photos, setPhotos] = useState<ExistingPhoto[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<ExistingPhoto | null>(null)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const [deletePhotoError, setDeletePhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('manufacturers')
      .select('name')
      .order('name')
      .then(({ data }) => {
        if (data) setManufacturers(data.map((m) => m.name))
      })
    supabase
      .from('products')
      .select('name, manufacturers(name)')
      .order('name')
      .then(({ data }) => {
        if (!data) return
        setProductNames([...new Set(data.map((p) => p.name))])
        const map = new Map<string, string>()
        for (const p of data as unknown as { name: string; manufacturers: { name: string } | null }[]) {
          if (p.manufacturers?.name && !map.has(p.name)) map.set(p.name, p.manufacturers.name)
        }
        setNameToManufacturer(map)
      })
    supabase
      .from('products')
      .select('location')
      .not('location', 'is', null)
      .order('location')
      .then(({ data }) => {
        if (data) setLocations([...new Set(data.map((p) => p.location as string))])
      })
  }, [])

  useEffect(() => {
    if (!id) return
    supabase
      .from('products')
      .select('name, category, code, color_code, swatch_color, location, unit, standard_stock, current_stock, note, manufacturers(name), photos(id, storage_path)')
      .eq('id', id)
      .single()
      .then(async ({ data }) => {
        if (!data) {
          setLoading(false)
          return
        }
        setManufacturerName((data.manufacturers as { name: string } | null)?.name ?? '')
        setName(data.name)
        setCategory(data.category ?? CATEGORIES[0])
        setCode(data.code ?? '')
        setColorCode(data.color_code ?? '')
        if (data.swatch_color) {
          setSwatchColor(data.swatch_color)
          setSwatchTouched(true)
        }
        setUnit(data.unit)
        setStandardStock(String(data.standard_stock))
        setCurrentStock(String(data.current_stock))
        setNote(data.note ?? '')
        setLocation(data.location ?? '')

        const photoRows = data.photos as { id: string; storage_path: string }[]
        const withUrls = await Promise.all(
          photoRows.map(async (p) => ({ id: p.id, storage_path: p.storage_path, url: await getSignedPhotoUrl(p.storage_path).catch(() => null) })),
        )
        setPhotos(withUrls)
        setLoading(false)
      })
  }, [id])

  const handleNameChange = (value: string) => {
    setName(value)
    if (!manufacturerName.trim()) {
      const matched = nameToManufacturer.get(value)
      if (matched) setManufacturerName(matched)
    }
  }

  const handleColorCodeChange = (value: string) => {
    setColorCode(value)
    if (!swatchTouched) {
      const guess = guessColorFromCode(value)
      if (guess) setSwatchColor(guess)
    }
  }

  const handleAddFiles = async (fileList: FileList | File[]) => {
    if (!id) return
    const imagesOnly = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    for (const file of imagesOnly) {
      const path = await uploadProductPhoto(id, file)
      const { data: photoRow, error: insertError } = await supabase
        .from('photos')
        .insert({ product_id: id, storage_path: path, created_by: session?.user.id })
        .select('id')
        .single()
      if (insertError) throw insertError
      const url = await getSignedPhotoUrl(path).catch(() => null)
      setPhotos((prev) => [...prev, { id: photoRow.id, storage_path: path, url }])
    }
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      try {
        await handleAddFiles(e.dataTransfer.files)
      } catch (err) {
        setError(err instanceof Error ? err.message : '写真のアップロードに失敗しました')
      }
    }
  }

  const handleRemovePhotoConfirmed = async () => {
    if (!photoToDelete) return
    setDeletePhotoError(null)
    setDeletingPhoto(true)
    try {
      await deleteProductPhoto(photoToDelete.storage_path)
      const { error: deleteError } = await supabase.from('photos').delete().eq('id', photoToDelete.id)
      if (deleteError) throw deleteError
      setPhotos((prev) => prev.filter((p) => p.id !== photoToDelete.id))
      setPhotoToDelete(null)
    } catch (err) {
      setDeletePhotoError(err instanceof Error ? err.message : '写真の削除に失敗しました')
    } finally {
      setDeletingPhoto(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setError(null)
    setSubmitting(true)
    try {
      const manufacturerId = manufacturerName.trim()
        ? await getOrCreateManufacturer(manufacturerName)
        : null

      const { error: updateError } = await supabase
        .from('products')
        .update({
          manufacturer_id: manufacturerId,
          name,
          category,
          code: code || null,
          color_code: colorCode || null,
          swatch_color: colorCode ? swatchColor : null,
          location: location || null,
          unit,
          standard_stock: Number(standardStock) || 0,
          current_stock: Number(currentStock) || 0,
          note: note || null,
        })
        .eq('id', id)
      if (updateError) throw updateError

      navigate(`/products/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-slate-500">読み込み中...</p>

  return (
    <div className="mx-auto max-w-xl">
      <Link to={`/products/${id}`} className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← 商品詳細に戻る
      </Link>
      <h1 className="mb-4 text-lg font-bold text-slate-800">商品編集</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">メーカー</label>
          <input
            list="manufacturer-list"
            value={manufacturerName}
            onChange={(e) => setManufacturerName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <datalist id="manufacturer-list">
            {manufacturers.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">商品名 *</label>
          <input
            required
            list="product-name-list"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="既存を選ぶか新規入力"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <datalist id="product-name-list">
            {productNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">カテゴリー *</label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">型番</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">色番号</label>
            <div className="flex items-center gap-2">
              <input
                value={colorCode}
                onChange={(e) => handleColorCodeChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                type="color"
                value={swatchColor}
                onChange={(e) => {
                  setSwatchTouched(true)
                  setSwatchColor(e.target.value)
                }}
                title="色見本(自動推定・手動で修正可)"
                className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-slate-300 p-0.5"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">単位</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">保管場所</label>
            <input
              list="location-list"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例: 1-棚"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <datalist id="location-list">
              {locations.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">基準在庫</label>
            <input
              type="number"
              step="any"
              value={standardStock}
              onChange={(e) => setStandardStock(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">現在在庫</label>
            <input
              type="number"
              step="any"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-400">通常は棚卸・出庫戻庫から変更してください</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">備考</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">写真</label>
          {photos.length > 0 && (
            <div className="mb-2 flex snap-x gap-2 overflow-x-auto pb-1">
              {photos.map((photo) => (
                <div key={photo.id} className="relative shrink-0 snap-start">
                  {photo.url ? (
                    <img src={photo.url} alt="" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded-md bg-slate-100" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePhotoError(null)
                      setPhotoToDelete(photo)
                    }}
                    aria-label="削除"
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-md border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 text-slate-500 hover:border-slate-400'
            }`}
          >
            クリックして選択、またはここに写真をドラッグ&ドロップ
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              if (e.target.files) {
                try {
                  await handleAddFiles(e.target.files)
                } catch (err) {
                  setError(err instanceof Error ? err.message : '写真のアップロードに失敗しました')
                }
              }
              e.target.value = ''
            }}
            className="hidden"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '保存中...' : '保存する'}
        </button>
      </form>

      {photoToDelete && (
        <ConfirmDialog
          title="写真を削除しますか?"
          message="この写真を削除します。元に戻せません。"
          confirmLabel="削除する"
          busy={deletingPhoto}
          error={deletePhotoError}
          onCancel={() => setPhotoToDelete(null)}
          onConfirm={handleRemovePhotoConfirmed}
        />
      )}
    </div>
  )
}
