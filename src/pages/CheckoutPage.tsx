import { useEffect, useState, type FormEvent, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreateSite } from '../lib/lookups'
import { toCsv, downloadCsv } from '../lib/csv'

interface ProductOption {
  id: string
  name: string
  color_code: string | null
  unit: string
  current_stock: number
}

interface RecentMovement {
  id: string
  movement_type: 'checkout' | 'return'
  quantity: number
  created_at: string
  note: string | null
  products: { name: string; color_code: string | null; unit: string } | null
  sites: { name: string } | null
}

export function CheckoutPage() {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [productId, setProductId] = useState('')
  const [siteName, setSiteName] = useState('')
  const [movementType, setMovementType] = useState<'checkout' | 'return'>('checkout')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentMovement[]>([])

  const fetchRecent = useCallback(async () => {
    const { data } = await supabase
      .from('checkout_history')
      .select('id, movement_type, quantity, created_at, note, products(name, color_code, unit), sites(name)')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setRecent(data as unknown as RecentMovement[])
  }, [])

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, color_code, unit, current_stock')
      .order('name')
      .then(({ data }) => {
        if (data) setProducts(data)
      })
    supabase
      .from('sites')
      .select('name')
      .order('name')
      .then(({ data }) => {
        if (data) setSites(data.map((s) => s.name))
      })
    fetchRecent()
  }, [fetchRecent])

  const selectedProduct = products.find((p) => p.id === productId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    try {
      const siteId = siteName.trim() ? await getOrCreateSite(siteName) : null
      const { error: rpcError } = await supabase.rpc('record_stock_movement', {
        p_product_id: productId,
        p_site_id: siteId,
        p_movement_type: movementType,
        p_quantity: Number(quantity),
        p_note: note || null,
      })
      if (rpcError) throw rpcError

      setMessage('記録しました')
      setQuantity('1')
      setNote('')
      const { data } = await supabase.from('products').select('id, name, color_code, unit, current_stock').order('name')
      if (data) setProducts(data)
      fetchRecent()
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCsv = () => {
    const headers = ['日時', '区分', '商品名', '色番号', '数量', '単位', '現場', '備考']
    const rows = recent.map((m) => [
      new Date(m.created_at).toLocaleString('ja-JP'),
      m.movement_type === 'checkout' ? '出庫' : '戻庫',
      m.products?.name ?? '',
      m.products?.color_code ?? '',
      m.quantity,
      m.products?.unit ?? '',
      m.sites?.name ?? '',
      m.note ?? '',
    ])
    downloadCsv(`出庫戻庫履歴_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="mb-4 text-lg font-bold text-slate-800">出庫・戻庫</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMovementType('checkout')}
              className={`flex-1 rounded-md py-2 text-sm font-medium ${
                movementType === 'checkout' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              出庫
            </button>
            <button
              type="button"
              onClick={() => setMovementType('return')}
              className={`flex-1 rounded-md py-2 text-sm font-medium ${
                movementType === 'return' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              戻庫
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">材料 *</label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">選択してください</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.color_code ? ` [${p.color_code}]` : ''}(現在庫 {p.current_stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">現場</label>
            <input
              list="site-list"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="既存を選ぶか新規入力"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <datalist id="site-list">
              {sites.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              数量 * {selectedProduct ? `(${selectedProduct.unit})` : ''}
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">備考</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={submitting || !productId}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '記録中...' : '記録する'}
          </button>
        </form>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">最近の履歴</h2>
          <button
            onClick={handleExportCsv}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            CSV出力
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {recent.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <span>
                <span className={m.movement_type === 'checkout' ? 'font-medium text-red-600' : 'font-medium text-green-600'}>
                  {m.movement_type === 'checkout' ? '出庫' : '戻庫'}
                </span>{' '}
                {m.products?.name}
                {m.products?.color_code ? ` [${m.products.color_code}]` : ''} {m.quantity} {m.products?.unit}
                {m.sites?.name ? ` / ${m.sites.name}` : ''}
              </span>
              <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString('ja-JP')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
