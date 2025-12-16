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
      admin_users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          excerpt: string
          id: string
          image_url: string | null
          published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          excerpt: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          notes: string | null
          phone: string
          total_events: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          total_events?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          total_events?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_images: {
        Row: {
          caption: string | null
          created_at: string | null
          event_id: string | null
          id: string
          image_url: string
          order_index: number | null
          thumbnail_url: string | null
          is_public: boolean // ✅ Agregado (asumimos NOT NULL por el default true)
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          image_url: string
          order_index?: number | null
          thumbnail_url?: string | null
          is_public?: boolean // ✅ Agregado (Opcional en insert porque tiene default)
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          image_url?: string
          order_index?: number | null
          thumbnail_url?: string | null
          is_public?: boolean // ✅ Agregado (Opcional en update)
        }
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payments: {
        Row: {
          id: string
          event_id: string
          quote_id: string | null
          amount: number
          payment_date: string
          payment_method: string | null
          is_deposit: boolean | null
          proof_url: string | null
          notes: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          quote_id?: string | null
          amount: number
          payment_date?: string
          payment_method?: string | null
          is_deposit?: boolean | null
          proof_url?: string | null
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          quote_id?: string | null
          amount?: number
          payment_date?: string
          payment_method?: string | null
          is_deposit?: boolean | null
          proof_url?: string | null
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          }
        ]
      },
      events: {
        Row: {
          balance_due: number | null
          client_id: string | null
          cocktails_selected: string[] | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          deposit_paid: number | null
          event_date: string
          event_time: string | null
          event_type: string
          guest_count: number
          id: string
          notes: string | null
          package_id: string | null
          quote_id: string | null
          service_ids: string[] | null
          special_requests: string | null
          status: string
          total_price: number
          updated_at: string | null
          venue: string | null
          venue_address: string | null
          venue_district: string | null
        }
        Insert: {
          balance_due?: number | null
          client_id?: string | null
          cocktails_selected?: string[] | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deposit_paid?: number | null
          event_date: string
          event_time?: string | null
          event_type: string
          guest_count: number
          id?: string
          notes?: string | null
          package_id?: string | null
          quote_id?: string | null
          service_ids?: string[] | null
          special_requests?: string | null
          status?: string
          total_price: number
          updated_at?: string | null
          venue?: string | null
          venue_address?: string | null
          venue_district?: string | null
        }
        Update: {
          balance_due?: number | null
          client_id?: string | null
          cocktails_selected?: string[] | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deposit_paid?: number | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          guest_count?: number
          id?: string
          notes?: string | null
          package_id?: string | null
          quote_id?: string | null
          service_ids?: string[] | null
          special_requests?: string | null
          status?: string
          total_price?: number
          updated_at?: string | null
          venue?: string | null
          venue_address?: string | null
          venue_district?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category: 'insumos' | 'personal' | 'marketing' | 'otros'
          date: string
          event_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          category: 'insumos' | 'personal' | 'marketing' | 'otros'
          date?: string
          event_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          category?: 'insumos' | 'personal' | 'marketing' | 'otros'
          date?: string
          event_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      },
      packages: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string
          duration: number
          features: string[]
          guest_range: string
          id: string
          name: string
          order_index: number | null
          popular: boolean | null
          price: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description: string
          duration: number
          features: string[]
          guest_range: string
          id?: string
          name: string
          order_index?: number | null
          popular?: boolean | null
          price: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string
          duration?: number
          features?: string[]
          guest_range?: string
          id?: string
          name?: string
          order_index?: number | null
          popular?: boolean | null
          price?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          admin_notes: string | null
          client_email: string
          client_id: string | null
          client_name: string
          client_phone: string
          contacted_at: string | null
          converted_at: string | null
          created_at: string | null
          estimated_price: number | null
          event_date: string
          event_type: string
          guest_count: number
          id: string
          message: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          client_email: string
          client_id?: string | null
          client_name: string
          client_phone: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          estimated_price?: number | null
          event_date: string
          event_type: string
          guest_count: number
          id?: string
          message?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          client_email?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          estimated_price?: number | null
          event_date?: string
          event_type?: string
          guest_count?: number
          id?: string
          message?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string
          features: string[]
          icon: string | null
          id: string
          image_url: string | null
          long_description: string | null
          name: string
          order_index: number | null
          price_from: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description: string
          features: string[]
          icon?: string | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          name: string
          order_index?: number | null
          price_from: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string
          features?: string[]
          icon?: string | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          name?: string
          order_index?: number | null
          price_from?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          approved: boolean | null
          client_company: string | null
          client_name: string
          comment: string
          created_at: string | null
          event_type: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          rating: number
        }
        Insert: {
          approved?: boolean | null
          client_company?: string | null
          client_name: string
          comment: string
          created_at?: string | null
          event_type?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          rating: number
        }
        Update: {
          approved?: boolean | null
          client_company?: string | null
          client_name?: string
          comment?: string
          created_at?: string | null
          event_type?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          rating?: number
        }
        Relationships: []
      }
      team_tasks: {
        Row: {
          content: string
          created_at: string | null
          id: string
          priority: string
          status: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          priority?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          priority?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
