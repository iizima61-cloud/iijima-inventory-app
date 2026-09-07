import { useEffect, useState, type FormEvent } from 'react'
import { useAppSettings } from '../contexts/AppSettingsContext'

export function SettingsPage() {
  const { name, updateName } = useAppSettings()
  const [value, setValue] = useState(name)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setValue(name), [name])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    try {
      await updateName(value)
      setMessage('保存しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-bold text-slate-800">設定</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">アプリの名前</label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例: 〇〇塗装 在庫管理"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-400">ログイン画面・ヘッダーに表示される名前です。自由に変更できます。</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  )
}
