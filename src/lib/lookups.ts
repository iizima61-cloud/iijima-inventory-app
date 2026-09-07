import { supabase } from './supabase'

export async function getOrCreateManufacturer(name: string): Promise<string> {
  const trimmed = name.trim()
  const { data: existing } = await supabase
    .from('manufacturers')
    .select('id')
    .eq('name', trimmed)
    .maybeSingle()
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('manufacturers')
    .insert({ name: trimmed })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function getOrCreateSite(name: string): Promise<string> {
  const trimmed = name.trim()
  const { data: existing } = await supabase.from('sites').select('id').eq('name', trimmed).maybeSingle()
  if (existing) return existing.id

  const { data, error } = await supabase.from('sites').insert({ name: trimmed }).select('id').single()
  if (error) throw error
  return data.id
}
