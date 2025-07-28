export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          booking_required: boolean
          created_at: string
          description: string | null
          distance: string | null
          id: string
          image: string | null
          is_active: boolean
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          booking_required?: boolean
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          booking_required?: boolean
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          featured_image: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          publish_date: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          category: string
          content: string
          created_at?: string
          featured_image?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          publish_date?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          featured_image?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          publish_date?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_id: string
          check_in: string
          check_out: string
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guests_count: number
          id: string
          notes: string | null
          package_id: string | null
          payment_status: string
          room_type_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          check_in: string
          check_out: string
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_status?: string
          room_type_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          check_in?: string
          check_out?: string
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_status?: string
          room_type_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      daily_menus: {
        Row: {
          chef_notes: string | null
          created_at: string
          desserts: Json | null
          id: string
          is_active: boolean
          mains: Json | null
          menu_date: string
          specials: Json | null
          starters: Json | null
          updated_at: string
        }
        Insert: {
          chef_notes?: string | null
          created_at?: string
          desserts?: Json | null
          id?: string
          is_active?: boolean
          mains?: Json | null
          menu_date: string
          specials?: Json | null
          starters?: Json | null
          updated_at?: string
        }
        Update: {
          chef_notes?: string | null
          created_at?: string
          desserts?: Json | null
          id?: string
          is_active?: boolean
          mains?: Json | null
          menu_date?: string
          specials?: Json | null
          starters?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      footer_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_active: boolean
          section_key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          section_key: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          section_key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          alt_text: string | null
          caption: string | null
          category: string
          category_id: string | null
          created_at: string
          guest_handle: string | null
          guest_name: string | null
          hardcoded_key: string | null
          id: string
          image_url: string
          is_featured: boolean
          is_hardcoded: boolean | null
          likes_count: number | null
          location: string | null
          sort_order: number | null
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          category: string
          category_id?: string | null
          created_at?: string
          guest_handle?: string | null
          guest_name?: string | null
          hardcoded_key?: string | null
          id?: string
          image_url: string
          is_featured?: boolean
          is_hardcoded?: boolean | null
          likes_count?: number | null
          location?: string | null
          sort_order?: number | null
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          category?: string
          category_id?: string | null
          created_at?: string
          guest_handle?: string | null
          guest_name?: string | null
          hardcoded_key?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean
          is_hardcoded?: boolean | null
          likes_count?: number | null
          location?: string | null
          sort_order?: number | null
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gallery_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_reviews: {
        Row: {
          created_at: string
          guest_name: string | null
          id: string
          is_anonymous: boolean
          is_published: boolean
          rating: number
          review_content: string
          stay_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_name?: string | null
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          rating?: number
          review_content: string
          stay_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_name?: string | null
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          rating?: number
          review_content?: string
          stay_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      navigation_items: {
        Row: {
          created_at: string
          href: string
          id: string
          is_active: boolean
          parent_id: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          is_active?: boolean
          parent_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          is_active?: boolean
          parent_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          banner_image: string | null
          created_at: string
          cta_text: string | null
          faqs: Json | null
          id: string
          inclusions: Json | null
          is_active: boolean
          is_featured: boolean
          package_type: string
          subtitle: string | null
          title: string
          updated_at: string
          weekday_price: number
          weekend_price: number
        }
        Insert: {
          banner_image?: string | null
          created_at?: string
          cta_text?: string | null
          faqs?: Json | null
          id?: string
          inclusions?: Json | null
          is_active?: boolean
          is_featured?: boolean
          package_type: string
          subtitle?: string | null
          title: string
          updated_at?: string
          weekday_price?: number
          weekend_price?: number
        }
        Update: {
          banner_image?: string | null
          created_at?: string
          cta_text?: string | null
          faqs?: Json | null
          id?: string
          inclusions?: Json | null
          is_active?: boolean
          is_featured?: boolean
          package_type?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          weekday_price?: number
          weekend_price?: number
        }
        Relationships: []
      }
      room_types: {
        Row: {
          availability_calendar: Json | null
          base_price: number
          created_at: string
          description: string | null
          features: Json | null
          gallery: Json | null
          hero_image: string | null
          id: string
          is_published: boolean
          max_guests: number
          name: string
          seasonal_pricing: Json | null
          updated_at: string
        }
        Insert: {
          availability_calendar?: Json | null
          base_price?: number
          created_at?: string
          description?: string | null
          features?: Json | null
          gallery?: Json | null
          hero_image?: string | null
          id?: string
          is_published?: boolean
          max_guests?: number
          name: string
          seasonal_pricing?: Json | null
          updated_at?: string
        }
        Update: {
          availability_calendar?: Json | null
          base_price?: number
          created_at?: string
          description?: string | null
          features?: Json | null
          gallery?: Json | null
          hero_image?: string | null
          id?: string
          is_published?: boolean
          max_guests?: number
          name?: string
          seasonal_pricing?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      spa_services: {
        Row: {
          booking_required: boolean
          created_at: string
          description: string | null
          duration: number | null
          id: string
          image: string | null
          is_active: boolean
          price: number
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          booking_required?: boolean
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          price?: number
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          booking_required?: boolean
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          price?: number
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          action_type: string
          table_name?: string
          record_id?: string
          old_data?: Json
          new_data?: Json
        }
        Returns: undefined
      }
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
