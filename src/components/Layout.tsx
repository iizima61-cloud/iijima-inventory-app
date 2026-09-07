import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAppSettings } from '../contexts/AppSettingsContext'

const navItems = [
  { to: '/', label: '在庫一覧' },
  { to: '/products/new', label: '商品登録' },
  { to: '/checkout', label: '出庫・戻庫' },
  { to: '/inventory-count', label: '棚卸' },
  { to: '/settings', label: '設定' },
]

export function Layout() {
  const { signOut } = useAuth()
  const { name } = useAppSettings()
  const [menuOpen, setMenuOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-bold text-slate-800">{name}</span>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={signOut}
              className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              ログアウト
            </button>
          </nav>

          <button
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="メニュー"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-2 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={signOut}
              className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              ログアウト
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
