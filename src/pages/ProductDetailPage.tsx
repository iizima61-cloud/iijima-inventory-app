import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ProductThumbnail } from '../components/ProductThumbnail'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { deleteProductPhoto } from '../lib/storage'

interface ProductDetail {
  id: string
  name: string
  category: string | null
  code: string | null
  color_code: string | null
  swatch_color: string | null
  location: string | null
  unit: string
  standard_stock: number
  current_stock: number
  note: string | null
  manufacturers: { name: string } | null
  photos: { id: string; storage_path: string; created_at: string }[]
}

interface Movement {
  id: string
  movement_type: 'checkout' | 'return'
  quantity: number
  note: string | null
  created_at: string
  sites: { name: string } | null
}

interface InventoryLogRow {
  id: string
  system_quantity: number
  counted_quantity: number
  diff: number
  created_at: string
  note: string | null
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [logs, setLogs] = useState<InventoryLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    if (!id) return
    const [productRes, movementsRes, logsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, category, code, color_code, swatch_color, location, unit, standard_stock, current_stock, note, manufacturers(name), photos(id, storage_path, created_at)')
        .eq('id', id)
        .single(),
      supabase
        .from('checkout_history')
        .select('id, movement_type, quantity, note, created_at, sites(name)')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('inventory_log')
        .select('id, system_quantity, counted_quantity, diff, created_at, note')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (productRes.data) setProduct(productRes.data as unknown as ProductDetail)
    if (movementsRes.data) setMovements(movementsRes.data as unknown as Movement[])
    if (logsRes.data) setLogs(logsRes.data as InventoryLogRow[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleDelete = async () => {
    if (!product) return
    if (!window.confirm(`「${product.name}」を削除します。出庫戻庫・棚卸の履歴も全て削除され元に戻せません。よろしいですか?`)) {
      return
    }
    setDeleting(true)
    try {
      for (const photo of product.photos) {
        await deleteProductPhoto(photo.storage_path)
      }
      const { error } = await supabase.from('products').delete().eq('id', product.id)
      if (error) throw error
      navigate('/')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '削除に失敗しました')
      setDeleting(false)
    }
  }

  const sortedPhotos = useMemo(
    () => [...(product?.photos ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [product],
  )
  const lightboxUrls = sortedPhotos.map((p) => photoUrls[p.storage_path]).filter((u): u is string => !!u)

  if (loading) return <p className="text-slate-500">読み込み中...</p>
  if (!product) return <p className="text-slate-500">商品が見つかりません。</p>

  const low = product.current_stock < product.standard_stock

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← 在庫一覧に戻る
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/products/${product.id}/edit`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            編集
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-400">
          {[product.category, product.manufacturers?.name].filter(Boolean).join(' / ') || '未設定'}
        </p>
        <h1 className="mb-3 text-xl font-bold text-slate-800">{product.name}</h1>

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {sortedPhotos.length === 0 && <ProductThumbnail path={null} alt={product.name} />}
          {sortedPhotos.map((photo, i) => (
            <ProductThumbnail
              key={photo.id}
              path={photo.storage_path}
              alt={product.name}
              onClick={() => setLightboxIndex(i)}
              onLoaded={(url) => setPhotoUrls((prev) => ({ ...prev, [photo.storage_path]: url }))}
            />
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-400">型番</dt>
            <dd className="text-slate-800">{product.code || '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">色番号</dt>
            <dd className="flex items-center gap-1.5 text-slate-800">
              {product.color_code && (
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300"
                  style={{ backgroundColor: product.swatch_color ?? '#e5e7eb' }}
                />
              )}
              {product.color_code || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">現在在庫</dt>
            <dd className={`font-bold ${low ? 'text-red-600' : 'text-slate-800'}`}>
              {product.current_stock} {product.unit}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">基準在庫</dt>
            <dd className="text-slate-800">
              {product.standard_stock} {product.unit}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">単位</dt>
            <dd className="text-slate-800">{product.unit}</dd>
          </div>
          <div>
            <dt className="text-slate-400">保管場所</dt>
            <dd className="text-slate-800">{product.location || '-'}</dd>
          </div>
        </dl>
        {product.note && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{product.note}</p>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">出庫・戻庫履歴</h2>
        {movements.length === 0 && <p className="text-sm text-slate-400">履歴はありません。</p>}
        <ul className="flex flex-col gap-2">
          {movements.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <span className={m.movement_type === 'checkout' ? 'text-red-600' : 'text-green-600'}>
                {m.movement_type === 'checkout' ? '出庫' : '戻庫'} {m.quantity} {product.unit}
                {m.sites?.name ? `(${m.sites.name})` : ''}
              </span>
              <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString('ja-JP')}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">棚卸履歴</h2>
        {logs.length === 0 && <p className="text-sm text-slate-400">履歴はありません。</p>}
        <ul className="flex flex-col gap-2">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">
                実数 {l.counted_quantity}(理論値 {l.system_quantity} / 差
                <span className={l.diff !== 0 ? 'font-bold text-amber-600' : ''}> {l.diff}</span>)
              </span>
              <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleString('ja-JP')}</span>
            </li>
          ))}
        </ul>
      </div>

      {lightboxIndex !== null && lightboxUrls.length > 0 && (
        <PhotoLightbox
          urls={lightboxUrls}
          index={Math.min(lightboxIndex, lightboxUrls.length - 1)}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}
