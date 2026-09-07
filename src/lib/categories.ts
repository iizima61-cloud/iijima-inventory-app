export const CATEGORIES = ['塗装材料', '防水材料'] as const
export const UNCATEGORIZED = '未分類'

export function normalizeCategory(category: string | null): string {
  return category && category.trim() ? category : UNCATEGORIZED
}
