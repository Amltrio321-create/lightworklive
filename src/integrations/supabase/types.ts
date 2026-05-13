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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          hourly_rate: number
          hours: number
          id: string
          invoice_id: string
          shift_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          hourly_rate: number
          hours: number
          id?: string
          invoice_id: string
          shift_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          hourly_rate?: number
          hours?: number
          id?: string
          invoice_id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: true
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cis_deduction: number
          cis_rate: number
          created_at: string
          gross_amount: number
          id: string
          invoice_number: string
          net_amount: number
          period_end: string
          period_start: string
          status: string
          total_hours: number
          worker_id: string
        }
        Insert: {
          cis_deduction?: number
          cis_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          invoice_number: string
          net_amount?: number
          period_end: string
          period_start: string
          status?: string
          total_hours?: number
          worker_id: string
        }
        Update: {
          cis_deduction?: number
          cis_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          invoice_number?: string
          net_amount?: number
          period_end?: string
          period_start?: string
          status?: string
          total_hours?: number
          worker_id?: string
        }
        Relationships: []
      }
      location_pings: {
        Row: {
          accuracy: number | null
          id: number
          latitude: number
          longitude: number
          recorded_at: string
          shift_id: string
          worker_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: number
          latitude: number
          longitude: number
          recorded_at?: string
          shift_id: string
          worker_id: string
        }
        Update: {
          accuracy?: number | null
          id?: number
          latitude?: number
          longitude?: number
          recorded_at?: string
          shift_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_pings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_updates: {
        Row: {
          caption: string | null
          id: string
          latitude: number | null
          longitude: number | null
          photo_path: string
          shift_id: string
          taken_at: string
          worker_id: string
        }
        Insert: {
          caption?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_path: string
          shift_id: string
          taken_at?: string
          worker_id: string
        }
        Update: {
          caption?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_path?: string
          shift_id?: string
          taken_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_updates_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cis_rate: number
          company_address: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          right_to_work: boolean
          trade: string | null
          updated_at: string
          utr_number: string | null
          worker_ref: string | null
        }
        Insert: {
          cis_rate?: number
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          right_to_work?: boolean
          trade?: string | null
          updated_at?: string
          utr_number?: string | null
          worker_ref?: string | null
        }
        Update: {
          cis_rate?: number
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          right_to_work?: boolean
          trade?: string | null
          updated_at?: string
          utr_number?: string | null
          worker_ref?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          ended_at: string | null
          hourly_rate: number | null
          id: string
          notes: string | null
          scheduled_end: string | null
          scheduled_start: string
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["shift_status"]
          worker_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start: string
          site_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          worker_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string
          site_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          client_id: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          address?: string | null
          client_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          address?: string | null
          client_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      generate_weekly_invoices: {
        Args: { _period_end: string; _period_start: string }
        Returns: number
      }
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_shift_client: {
        Args: { _shift_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "client"
      shift_status: "scheduled" | "active" | "ended"
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
      app_role: ["admin", "worker", "client"],
      shift_status: ["scheduled", "active", "ended"],
    },
  },
} as const
