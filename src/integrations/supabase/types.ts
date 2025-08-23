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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_tags: Json | null
          audience_tags: Json | null
          available_days: Json | null
          available_seasons: Json | null
          booking_required: boolean
          booking_type: string | null
          created_at: string
          description: string | null
          disclaimer: string | null
          distance: string | null
          duration_hours: number | null
          duration_minutes: number | null
          id: string
          image: string | null
          is_active: boolean
          is_on_property: boolean | null
          location_name: string | null
          media_urls: Json | null
          price_amount: number | null
          price_range_max: number | null
          price_range_min: number | null
          price_type: string | null
          rules_regulations: string | null
          tags: Json | null
          timings: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_tags?: Json | null
          audience_tags?: Json | null
          available_days?: Json | null
          available_seasons?: Json | null
          booking_required?: boolean
          booking_type?: string | null
          created_at?: string
          description?: string | null
          disclaimer?: string | null
          distance?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          is_on_property?: boolean | null
          location_name?: string | null
          media_urls?: Json | null
          price_amount?: number | null
          price_range_max?: number | null
          price_range_min?: number | null
          price_type?: string | null
          rules_regulations?: string | null
          tags?: Json | null
          timings?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_tags?: Json | null
          audience_tags?: Json | null
          available_days?: Json | null
          available_seasons?: Json | null
          booking_required?: boolean
          booking_type?: string | null
          created_at?: string
          description?: string | null
          disclaimer?: string | null
          distance?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          is_on_property?: boolean | null
          location_name?: string | null
          media_urls?: Json | null
          price_amount?: number | null
          price_range_max?: number | null
          price_range_min?: number | null
          price_type?: string | null
          rules_regulations?: string | null
          tags?: Json | null
          timings?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      addons: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
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
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          role: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by: string
          role: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: string
          updated_at?: string
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
      api_integration_secrets: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          key: string
          updated_at: string
          value_encrypted: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          key: string
          updated_at?: string
          value_encrypted: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          key?: string
          updated_at?: string
          value_encrypted?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_integration_secrets_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          category: string
          config_keys: Json
          created_at: string
          description: string | null
          id: string
          integration_key: string
          is_enabled: boolean
          last_verified_at: string | null
          name: string
          public_config: Json
          secret_keys: Json
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          config_keys?: Json
          created_at?: string
          description?: string | null
          id?: string
          integration_key: string
          is_enabled?: boolean
          last_verified_at?: string | null
          name: string
          public_config?: Json
          secret_keys?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          config_keys?: Json
          created_at?: string
          description?: string | null
          id?: string
          integration_key?: string
          is_enabled?: boolean
          last_verified_at?: string | null
          name?: string
          public_config?: Json
          secret_keys?: Json
          status?: string
          updated_at?: string
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
      booking_waitlist: {
        Row: {
          alternative_date_range_end: string | null
          alternative_date_range_start: string | null
          check_in: string
          check_out: string
          created_at: string
          expires_at: string | null
          flexible_dates: boolean | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guests_count: number
          id: string
          max_price_willing: number | null
          notify_email: boolean | null
          notify_sms: boolean | null
          original_booking_attempt_id: string | null
          preferred_room_unit_id: string | null
          priority_score: number | null
          room_type_id: string | null
          special_requests: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alternative_date_range_end?: string | null
          alternative_date_range_start?: string | null
          check_in: string
          check_out: string
          created_at?: string
          expires_at?: string | null
          flexible_dates?: boolean | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          max_price_willing?: number | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          original_booking_attempt_id?: string | null
          preferred_room_unit_id?: string | null
          priority_score?: number | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alternative_date_range_end?: string | null
          alternative_date_range_start?: string | null
          check_in?: string
          check_out?: string
          created_at?: string
          expires_at?: string | null
          flexible_dates?: boolean | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          max_price_willing?: number | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          original_booking_attempt_id?: string | null
          preferred_room_unit_id?: string | null
          priority_score?: number | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_waitlist_preferred_room_unit_id_fkey"
            columns: ["preferred_room_unit_id"]
            isOneToOne: false
            referencedRelation: "room_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_id: string
          check_in: string
          check_out: string
          created_at: string
          guest_email: string | null
          guest_id: string | null
          guest_name: string
          guest_phone: string | null
          guests_count: number
          id: string
          notes: string | null
          package_id: string | null
          payment_id: string | null
          payment_method: string | null
          payment_order_id: string | null
          payment_status: string
          room_type_id: string | null
          room_unit_id: string | null
          selected_activities: Json | null
          selected_bedding: Json | null
          selected_meals: Json | null
          selected_spa_services: Json | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          check_in: string
          check_out: string
          created_at?: string
          guest_email?: string | null
          guest_id?: string | null
          guest_name: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_order_id?: string | null
          payment_status?: string
          room_type_id?: string | null
          room_unit_id?: string | null
          selected_activities?: Json | null
          selected_bedding?: Json | null
          selected_meals?: Json | null
          selected_spa_services?: Json | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          check_in?: string
          check_out?: string
          created_at?: string
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_order_id?: string | null
          payment_status?: string
          room_type_id?: string | null
          room_unit_id?: string | null
          selected_activities?: Json | null
          selected_bedding?: Json | null
          selected_meals?: Json | null
          selected_spa_services?: Json | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "bookings_room_unit_id_fkey"
            columns: ["room_unit_id"]
            isOneToOne: false
            referencedRelation: "room_units"
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
      guest_credit_notes: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          expires_at: string
          guest_id: string
          id: string
          is_redeemed: boolean
          original_booking_id: string | null
          reason: string
          redeemed_amount: number | null
          redeemed_at: string | null
          redeemed_booking_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          expires_at: string
          guest_id: string
          id?: string
          is_redeemed?: boolean
          original_booking_id?: string | null
          reason: string
          redeemed_amount?: number | null
          redeemed_at?: string | null
          redeemed_booking_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string
          guest_id?: string
          id?: string
          is_redeemed?: boolean
          original_booking_id?: string | null
          reason?: string
          redeemed_amount?: number | null
          redeemed_at?: string | null
          redeemed_booking_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_credit_notes_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_credit_notes_original_booking_id_fkey"
            columns: ["original_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_credit_notes_redeemed_booking_id_fkey"
            columns: ["redeemed_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_identity_documents: {
        Row: {
          created_at: string
          document_image_url: string | null
          document_number: string
          document_type: string
          expiry_date: string | null
          guest_id: string
          id: string
          is_verified: boolean
          notes: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_image_url?: string | null
          document_number: string
          document_type: string
          expiry_date?: string | null
          guest_id: string
          id?: string
          is_verified?: boolean
          notes?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_image_url?: string | null
          document_number?: string
          document_type?: string
          expiry_date?: string | null
          guest_id?: string
          id?: string
          is_verified?: boolean
          notes?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_identity_documents_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
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
      guests: {
        Row: {
          address: string | null
          blacklist_reason: string | null
          contact_emails: Json | null
          contact_phones: Json | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          id: string
          is_blacklisted: boolean
          last_name: string
          nationality: string | null
          phone: string | null
          special_requirements: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          blacklist_reason?: string | null
          contact_emails?: Json | null
          contact_phones?: Json | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          id?: string
          is_blacklisted?: boolean
          last_name: string
          nationality?: string | null
          phone?: string | null
          special_requirements?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          blacklist_reason?: string | null
          contact_emails?: Json | null
          contact_phones?: Json | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          id?: string
          is_blacklisted?: boolean
          last_name?: string
          nationality?: string | null
          phone?: string | null
          special_requirements?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          booking_id: string
          created_at: string
          due_amount: number
          gst_amount: number
          id: string
          invoice_date: string
          invoice_number: string
          line_items: Json
          paid_amount: number
          status: string
          subtotal_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          due_amount?: number
          gst_amount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          line_items?: Json
          paid_amount?: number
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          due_amount?: number
          gst_amount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          line_items?: Json
          paid_amount?: number
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          availability_end: string
          availability_start: string
          created_at: string
          description: string | null
          featured_media: string | null
          id: string
          is_active: boolean
          meal_type: string
          media_urls: Json | null
          price: number
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          availability_end?: string
          availability_start?: string
          created_at?: string
          description?: string | null
          featured_media?: string | null
          id?: string
          is_active?: boolean
          meal_type: string
          media_urls?: Json | null
          price?: number
          title: string
          updated_at?: string
          variant: string
        }
        Update: {
          availability_end?: string
          availability_start?: string
          created_at?: string
          description?: string | null
          featured_media?: string | null
          id?: string
          is_active?: boolean
          meal_type?: string
          media_urls?: Json | null
          price?: number
          title?: string
          updated_at?: string
          variant?: string
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
          components: Json | null
          created_at: string
          cta_text: string | null
          description: string | null
          duration_days: number | null
          faqs: Json | null
          featured_image: string | null
          gallery: Json | null
          id: string
          inclusions: Json | null
          is_active: boolean
          is_featured: boolean
          markup_percentage: number | null
          max_guests: number | null
          package_type: string
          subtitle: string | null
          title: string
          updated_at: string
          weekday_price: number
          weekend_price: number
        }
        Insert: {
          banner_image?: string | null
          components?: Json | null
          created_at?: string
          cta_text?: string | null
          description?: string | null
          duration_days?: number | null
          faqs?: Json | null
          featured_image?: string | null
          gallery?: Json | null
          id?: string
          inclusions?: Json | null
          is_active?: boolean
          is_featured?: boolean
          markup_percentage?: number | null
          max_guests?: number | null
          package_type: string
          subtitle?: string | null
          title: string
          updated_at?: string
          weekday_price?: number
          weekend_price?: number
        }
        Update: {
          banner_image?: string | null
          components?: Json | null
          created_at?: string
          cta_text?: string | null
          description?: string | null
          duration_days?: number | null
          faqs?: Json | null
          featured_image?: string | null
          gallery?: Json | null
          id?: string
          inclusions?: Json | null
          is_active?: boolean
          is_featured?: boolean
          markup_percentage?: number | null
          max_guests?: number | null
          package_type?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          weekday_price?: number
          weekend_price?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          received_by: string | null
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          received_by?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          received_by?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
      room_units: {
        Row: {
          area_sqft: number | null
          bed_configuration: Json | null
          created_at: string
          floor_number: number | null
          id: string
          is_active: boolean
          max_occupancy: number | null
          notes: string | null
          room_type_id: string
          special_features: Json | null
          status: string
          unit_name: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          area_sqft?: number | null
          bed_configuration?: Json | null
          created_at?: string
          floor_number?: number | null
          id?: string
          is_active?: boolean
          max_occupancy?: number | null
          notes?: string | null
          room_type_id: string
          special_features?: Json | null
          status?: string
          unit_name?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          area_sqft?: number | null
          bed_configuration?: Json | null
          created_at?: string
          floor_number?: number | null
          id?: string
          is_active?: boolean
          max_occupancy?: number | null
          notes?: string | null
          room_type_id?: string
          special_features?: Json | null
          status?: string
          unit_name?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_units_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
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
          media_urls: Json | null
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
          media_urls?: Json | null
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
          media_urls?: Json | null
          price?: number
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      translation_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          section_key: string
          section_name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          section_key: string
          section_name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          section_key?: string
          section_name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          id: string
          key: string
          language_code: string
          section: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          language_code: string
          section: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          language_code?: string
          section?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_credit_expiry: {
        Args: { original_booking_date: string }
        Returns: string
      }
      calculate_invoice_totals: {
        Args: { p_subtotal: number }
        Returns: {
          gst_amount: number
          subtotal: number
          total_amount: number
        }[]
      }
      check_room_availability: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_room_type_id: string
        }
        Returns: {
          available_units: number
          unit_ids: string[]
        }[]
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_guest_available_credit: {
        Args: { p_guest_id: string }
        Returns: number
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
          new_data?: Json
          old_data?: Json
          record_id?: string
          table_name?: string
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
