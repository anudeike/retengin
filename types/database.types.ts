/**
 * Supabase database types.
 *
 * Regenerate after schema changes:
 *   npx supabase gen types typescript --local > types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_merchant_balances: {
        Row: {
          balance: number
          customer_id: string
          id: string
          merchant_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          customer_id: string
          id?: string
          merchant_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          customer_id?: string
          id?: string
          merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cmb_unique'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmb_unique'
            columns: ['merchant_id']
            isOneToOne: false
            referencedRelation: 'merchants'
            referencedColumns: ['id']
          },
        ]
      }
      merchant_point_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          min_redemption_points: number
          min_spend_cents: number
          points_per_dollar: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id: string
          min_redemption_points?: number
          min_spend_cents?: number
          points_per_dollar?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          min_redemption_points?: number
          min_spend_cents?: number
          points_per_dollar?: number
          updated_at?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          auth_user_id: string | null
          business_name: string
          contact_email: string
          created_at: string
          id: string
          logo_url: string | null
          slug: string
          square_access_token: string | null
          square_location_id: string | null
          square_merchant_id: string | null
          square_refresh_token: string | null
          square_token_expires_at: string | null
          status: Database['public']['Enums']['merchant_status']
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          business_name: string
          contact_email: string
          created_at?: string
          id?: string
          logo_url?: string | null
          slug: string
          square_access_token?: string | null
          square_location_id?: string | null
          square_merchant_id?: string | null
          square_refresh_token?: string | null
          square_token_expires_at?: string | null
          status?: Database['public']['Enums']['merchant_status']
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          business_name?: string
          contact_email?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          slug?: string
          square_access_token?: string | null
          square_location_id?: string | null
          square_merchant_id?: string | null
          square_refresh_token?: string | null
          square_token_expires_at?: string | null
          status?: Database['public']['Enums']['merchant_status']
          updated_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          balance_after: number
          created_at: string
          customer_id: string
          id: string
          merchant_id: string
          note: string | null
          points: number
          redemption_id: string | null
          related_transaction_id: string | null
          square_order_id: string | null
          square_payment_id: string | null
          transaction_type: Database['public']['Enums']['transaction_type']
        }
        Insert: {
          balance_after: number
          created_at?: string
          customer_id: string
          id?: string
          merchant_id: string
          note?: string | null
          points: number
          redemption_id?: string | null
          related_transaction_id?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          transaction_type: Database['public']['Enums']['transaction_type']
        }
        Update: never
        Relationships: []
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          processed_at?: string
        }
        Update: never
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          merchant_id: string
          merchant_note: string | null
          points_spent: number
          redeemed_at: string | null
          reversed_at: string | null
          reward_id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          merchant_id: string
          merchant_note?: string | null
          points_spent: number
          redeemed_at?: string | null
          reversed_at?: string | null
          reward_id: string
          status?: string
        }
        Update: {
          merchant_note?: string | null
          reversed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          merchant_id: string
          name: string
          points_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_id: string
          name: string
          points_required: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string
          name?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database['public']['Enums']['app_role']
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['app_role']
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['app_role']
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      admin_correct_points: {
        Args: {
          p_customer_id: string
          p_delta: number
          p_merchant_id: string
          p_note: string
        }
        Returns: undefined
      }
      award_points: {
        Args: {
          p_customer_id: string
          p_merchant_id: string
          p_points: number
          p_square_order_id?: string
          p_square_payment_id: string
        }
        Returns: undefined
      }
      get_customer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_merchant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['app_role']
      }
      redeem_points: {
        Args: {
          p_customer_id: string
          p_merchant_id: string
          p_points: number
          p_reward_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: 'admin' | 'customer' | 'merchant'
      merchant_status: 'active' | 'pending' | 'suspended'
      transaction_type: 'admin_correction' | 'earned' | 'redeemed' | 'reversed'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
