import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_NAME = '在庫管理'

interface AppSettingsContextValue {
  name: string
  loading: boolean
  updateName: (name: string) => Promise<void>
}

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState(DEFAULT_NAME)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('name')
      .eq('id', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setName(data.name)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    document.title = name
  }, [name])

  const updateName = async (newName: string) => {
    const trimmed = newName.trim() || DEFAULT_NAME
    const { error } = await supabase.from('app_settings').update({ name: trimmed }).eq('id', true)
    if (error) throw error
    setName(trimmed)
  }

  return (
    <AppSettingsContext.Provider value={{ name, loading, updateName }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext)
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider')
  return ctx
}
