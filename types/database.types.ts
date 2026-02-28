export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
            foreignKeyName: "customer_merchant_balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merchant_balances_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_merchant_email_prefs: {
        Row: {
          customer_id: string
          merchant_id: string
          opted_out: boolean
        }
        Insert: {
          customer_id: string
          merchant_id: string
          opted_out?: boolean
        }
        Update: {
          customer_id?: string
          merchant_id?: string
          opted_out?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_merchant_email_prefs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merchant_email_prefs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string | null
          email: string
          email_global_opt_out: boolean
          id: string
          referral_code: string | null
          taplo_points: number
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          email_global_opt_out?: boolean
          id?: string
          referral_code?: string | null
          taplo_points?: number
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          email_global_opt_out?: boolean
          id?: string
          referral_code?: string | null
          taplo_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      merchant_point_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          messaging_style: string
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
          messaging_style?: string
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
          messaging_style?: string
          min_redemption_points?: number
          min_spend_cents?: number
          points_per_dollar?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_point_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          auth_user_id: string | null
          business_name: string
          contact_email: string
          created_at: string
          emails_enabled: boolean
          id: string
          logo_url: string | null
          slug: string
          square_access_token: string | null
          square_location_id: string | null
          square_merchant_id: string | null
          square_refresh_token: string | null
          square_token_expires_at: string | null
          status: Database["public"]["Enums"]["merchant_status"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          business_name: string
          contact_email: string
          created_at?: string
          emails_enabled?: boolean
          id?: string
          logo_url?: string | null
          slug: string
          square_access_token?: string | null
          square_location_id?: string | null
          square_merchant_id?: string | null
          square_refresh_token?: string | null
          square_token_expires_at?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          business_name?: string
          contact_email?: string
          created_at?: string
          emails_enabled?: boolean
          id?: string
          logo_url?: string | null
          slug?: string
          square_access_token?: string | null
          square_location_id?: string | null
          square_merchant_id?: string | null
          square_refresh_token?: string | null
          square_token_expires_at?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
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
          transaction_type: Database["public"]["Enums"]["transaction_type"]
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
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          balance_after?: number
          created_at?: string
          customer_id?: string
          id?: string
          merchant_id?: string
          note?: string | null
          points?: number
          redemption_id?: string | null
          related_transaction_id?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_related_transaction_id_fkey"
            columns: ["related_transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          event_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      referral_programs: {
        Row: {
          clawback_on_refund: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_enabled: boolean
          max_referrals_per_customer: number | null
          merchant_id: string
          name: string | null
          purchase_count_required: number
          updated_at: string
        }
        Insert: {
          clawback_on_refund?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_enabled?: boolean
          max_referrals_per_customer?: number | null
          merchant_id: string
          name?: string | null
          purchase_count_required?: number
          updated_at?: string
        }
        Update: {
          clawback_on_refund?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_enabled?: boolean
          max_referrals_per_customer?: number | null
          merchant_id?: string
          name?: string | null
          purchase_count_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_programs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_reward_grants: {
        Row: {
          clawed_back_at: string | null
          customer_id: string
          granted_at: string
          id: string
          merchant_id: string
          merchant_note: string | null
          redeemed_at: string | null
          referral_id: string
          reward_title: string
          reward_type: Database["public"]["Enums"]["referral_reward_type"]
          reward_value: number | null
          role: string
          status: string
        }
        Insert: {
          clawed_back_at?: string | null
          customer_id: string
          granted_at?: string
          id?: string
          merchant_id: string
          merchant_note?: string | null
          redeemed_at?: string | null
          referral_id: string
          reward_title: string
          reward_type: Database["public"]["Enums"]["referral_reward_type"]
          reward_value?: number | null
          role: string
          status?: string
        }
        Update: {
          clawed_back_at?: string | null
          customer_id?: string
          granted_at?: string
          id?: string
          merchant_id?: string
          merchant_note?: string | null
          redeemed_at?: string | null
          referral_id?: string
          reward_title?: string
          reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          reward_value?: number | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_reward_grants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_reward_grants_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_reward_grants_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_spend_tiers: {
        Row: {
          id: string
          min_spend_cents: number
          referee_merchant_points: number
          referee_reward_title: string | null
          referee_reward_type: Database["public"]["Enums"]["referral_reward_type"]
          referee_reward_value: number | null
          referee_taplo_points: number
          referral_program_id: string
          referrer_merchant_points: number
          referrer_reward_title: string | null
          referrer_reward_type: Database["public"]["Enums"]["referral_reward_type"]
          referrer_reward_value: number | null
          referrer_taplo_points: number
        }
        Insert: {
          id?: string
          min_spend_cents?: number
          referee_merchant_points?: number
          referee_reward_title?: string | null
          referee_reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          referee_reward_value?: number | null
          referee_taplo_points?: number
          referral_program_id: string
          referrer_merchant_points?: number
          referrer_reward_title?: string | null
          referrer_reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          referrer_reward_value?: number | null
          referrer_taplo_points?: number
        }
        Update: {
          id?: string
          min_spend_cents?: number
          referee_merchant_points?: number
          referee_reward_title?: string | null
          referee_reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          referee_reward_value?: number | null
          referee_taplo_points?: number
          referral_program_id?: string
          referrer_merchant_points?: number
          referrer_reward_title?: string | null
          referrer_reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          referrer_reward_value?: number | null
          referrer_taplo_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_spend_tiers_referral_program_id_fkey"
            columns: ["referral_program_id"]
            isOneToOne: false
            referencedRelation: "referral_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          first_purchase_cents: number | null
          id: string
          invited_by_merchant: boolean
          merchant_id: string
          purchase_count: number
          referee_email: string
          referee_id: string | null
          referrer_id: string | null
          square_payment_id: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          first_purchase_cents?: number | null
          id?: string
          invited_by_merchant?: boolean
          merchant_id: string
          purchase_count?: number
          referee_email: string
          referee_id?: string | null
          referrer_id?: string | null
          square_payment_id?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          first_purchase_cents?: number | null
          id?: string
          invited_by_merchant?: boolean
          merchant_id?: string
          purchase_count?: number
          referee_email?: string
          referee_id?: string | null
          referrer_id?: string | null
          square_payment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
          created_at?: string
          customer_id?: string
          id?: string
          merchant_id?: string
          merchant_note?: string | null
          points_spent?: number
          redeemed_at?: string | null
          reversed_at?: string | null
          reward_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "rewards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
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
      get_customer_id: { Args: never; Returns: string }
      get_merchant_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
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
      app_role: "customer" | "merchant" | "admin"
      merchant_status: "pending" | "active" | "suspended"
      referral_reward_type: "points" | "item" | "discount_percent" | "discount_flat"
      transaction_type: "earned" | "redeemed" | "reversed" | "admin_correction"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["customer", "merchant", "admin"],
      merchant_status: ["pending", "active", "suspended"],
      referral_reward_type: ["points", "item", "discount_percent", "discount_flat"],
      transaction_type: ["earned", "redeemed", "reversed", "admin_correction"],
    },
  },
} as const
