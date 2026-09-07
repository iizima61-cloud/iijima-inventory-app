import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getOrCreateManufacturer } from '../lib/lookups'
import { uploadProductPhoto } from '../lib/storage'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../lib/categories'
import { guessColorFromCode } from '../lib/colorGuess'

const DEFAULT_SWATCH = '#cbd5e1'

export function ProductNewPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [productNames, setProductNames] = useState<string[]>([])
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
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const handleColorCodeChange = (value: string) => {
    setColorCode(value)
    if (!swatchTouched) {
      const guess = guessColorFromCode(value)
      if (guess) setSwatchColor(guess)
    }
  }

  const addFiles = (newFiles: FileList | File[]) => {
    const imagesOnly = Array.from(newFiles).filter((f) => f.type.startsWith('image/'))
    setFiles((prev) => [...prev, ...imagesOnly])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

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
      .select('name')
      .order('name')
      .then(({ data }) => {
        if (data) setProductNames([...new Set(data.map((p) => p.name))])
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const manufacturerId = manufacturerName.trim()
        ? await getOrCreateManufacturer(manufacturerName)
        : null

      const { data: product, error: insertError } = await supabase
        .from('products')
        .insert({
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
          created_by: session?.user.id,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      for (const file of files) {
        const path = await uploadProductPhoto(product.id, file)
        await supabase.from('photos').insert({
          product_id: product.id,
          storage_path: path,
          created_by: session?.user.id,
        })
      }

      navigate(`/products/${product.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-lg font-bold text-slate-800">商品登録</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">メーカー</label>
          <input
            list="manufacturer-list"
            value={manufacturerName}
            onChange={(e) => setManufacturerName(e.target.value)}
            placeholder="既存を選ぶか新規入力"
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
            onChange={(e) => setName(e.target.value)}
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
            <p className="mt-1 text-xs text-slate-400">
              日塗工形式(例: N-90, 25-90B)は自動でおおよその色を推定します。違う場合は右の色見本から修正してください。
            </p>
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
            <label className="mb-1 block text-sm font-medium text-slate-600">初期在庫数</label>
            <input
              type="number"
              step="any"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
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
            capture="environment"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
            className="hidden"
          />
          {previewUrls.length > 0 && (
            <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
              {previewUrls.map((url, i) => (
                <div key={url} className="relative shrink-0 snap-start">
                  <img
                    src={url}
                    alt={`選択した写真 ${i + 1}`}
                    className="h-20 w-20 rounded-md border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label="削除"
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '登録中...' : '登録する'}
        </button>
      </form>
    </div>
  )
}
