// 手動管理のDB型定義。schema.sql を変更したらあわせて更新すること。
// 将来的に `supabase gen types typescript` への置き換えを推奨。

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id: string; name: string; created_at?: string }
        Update: { id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      manufacturers: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      sites: {
        Row: { id: string; name: string; address: string | null; note: string | null; created_at: string }
        Insert: { id?: string; name: string; address?: string | null; note?: string | null; created_at?: string }
        Update: { id?: string; name?: string; address?: string | null; note?: string | null; created_at?: string }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          manufacturer_id: string | null
          name: string
          code: string | null
          color_code: string | null
          swatch_color: string | null
          category: string | null
          location: string | null
          unit: string
          standard_stock: number
          current_stock: number
          note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          manufacturer_id?: string | null
          name: string
          code?: string | null
          color_code?: string | null
          swatch_color?: string | null
          category?: string | null
          location?: string | null
          unit?: string
          standard_stock?: number
          current_stock?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          manufacturer_id?: string | null
          name?: string
          code?: string | null
          color_code?: string | null
          swatch_color?: string | null
          category?: string | null
          location?: string | null
          unit?: string
          standard_stock?: number
          current_stock?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_manufacturer_id_fkey'
            columns: ['manufacturer_id']
            isOneToOne: false
            referencedRelation: 'manufacturers'
            referencedColumns: ['id']
          },
        ]
      }
      photos: {
        Row: { id: string; product_id: string; storage_path: string; created_by: string | null; created_at: string }
        Insert: { id?: string; product_id: string; storage_path: string; created_by?: string | null; created_at?: string }
        Update: { id?: string; product_id?: string; storage_path?: string; created_by?: string | null; created_at?: string }
        Relationships: [
          {
            foreignKeyName: 'photos_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      checkout_history: {
        Row: {
          id: string
          product_id: string
          site_id: string | null
          movement_type: 'checkout' | 'return'
          quantity: number
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          site_id?: string | null
          movement_type: 'checkout' | 'return'
          quantity: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          site_id?: string | null
          movement_type?: 'checkout' | 'return'
          quantity?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'checkout_history_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'checkout_history_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_log: {
        Row: {
          id: string
          product_id: string
          system_quantity: number
          counted_quantity: number
          diff: number
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          system_quantity: number
          counted_quantity: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          system_quantity?: number
          counted_quantity?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_log_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      app_settings: {
        Row: { id: boolean; name: string }
        Insert: { id?: boolean; name?: string }
        Update: { id?: boolean; name?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      record_stock_movement: {
        Args: {
          p_product_id: string
          p_site_id: string | null
          p_movement_type: 'checkout' | 'return'
          p_quantity: number
          p_note?: string | null
        }
        Returns: undefined
      }
      record_inventory_count: {
        Args: {
          p_product_id: string
          p_counted_quantity: number
          p_note?: string | null
        }
        Returns: undefined
      }
    }
  }
}
