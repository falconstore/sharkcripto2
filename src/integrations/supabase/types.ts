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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_action_history: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: string | null
          id: string
          target_user_id: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: string | null
          id?: string
          target_user_id: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: string | null
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      arbitrage_opportunities: {
        Row: {
          created_at: string | null
          funding_rate: number | null
          futures_ask_price: number
          futures_bid_price: number | null
          futures_taker_fee: number | null
          futures_volume_24h: number
          id: string
          is_active: boolean | null
          pair_symbol: string
          spot_ask_price: number | null
          spot_bid_price: number
          spot_taker_fee: number | null
          spot_volume_24h: number
          spread_gross_percent: number
          spread_net_percent: number
          spread_net_percent_entrada: number | null
          spread_net_percent_saida: number | null
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          funding_rate?: number | null
          futures_ask_price: number
          futures_bid_price?: number | null
          futures_taker_fee?: number | null
          futures_volume_24h: number
          id?: string
          is_active?: boolean | null
          pair_symbol: string
          spot_ask_price?: number | null
          spot_bid_price: number
          spot_taker_fee?: number | null
          spot_volume_24h: number
          spread_gross_percent: number
          spread_net_percent: number
          spread_net_percent_entrada?: number | null
          spread_net_percent_saida?: number | null
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          funding_rate?: number | null
          futures_ask_price?: number
          futures_bid_price?: number | null
          futures_taker_fee?: number | null
          futures_volume_24h?: number
          id?: string
          is_active?: boolean | null
          pair_symbol?: string
          spot_ask_price?: number | null
          spot_bid_price?: number
          spot_taker_fee?: number | null
          spot_volume_24h?: number
          spread_gross_percent?: number
          spread_net_percent?: number
          spread_net_percent_entrada?: number | null
          spread_net_percent_saida?: number | null
          timestamp?: string | null
        }
        Relationships: []
      }
      bankroll_config: {
        Row: {
          created_at: string | null
          id: string
          initial_balance_usdt: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          initial_balance_usdt?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          initial_balance_usdt?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bankroll_management: {
        Row: {
          amount_usdt: number
          calculation_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          operation_date: string
          operation_type: string
          pair_symbol: string | null
          profit_brl: number | null
          profit_usdt: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_usdt: number
          calculation_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_date?: string
          operation_type: string
          pair_symbol?: string | null
          profit_brl?: number | null
          profit_usdt?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_usdt?: number
          calculation_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operation_date?: string
          operation_type?: string
          pair_symbol?: string | null
          profit_brl?: number | null
          profit_usdt?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bankroll_management_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculation_history"
            referencedColumns: ["id"]
          },
        ]
      }
      calculation_history: {
        Row: {
          created_at: string | null
          entrada_futuro: number
          entrada_spot: number
          exchange_rate: number
          fechamento_futuro: number | null
          fechamento_spot: number | null
          id: string
          lucro_brl: number
          lucro_usd: number
          pair_symbol: string | null
          user_id: string
          valor_investido: number
          var_entrada: number
          var_fechamento: number
          var_total: number
        }
        Insert: {
          created_at?: string | null
          entrada_futuro: number
          entrada_spot: number
          exchange_rate: number
          fechamento_futuro?: number | null
          fechamento_spot?: number | null
          id?: string
          lucro_brl: number
          lucro_usd: number
          pair_symbol?: string | null
          user_id: string
          valor_investido: number
          var_entrada: number
          var_fechamento: number
          var_total: number
        }
        Update: {
          created_at?: string | null
          entrada_futuro?: number
          entrada_spot?: number
          exchange_rate?: number
          fechamento_futuro?: number | null
          fechamento_spot?: number | null
          id?: string
          lucro_brl?: number
          lucro_usd?: number
          pair_symbol?: string | null
          user_id?: string
          valor_investido?: number
          var_entrada?: number
          var_fechamento?: number
          var_total?: number
        }
        Relationships: []
      }
      coin_listings: {
        Row: {
          coin_name: string
          created_at: string | null
          created_by: string | null
          id: string
          listing_type: string
          notified: boolean | null
          pair_symbol: string
          scheduled_date: string
          updated_at: string | null
        }
        Insert: {
          coin_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          listing_type: string
          notified?: boolean | null
          pair_symbol: string
          scheduled_date: string
          updated_at?: string | null
        }
        Update: {
          coin_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          listing_type?: string
          notified?: boolean | null
          pair_symbol?: string
          scheduled_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crossing_cooldowns: {
        Row: {
          last_crossing_at: string
          pair_symbol: string
        }
        Insert: {
          last_crossing_at?: string
          pair_symbol: string
        }
        Update: {
          last_crossing_at?: string
          pair_symbol?: string
        }
        Relationships: []
      }
      crossing_cooldowns_entrada: {
        Row: {
          last_crossing_at: string
          pair_symbol: string
        }
        Insert: {
          last_crossing_at?: string
          pair_symbol: string
        }
        Update: {
          last_crossing_at?: string
          pair_symbol?: string
        }
        Relationships: []
      }
      discord_channel_activity: {
        Row: {
          activity_date: string | null
          activity_type: string
          channel_id: string
          created_at: string | null
          discord_avatar: string | null
          discord_user_id: string
          discord_username: string
          guild_id: string
          id: string
          message_id: string | null
        }
        Insert: {
          activity_date?: string | null
          activity_type: string
          channel_id: string
          created_at?: string | null
          discord_avatar?: string | null
          discord_user_id: string
          discord_username: string
          guild_id: string
          id?: string
          message_id?: string | null
        }
        Update: {
          activity_date?: string | null
          activity_type?: string
          channel_id?: string
          created_at?: string | null
          discord_avatar?: string | null
          discord_user_id?: string
          discord_username?: string
          guild_id?: string
          id?: string
          message_id?: string | null
        }
        Relationships: []
      }
      discord_sync_config: {
        Row: {
          channel_id: string
          channel_name: string | null
          created_at: string | null
          guild_id: string
          id: string
          last_message_id: string | null
          last_sync_at: string | null
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          channel_name?: string | null
          created_at?: string | null
          guild_id: string
          id?: string
          last_message_id?: string | null
          last_sync_at?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          channel_name?: string | null
          created_at?: string | null
          guild_id?: string
          id?: string
          last_message_id?: string | null
          last_sync_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mexc_operations: {
        Row: {
          created_at: string
          error_message: string | null
          futures_order_id: string | null
          futures_price: number
          id: string
          operation_type: string
          pair_symbol: string
          quantity: number
          simulation: boolean
          spot_order_id: string | null
          spot_price: number
          spread_percent: number
          status: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          futures_order_id?: string | null
          futures_price: number
          id?: string
          operation_type: string
          pair_symbol: string
          quantity: number
          simulation?: boolean
          spot_order_id?: string | null
          spot_price: number
          spread_percent: number
          status?: string
          total_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          futures_order_id?: string | null
          futures_price?: number
          id?: string
          operation_type?: string
          pair_symbol?: string
          quantity?: number
          simulation?: boolean
          spot_order_id?: string | null
          spot_price?: number
          spread_percent?: number
          status?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pair_crossings: {
        Row: {
          created_at: string | null
          id: string
          pair_symbol: string
          spread_net_percent_saida: number
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pair_symbol: string
          spread_net_percent_saida: number
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pair_symbol?: string
          spread_net_percent_saida?: number
          timestamp?: string
        }
        Relationships: []
      }
      pair_crossings_entrada: {
        Row: {
          created_at: string | null
          id: string
          pair_symbol: string
          spread_net_percent_entrada: number
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pair_symbol: string
          spread_net_percent_entrada: number
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pair_symbol?: string
          spread_net_percent_entrada?: number
          timestamp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spread_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          pair_symbol: string
          target_spread: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pair_symbol: string
          target_spread: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pair_symbol?: string
          target_spread?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spread_history: {
        Row: {
          created_at: string | null
          id: string
          pair_symbol: string
          spread_entrada: number
          spread_saida: number
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pair_symbol: string
          spread_entrada: number
          spread_saida: number
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pair_symbol?: string
          spread_entrada?: number
          spread_saida?: number
          timestamp?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          min_spread_percent: number
          min_volume_usdt: number | null
          pair_symbol: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          min_spread_percent: number
          min_volume_usdt?: number | null
          pair_symbol: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          min_spread_percent?: number
          min_volume_usdt?: number | null
          pair_symbol?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_calculators: {
        Row: {
          calculator_id: string
          created_at: string | null
          entrada_futuro: string | null
          entrada_spot: string | null
          fechamento_futuro: string | null
          fechamento_spot: string | null
          id: string
          order_index: number | null
          profit_threshold_percent: number | null
          selected_pair: string | null
          tracking_active: boolean | null
          updated_at: string | null
          user_id: string
          valor_investido: string | null
        }
        Insert: {
          calculator_id: string
          created_at?: string | null
          entrada_futuro?: string | null
          entrada_spot?: string | null
          fechamento_futuro?: string | null
          fechamento_spot?: string | null
          id?: string
          order_index?: number | null
          profit_threshold_percent?: number | null
          selected_pair?: string | null
          tracking_active?: boolean | null
          updated_at?: string | null
          user_id: string
          valor_investido?: string | null
        }
        Update: {
          calculator_id?: string
          created_at?: string | null
          entrada_futuro?: string | null
          entrada_spot?: string | null
          fechamento_futuro?: string | null
          fechamento_spot?: string | null
          id?: string
          order_index?: number | null
          profit_threshold_percent?: number | null
          selected_pair?: string | null
          tracking_active?: boolean | null
          updated_at?: string | null
          user_id?: string
          valor_investido?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
