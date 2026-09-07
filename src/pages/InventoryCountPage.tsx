import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { toCsv, downloadCsv } from '../lib/csv'

interface ProductRow {
  id: string
  name: string
  color_code: string | null
  unit: string
  current_stock: number
  manufacturers: { name: string } | null
}

export function InventoryCountPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, color_code, unit, current_stock, manufacturers(name)')
      .order('name')
    if (data) setProducts(data as unknown as ProductRow[])
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSave = async (product: ProductRow) => {
    const raw = counts[product.id]
    if (raw === undefined || raw === '') return
    setError(null)
    setSavingId(product.id)
    try {
      const { error: rpcError } = await supabase.rpc('record_inventory_count', {
        p_product_id: product.id,
        p_counted_quantity: Number(raw),
        p_note: null,
      })
      if (rpcError) throw rpcError
      setSavedIds((prev) => new Set(prev).add(product.id))
      fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました')
    } finally {
      setSavingId(null)
    }
  }

  const handleExportCsv = () => {
    const headers = ['メーカー', '商品名', '色番号', '単位', '理論在庫', '実棚卸数', '差異']
    const rows = products.map((p) => {
      const counted = counts[p.id]
      const diff = counted !== undefined && counted !== '' ? Number(counted) - p.current_stock : ''
      return [p.manufacturers?.name ?? '', p.name, p.color_code ?? '', p.unit, p.current_stock, counted ?? '', diff]
    })
    downloadCsv(`棚卸_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">棚卸</h1>
        <button
          onClick={handleExportCsv}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          CSV出力
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-3 py-2 font-medium">商品名</th>
              <th className="px-3 py-2 font-medium">理論在庫</th>
              <th className="px-3 py-2 font-medium">実数</th>
              <th className="px-3 py-2 font-medium">差異</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const raw = counts[p.id] ?? ''
              const diff = raw !== '' ? Number(raw) - p.current_stock : null
              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {[p.manufacturers?.name, p.color_code].filter(Boolean).join(' / ')}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {p.current_stock} {p.unit}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={raw}
                      onChange={(e) =>
                        setCounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      className="w-24 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className={`px-3 py-2 font-medium ${diff && diff !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {diff === null ? '-' : diff}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleSave(p)}
                      disabled={raw === '' || savingId === p.id}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      {savingId === p.id ? '記録中' : savedIds.has(p.id) ? '再記録' : '記録'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
