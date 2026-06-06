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
          check_status: string | null
          created_at: string
          gps_hours: number | null
          hourly_rate: number
          hours: number
          id: string
          invoice_id: string
          job_number: string | null
          shift_id: string
          tenant_id: string
          variance_pct: number | null
        }
        Insert: {
          amount: number
          check_status?: string | null
          created_at?: string
          gps_hours?: number | null
          hourly_rate: number
          hours: number
          id?: string
          invoice_id: string
          job_number?: string | null
          shift_id: string
          tenant_id?: string
          variance_pct?: number | null
        }
        Update: {
          amount?: number
          check_status?: string | null
          created_at?: string
          gps_hours?: number | null
          hourly_rate?: number
          hours?: number
          id?: string
          invoice_id?: string
          job_number?: string | null
          shift_id?: string
          tenant_id?: string
          variance_pct?: number | null
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
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          sent_at: string | null
          status: string
          tenant_id: string
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
          sent_at?: string | null
          status?: string
          tenant_id?: string
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
          sent_at?: string | null
          status?: string
          tenant_id?: string
          total_hours?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_pings: {
        Row: {
          accuracy: number | null
          id: number
          latitude: number
          longitude: number
          recorded_at: string
          shift_id: string
          tenant_id: string
          worker_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: number
          latitude: number
          longitude: number
          recorded_at?: string
          shift_id: string
          tenant_id?: string
          worker_id: string
        }
        Update: {
          accuracy?: number | null
          id?: number
          latitude?: number
          longitude?: number
          recorded_at?: string
          shift_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "location_pings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "photo_updates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agreements_accepted_at: string | null
          agreements_version: string | null
          cis_rate: number
          company_address: string | null
          company_name: string | null
          created_at: string
          driving_licence: string | null
          drug_alcohol_policy_accepted_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          qualifications: string[]
          right_to_work: boolean
          tenant_id: string
          trade: string | null
          updated_at: string
          utr_number: string | null
          vehicle_policy_accepted_at: string | null
          worker_ref: string | null
          working_time_optout_accepted_at: string | null
        }
        Insert: {
          agreements_accepted_at?: string | null
          agreements_version?: string | null
          cis_rate?: number
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          driving_licence?: string | null
          drug_alcohol_policy_accepted_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          qualifications?: string[]
          right_to_work?: boolean
          tenant_id?: string
          trade?: string | null
          updated_at?: string
          utr_number?: string | null
          vehicle_policy_accepted_at?: string | null
          worker_ref?: string | null
          working_time_optout_accepted_at?: string | null
        }
        Update: {
          agreements_accepted_at?: string | null
          agreements_version?: string | null
          cis_rate?: number
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          driving_licence?: string | null
          drug_alcohol_policy_accepted_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          qualifications?: string[]
          right_to_work?: boolean
          tenant_id?: string
          trade?: string | null
          updated_at?: string
          utr_number?: string | null
          vehicle_policy_accepted_at?: string | null
          worker_ref?: string | null
          working_time_optout_accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          ended_at: string | null
          hourly_rate: number | null
          id: string
          job_number: string | null
          notes: string | null
          required_qualifications: string[]
          scheduled_end: string | null
          scheduled_start: string
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["shift_status"]
          tenant_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          job_number?: string | null
          notes?: string | null
          required_qualifications?: string[]
          scheduled_end?: string | null
          scheduled_start: string
          site_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          tenant_id?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          job_number?: string | null
          notes?: string | null
          required_qualifications?: string[]
          scheduled_end?: string | null
          scheduled_start?: string
          site_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          tenant_id?: string
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
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
        }
        Insert: {
          address?: string | null
          client_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          tenant_id?: string
        }
        Update: {
          address?: string | null
          client_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string
          contact_email: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string
          slug: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string
          slug: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string
          slug?: string
          updated_at?: string
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
      worker_qualifications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_path: string
          qualification: string
          status: Database["public"]["Enums"]["qualification_status"]
          tenant_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_path: string
          qualification: string
          status?: Database["public"]["Enums"]["qualification_status"]
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_path?: string
          qualification?: string
          status?: Database["public"]["Enums"]["qualification_status"]
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_qualifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      generate_weekly_invoices: {
        Args: { _period_end: string; _period_start: string }
        Returns: number
      }
      gps_hours_for_shift: { Args: { _shift_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "client" | "super_admin"
      qualification_status: "pending" | "verified" | "rejected"
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
      app_role: ["admin", "worker", "client", "super_admin"],
      qualification_status: ["pending", "verified", "rejected"],
      shift_status: ["scheduled", "active", "ended"],
    },
  },
} as const
