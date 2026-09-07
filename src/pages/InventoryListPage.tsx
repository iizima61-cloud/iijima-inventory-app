import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ProductThumbnail } from '../components/ProductThumbnail'
import { toCsv, downloadCsv } from '../lib/csv'
import { CATEGORIES, normalizeCategory } from '../lib/categories'

interface ProductRow {
  id: string
  name: string
  code: string | null
  color_code: string | null
  swatch_color: string | null
  category: string | null
  location: string | null
  unit: string
  standard_stock: number
  current_stock: number
  manufacturer_id: string | null
  manufacturers: { name: string } | null
  photos: { storage_path: string; created_at: string }[]
}

type View = 'category' | 'manufacturer' | 'products'

export function InventoryListPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('category')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, code, color_code, swatch_color, category, location, unit, standard_stock, current_stock, manufacturer_id, manufacturers(name), photos(storage_path, created_at)',
      )
      .order('name')
    if (!error && data) setProducts(data as unknown as ProductRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()

    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProducts])

  const isSearching = search.trim().length > 0

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = search.trim().toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q) ||
        (p.color_code ?? '').toLowerCase().includes(q) ||
        (p.manufacturers?.name ?? '').toLowerCase().includes(q),
    )
  }, [products, search, isSearching])

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      const key = normalizeCategory(p.category)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [products])

  const categoryList = useMemo(() => {
    const extras = [...categoryCounts.keys()].filter((c) => !(CATEGORIES as readonly string[]).includes(c))
    return [...CATEGORIES, ...extras.sort((a, b) => a.localeCompare(b, 'ja'))]
  }, [categoryCounts])

  const productsInCategory = useMemo(() => {
    if (!selectedCategory) return []
    return products.filter((p) => normalizeCategory(p.category) === selectedCategory)
  }, [products, selectedCategory])

  const manufacturerGroups = useMemo(() => {
    const map = new Map<string, ProductRow[]>()
    for (const p of productsInCategory) {
      const key = p.manufacturers?.name ?? '未設定'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ja'))
  }, [productsInCategory])

  const productsInManufacturer = useMemo(() => {
    if (!selectedManufacturer) return []
    return productsInCategory.filter((p) => (p.manufacturers?.name ?? '未設定') === selectedManufacturer)
  }, [productsInCategory, selectedManufacturer])

  const openCategory = (category: string) => {
    setSelectedCategory(category)
    setSelectedManufacturer(null)
    setView('manufacturer')
  }

  const openManufacturer = (manufacturer: string) => {
    setSelectedManufacturer(manufacturer)
    setView('products')
  }

  const goBack = () => {
    if (view === 'products') {
      setSelectedManufacturer(null)
      setView('manufacturer')
    } else if (view === 'manufacturer') {
      setSelectedCategory(null)
      setView('category')
    }
  }

  const handleExportCsv = (rows: ProductRow[], filenamePrefix: string) => {
    const headers = ['カテゴリー', 'メーカー', '商品名', '型番', '色番号', '保管場所', '単位', '基準在庫', '現在在庫']
    const csvRows = rows.map((p) => [
      normalizeCategory(p.category),
      p.manufacturers?.name ?? '',
      p.name,
      p.code ?? '',
      p.color_code ?? '',
      p.location ?? '',
      p.unit,
      p.standard_stock,
      p.current_stock,
    ])
    downloadCsv(`${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, csvRows))
  }

  const renderProductRow = (p: ProductRow) => {
    const latestPhoto = [...p.photos].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    const low = p.current_stock < p.standard_stock
    return (
      <Link
        key={p.id}
        to={`/products/${p.id}`}
        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm"
      >
        <ProductThumbnail path={latestPhoto?.storage_path ?? null} alt={p.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{p.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            {p.color_code && (
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-slate-300"
                style={{ backgroundColor: p.swatch_color ?? '#e5e7eb' }}
                title={p.swatch_color ? undefined : '色未設定(編集画面から設定できます)'}
              />
            )}
            <span className="truncate">{[p.code, p.color_code].filter(Boolean).join(' / ')}</span>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-bold ${low ? 'text-red-600' : 'text-slate-800'}`}>
            {p.current_stock} {p.unit}
          </p>
          <p className="text-xs text-slate-400">
            基準 {p.standard_stock} {p.unit}
          </p>
          {p.location && (
            <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {p.location}
            </span>
          )}
        </div>
      </Link>
    )
  }

  if (loading) {
    return <p className="text-slate-500">読み込み中...</p>
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-slate-800">在庫一覧</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="商品名・型番・色番号・メーカーで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-64"
          />
          <button
            onClick={() => handleExportCsv(products, '在庫一覧_全体')}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            全体CSV
          </button>
        </div>
      </div>

      {isSearching ? (
        <div>
          <p className="mb-2 text-sm text-slate-500">「{search}」の検索結果: {searchResults.length}件</p>
          <div className="flex flex-col gap-2">{searchResults.map(renderProductRow)}</div>
        </div>
      ) : (
        <>
          {view !== 'category' && (
            <button onClick={goBack} className="mb-3 text-sm text-blue-600 hover:underline">
              ← {view === 'products' ? 'メーカー一覧' : 'カテゴリー一覧'}に戻る
            </button>
          )}

          {view === 'category' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categoryList.map((category) => (
                <button
                  key={category}
                  onClick={() => openCategory(category)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm"
                >
                  <span className="text-base font-semibold text-slate-800">{category}</span>
                  <span className="text-sm text-slate-400">{categoryCounts.get(category) ?? 0}件</span>
                </button>
              ))}
              {products.length === 0 && <p className="text-slate-500">商品が登録されていません。</p>}
            </div>
          )}

          {view === 'manufacturer' && selectedCategory && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-700">{selectedCategory}</h2>
                <button
                  onClick={() => handleExportCsv(productsInCategory, `在庫一覧_${selectedCategory}`)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  CSV出力
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {manufacturerGroups.map(([manufacturer, items]) => (
                  <button
                    key={manufacturer}
                    onClick={() => openManufacturer(manufacturer)}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm"
                  >
                    <span className="font-medium text-slate-800">{manufacturer}</span>
                    <span className="text-sm text-slate-400">{items.length}件</span>
                  </button>
                ))}
                {manufacturerGroups.length === 0 && <p className="text-slate-500">商品がありません。</p>}
              </div>
            </div>
          )}

          {view === 'products' && selectedManufacturer && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-700">
                  {selectedCategory} / {selectedManufacturer}
                </h2>
                <button
                  onClick={() => handleExportCsv(productsInManufacturer, `在庫一覧_${selectedManufacturer}`)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  CSV出力
                </button>
              </div>
              <div className="flex flex-col gap-2">{productsInManufacturer.map(renderProductRow)}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
