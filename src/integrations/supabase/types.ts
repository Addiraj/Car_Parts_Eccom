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
      addresses: {
        Row: {
          area: string
          building: string | null
          created_at: string
          emirate: string
          full_name: string
          id: string
          is_default: boolean
          landmark: string | null
          phone: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          building?: string | null
          created_at?: string
          emirate: string
          full_name: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          phone: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          building?: string | null
          created_at?: string
          emirate?: string
          full_name?: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          phone?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notification_reads: {
        Row: {
          admin_id: string
          notification_id: string
          read_at: string
        }
        Insert: {
          admin_id: string
          notification_id: string
          read_at?: string
        }
        Update: {
          admin_id?: string
          notification_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          salesman_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          salesman_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          salesman_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      ai_chat_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          thread_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          thread_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          thread_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          attachments: Json
          created_at: string
          id: string
          intent: string | null
          metadata: Json
          parts: Json
          role: string
          text: string | null
          thread_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          id?: string
          intent?: string | null
          metadata?: Json
          parts?: Json
          role: string
          text?: string | null
          thread_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          id?: string
          intent?: string | null
          metadata?: Json
          parts?: Json
          role?: string
          text?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_threads: {
        Row: {
          created_at: string
          guest_token: string | null
          id: string
          language: string
          last_message_at: string
          title: string
          updated_at: string
          user_id: string | null
          vehicle_context: Json
        }
        Insert: {
          created_at?: string
          guest_token?: string | null
          id?: string
          language?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          vehicle_context?: Json
        }
        Update: {
          created_at?: string
          guest_token?: string | null
          id?: string
          language?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          vehicle_context?: Json
        }
        Relationships: []
      }
      ai_leads: {
        Row: {
          assigned_salesman_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          reason: string | null
          status: string
          thread_id: string | null
          updated_at: string
          user_id: string | null
          vehicle: Json
        }
        Insert: {
          assigned_salesman_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          reason?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle?: Json
        }
        Update: {
          assigned_salesman_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          reason?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_leads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_revisions: {
        Row: {
          aliases_text: string | null
          clarification_rules_text: string | null
          content: string
          created_at: string
          id: string
          key: string
          model: string
          prompt_id: string
          reference_file_name: string | null
          reference_file_path: string | null
          temperature: number
          updated_by: string | null
          version: number
        }
        Insert: {
          aliases_text?: string | null
          clarification_rules_text?: string | null
          content: string
          created_at?: string
          id?: string
          key: string
          model: string
          prompt_id: string
          reference_file_name?: string | null
          reference_file_path?: string | null
          temperature: number
          updated_by?: string | null
          version: number
        }
        Update: {
          aliases_text?: string | null
          clarification_rules_text?: string | null
          content?: string
          created_at?: string
          id?: string
          key?: string
          model?: string
          prompt_id?: string
          reference_file_name?: string | null
          reference_file_path?: string | null
          temperature?: number
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_revisions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          aliases_text: string | null
          clarification_rules_text: string | null
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          model: string
          name: string
          reference_file_name: string | null
          reference_file_path: string | null
          reference_text: string | null
          temperature: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          aliases_text?: string | null
          clarification_rules_text?: string | null
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          model?: string
          name: string
          reference_file_name?: string | null
          reference_file_path?: string | null
          reference_text?: string | null
          temperature?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          aliases_text?: string | null
          clarification_rules_text?: string | null
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          model?: string
          name?: string
          reference_file_name?: string | null
          reference_file_path?: string | null
          reference_text?: string | null
          temperature?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      ai_vip_numbers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          phone?: string
        }
        Relationships: []
      }
      alternative_parts: {
        Row: {
          alternative_part_id: string
          id: string
          part_id: string
        }
        Insert: {
          alternative_part_id: string
          id?: string
          part_id: string
        }
        Update: {
          alternative_part_id?: string
          id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alternative_parts_alternative_part_id_fkey"
            columns: ["alternative_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alternative_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          customer_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          customer_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          customer_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      avatar_providers: {
        Row: {
          avatar_image_path: string | null
          avatar_image_url: string | null
          config: Json
          created_at: string
          face_id: string | null
          id: string
          is_default: boolean
          is_enabled: boolean
          model: string | null
          provider: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          avatar_image_path?: string | null
          avatar_image_url?: string | null
          config?: Json
          created_at?: string
          face_id?: string | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          model?: string | null
          provider: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          avatar_image_path?: string | null
          avatar_image_url?: string | null
          config?: Json
          created_at?: string
          face_id?: string | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          model?: string | null
          provider?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          country: string | null
          created_at: string
          display_order: number
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          id: string
          part_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          part_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          part_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          display_order: number
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          body_html: string
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          used_count?: number
        }
        Relationships: []
      }
      credit_billing_statements: {
        Row: {
          amount_paid: number
          closing_balance: number
          created_at: string
          due_date: string
          generated_by: string | null
          id: string
          notes: string | null
          opening_balance: number
          outstanding_amount: number
          period_end: string
          period_start: string
          statement_number: string
          status: string
          total_credits: number
          total_debits: number
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount_paid?: number
          closing_balance: number
          created_at?: string
          due_date: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          opening_balance: number
          outstanding_amount: number
          period_end: string
          period_start: string
          statement_number: string
          status?: string
          total_credits?: number
          total_debits?: number
          user_id: string
          wallet_id: string
        }
        Update: {
          amount_paid?: number
          closing_balance?: number
          created_at?: string
          due_date?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          opening_balance?: number
          outstanding_amount?: number
          period_end?: string
          period_start?: string
          statement_number?: string
          status?: string
          total_credits?: number
          total_debits?: number
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_billing_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_billing_statements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_reference: string | null
          recorded_by: string
          recorded_by_name: string | null
          statement_id: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_reference?: string | null
          recorded_by: string
          recorded_by_name?: string | null
          statement_id?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          recorded_by?: string
          recorded_by_name?: string | null
          statement_id?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "credit_billing_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          order_id: string | null
          reason: string | null
          remarks: string | null
          type: string
          updated_by: string | null
          updated_by_email: string | null
          updated_by_name: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          remarks?: string | null
          type: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          remarks?: string | null
          type?: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_wallets: {
        Row: {
          auto_freeze_on_overdue: boolean
          available_balance: number
          created_at: string
          credit_limit: number
          currency: string
          freeze_reason: string | null
          frozen_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          payment_terms_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_freeze_on_overdue?: boolean
          available_balance?: number
          created_at?: string
          credit_limit?: number
          currency?: string
          freeze_reason?: string | null
          frozen_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_terms_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_freeze_on_overdue?: boolean
          available_balance?: number
          created_at?: string
          credit_limit?: number
          currency?: string
          freeze_reason?: string | null
          frozen_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_terms_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_imports: {
        Row: {
          created_at: string
          created_by: string | null
          error_log: Json
          failed_rows: number
          filename: string
          id: string
          inserted_rows: number
          processed_rows: number
          status: string
          storage_path: string
          total_rows: number
          updated_at: string
          updated_rows: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_log?: Json
          failed_rows?: number
          filename: string
          id?: string
          inserted_rows?: number
          processed_rows?: number
          status?: string
          storage_path: string
          total_rows?: number
          updated_at?: string
          updated_rows?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_log?: Json
          failed_rows?: number
          filename?: string
          id?: string
          inserted_rows?: number
          processed_rows?: number
          status?: string
          storage_path?: string
          total_rows?: number
          updated_at?: string
          updated_rows?: number
        }
        Relationships: []
      }
      customer_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          actor_id: string | null
          created_at: string
          customer_id: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          actor_id?: string | null
          created_at?: string
          customer_id: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          actor_id?: string | null
          created_at?: string
          customer_id?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      customer_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          customer_id: string
          id: string
          last_activity_at: string | null
          salesman_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_activity_at?: string | null
          salesman_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_activity_at?: string | null
          salesman_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assignments_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_followups: {
        Row: {
          assigned_to: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          due_at: string
          id: string
          priority: Database["public"]["Enums"]["followup_priority"]
          status: Database["public"]["Enums"]["followup_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          description?: string | null
          due_at: string
          id?: string
          priority?: Database["public"]["Enums"]["followup_priority"]
          status?: Database["public"]["Enums"]["followup_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          due_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["followup_priority"]
          status?: Database["public"]["Enums"]["followup_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          customer_id: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          customer_id: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          customer_id?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      diagram_hotspots: {
        Row: {
          callout_number: number
          diagram_id: string
          h: number
          id: string
          part_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          callout_number: number
          diagram_id: string
          h?: number
          id?: string
          part_id: string
          w?: number
          x: number
          y: number
        }
        Update: {
          callout_number?: number
          diagram_id?: string
          h?: number
          id?: string
          part_id?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagram_hotspots_diagram_id_fkey"
            columns: ["diagram_id"]
            isOneToOne: false
            referencedRelation: "diagrams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagram_hotspots_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      diagrams: {
        Row: {
          category_id: string
          created_at: string
          engine_id: string | null
          height: number
          id: string
          image_url: string
          title: string
          width: number
        }
        Insert: {
          category_id: string
          created_at?: string
          engine_id?: string | null
          height?: number
          id?: string
          image_url: string
          title: string
          width?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          engine_id?: string | null
          height?: number
          id?: string
          image_url?: string
          title?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagrams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagrams_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "engines"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      engines: {
        Row: {
          code: string
          displacement: string | null
          fuel_type: string | null
          id: string
          model_year_id: string
          name: string
        }
        Insert: {
          code: string
          displacement?: string | null
          fuel_type?: string | null
          id?: string
          model_year_id: string
          name: string
        }
        Update: {
          code?: string
          displacement?: string | null
          fuel_type?: string | null
          id?: string
          model_year_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "engines_model_year_id_fkey"
            columns: ["model_year_id"]
            isOneToOne: false
            referencedRelation: "model_years"
            referencedColumns: ["id"]
          },
        ]
      }
      garages: {
        Row: {
          brand_id: string | null
          brand_name: string | null
          created_at: string
          engine_id: string | null
          engine_name: string | null
          id: string
          is_default: boolean
          model_id: string | null
          model_name: string | null
          model_year_id: string | null
          nickname: string | null
          reference_tag: string | null
          user_id: string
          vin: string | null
          year: number | null
        }
        Insert: {
          brand_id?: string | null
          brand_name?: string | null
          created_at?: string
          engine_id?: string | null
          engine_name?: string | null
          id?: string
          is_default?: boolean
          model_id?: string | null
          model_name?: string | null
          model_year_id?: string | null
          nickname?: string | null
          reference_tag?: string | null
          user_id: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          brand_id?: string | null
          brand_name?: string | null
          created_at?: string
          engine_id?: string | null
          engine_name?: string | null
          id?: string
          is_default?: boolean
          model_id?: string | null
          model_name?: string | null
          model_year_id?: string | null
          nickname?: string | null
          reference_tag?: string | null
          user_id?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garages_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garages_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "engines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garages_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garages_model_year_id_fkey"
            columns: ["model_year_id"]
            isOneToOne: false
            referencedRelation: "model_years"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          display_order: number
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_years: {
        Row: {
          id: string
          model_id: string
          year: number
        }
        Insert: {
          id?: string
          model_id: string
          year: number
        }
        Update: {
          id?: string
          model_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_years_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          id: string
          image_url: string | null
          line_total: number
          manufacturer: string | null
          name: string
          order_id: string
          part_id: string | null
          part_number: string
          price_tier: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          image_url?: string | null
          line_total: number
          manufacturer?: string | null
          name: string
          order_id: string
          part_id?: string | null
          part_number: string
          price_tier?: string | null
          quantity: number
          unit_price: number
        }
        Update: {
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          image_url?: string | null
          line_total?: number
          manufacturer?: string | null
          name?: string
          order_id?: string
          part_id?: string | null
          part_number?: string
          price_tier?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number | null
          cancelled_at: string | null
          coupon_code: string | null
          courier: string | null
          created_at: string
          currency: string
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          delivered_at: string | null
          discount: number
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          paid_at: string | null
          payment_currency: string | null
          payment_method: string
          payment_provider: string | null
          payment_status: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          shipped_at: string | null
          shipping_address: Json
          shipping_fee: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
          vat: number
        }
        Insert: {
          amount_paid?: number | null
          cancelled_at?: string | null
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          delivered_at?: string | null
          discount?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_currency?: string | null
          payment_method?: string
          payment_provider?: string | null
          payment_status?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address: Json
          shipping_fee?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
          vat?: number
        }
        Update: {
          amount_paid?: number | null
          cancelled_at?: string | null
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          delivered_at?: string | null
          discount?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_currency?: string | null
          payment_method?: string
          payment_provider?: string | null
          payment_status?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json
          shipping_fee?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
          vat?: number
        }
        Relationships: []
      }
      part_compatibility: {
        Row: {
          engine_id: string
          id: string
          part_id: string
        }
        Insert: {
          engine_id: string
          id?: string
          part_id: string
        }
        Update: {
          engine_id?: string
          id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_compatibility_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "engines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_compatibility_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          brand_id: string | null
          category_id: string | null
          category_tag: string | null
          created_at: string
          currency: string
          description: string | null
          export_price: number | null
          gar_price: number | null
          id: string
          images: string[]
          ind_price: number | null
          is_oem: boolean
          low_stock_threshold: number
          manufacturer: string | null
          name: string
          oem_number: string | null
          part_number: string
          price: number
          search_vec: unknown
          specs: Json
          stock: number
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          category_tag?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          export_price?: number | null
          gar_price?: number | null
          id?: string
          images?: string[]
          ind_price?: number | null
          is_oem?: boolean
          low_stock_threshold?: number
          manufacturer?: string | null
          name: string
          oem_number?: string | null
          part_number: string
          price?: number
          search_vec?: unknown
          specs?: Json
          stock?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          category_tag?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          export_price?: number | null
          gar_price?: number | null
          id?: string
          images?: string[]
          ind_price?: number | null
          is_oem?: boolean
          low_stock_threshold?: number
          manufacturer?: string | null
          name?: string
          oem_number?: string | null
          part_number?: string
          price?: number
          search_vec?: unknown
          specs?: Json
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          credit_limit: number
          customer_type: Database["public"]["Enums"]["customer_type"]
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["customer_status"]
          trade_license: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          credit_limit?: number
          customer_type?: Database["public"]["Enums"]["customer_type"]
          full_name?: string | null
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          trade_license?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          credit_limit?: number
          customer_type?: Database["public"]["Enums"]["customer_type"]
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          trade_license?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      promo_sections: {
        Row: {
          badge: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          slot: string
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          slot: string
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          slot?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          meta: Json | null
          note: string | null
          quotation_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          meta?: Json | null
          note?: string | null
          quotation_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          meta?: Json | null
          note?: string | null
          quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_events_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          custom_price: number | null
          id: string
          line_discount: number
          line_total: number
          part_id: string | null
          part_snapshot: Json
          quantity: number
          quotation_id: string
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          id?: string
          line_discount?: number
          line_total?: number
          part_id?: string | null
          part_snapshot?: Json
          quantity?: number
          quotation_id: string
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          id?: string
          line_discount?: number
          line_total?: number
          part_id?: string | null
          part_snapshot?: Json
          quantity?: number
          quotation_id?: string
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          approved_at: string | null
          converted_at: string | null
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          customer_snapshot: Json
          discount_amount: number
          discount_type: Database["public"]["Enums"]["quotation_discount_type"]
          discount_value: number
          grand_total: number
          id: string
          notes: string | null
          quotation_number: string
          rejected_at: string | null
          sent_at: string | null
          share_token: string
          shipping_amount: number
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_snapshot?: Json
          discount_amount?: number
          discount_type?: Database["public"]["Enums"]["quotation_discount_type"]
          discount_value?: number
          grand_total?: number
          id?: string
          notes?: string | null
          quotation_number?: string
          rejected_at?: string | null
          sent_at?: string | null
          share_token?: string
          shipping_amount?: number
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_snapshot?: Json
          discount_amount?: number
          discount_type?: Database["public"]["Enums"]["quotation_discount_type"]
          discount_value?: number
          grand_total?: number
          id?: string
          notes?: string | null
          quotation_number?: string
          rejected_at?: string | null
          sent_at?: string | null
          share_token?: string
          shipping_amount?: number
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_viewed: {
        Row: {
          id: string
          part_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          part_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          part_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      salesmen: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          joining_date: string | null
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["salesman_status"]
          territory: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          joining_date?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["salesman_status"]
          territory?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["salesman_status"]
          territory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          emirate: string
          eta_days_max: number
          eta_days_min: number
          fee: number
          free_over: number | null
          id: string
        }
        Insert: {
          emirate: string
          eta_days_max?: number
          eta_days_min?: number
          fee?: number
          free_over?: number | null
          id?: string
        }
        Update: {
          emirate?: string
          eta_days_max?: number
          eta_days_min?: number
          fee?: number
          free_over?: number | null
          id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      special_offer_brands: {
        Row: {
          brand_id: string
          id: string
          offer_id: string
        }
        Insert: {
          brand_id: string
          id?: string
          offer_id: string
        }
        Update: {
          brand_id?: string
          id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_offer_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_offer_brands_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "special_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      special_offer_categories: {
        Row: {
          category_id: string
          id: string
          offer_id: string
        }
        Insert: {
          category_id: string
          id?: string
          offer_id: string
        }
        Update: {
          category_id?: string
          id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_offer_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_offer_categories_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "special_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      special_offer_products: {
        Row: {
          id: string
          offer_id: string
          part_id: string
        }
        Insert: {
          id?: string
          offer_id: string
          part_id: string
        }
        Update: {
          id?: string
          offer_id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_offer_products_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "special_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_offer_products_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      special_offers: {
        Row: {
          allow_stacking: boolean
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["offer_discount_type"]
          discount_value: number
          eligible_customer_types: string[]
          end_date: string
          id: string
          max_discount_amount: number | null
          min_order_value: number | null
          offer_name: string
          start_date: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          allow_stacking?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["offer_discount_type"]
          discount_value: number
          eligible_customer_types?: string[]
          end_date: string
          id?: string
          max_discount_amount?: number | null
          min_order_value?: number | null
          offer_name: string
          start_date: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          allow_stacking?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["offer_discount_type"]
          discount_value?: number
          eligible_customer_types?: string[]
          end_date?: string
          id?: string
          max_discount_amount?: number | null
          min_order_value?: number | null
          offer_name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: []
      }
      stock_levels: {
        Row: {
          bin_location: string | null
          created_at: string
          id: string
          part_id: string
          quantity: number
          reorder_point: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          bin_location?: string | null
          created_at?: string
          id?: string
          part_id: string
          quantity?: number
          reorder_point?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          bin_location?: string | null
          created_at?: string
          id?: string
          part_id?: string
          quantity?: number
          reorder_point?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note: string | null
          part_id: string
          quantity: number
          reference: string | null
          to_warehouse_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          part_id: string
          quantity: number
          reference?: string | null
          to_warehouse_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          part_id?: string
          quantity?: number
          reference?: string | null
          to_warehouse_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      synonyms: {
        Row: {
          canonical: string
          id: string
          term: string
        }
        Insert: {
          canonical: string
          id?: string
          term: string
        }
        Update: {
          canonical?: string
          id?: string
          term?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          author_role: string | null
          avatar_url: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          quote: string
          rating: number
          updated_at: string
        }
        Insert: {
          author_name: string
          author_role?: string | null
          avatar_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          quote: string
          rating?: number
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_role?: string | null
          avatar_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          quote?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_login_history: {
        Row: {
          browser: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          location: string | null
          login_time: string
          os: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_time?: string
          os?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_time?: string
          os?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
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
      vin_decode_cache: {
        Row: {
          decoded_at: string
          payload: Json
          vin: string
        }
        Insert: {
          decoded_at?: string
          payload: Json
          vin: string
        }
        Update: {
          decoded_at?: string
          payload?: Json
          vin?: string
        }
        Relationships: []
      }
      wa_analytics_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          occurred_at: string
          whatsapp_user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          occurred_at?: string
          whatsapp_user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          whatsapp_user_id?: string
        }
        Relationships: []
      }
      wa_chat_logs: {
        Row: {
          bot_response: string
          created_at: string
          id: string
          intent: string | null
          occurred_at: string
          user_locale: string | null
          user_message: string
          whatsapp_user_id: string
        }
        Insert: {
          bot_response: string
          created_at?: string
          id?: string
          intent?: string | null
          occurred_at?: string
          user_locale?: string | null
          user_message: string
          whatsapp_user_id: string
        }
        Update: {
          bot_response?: string
          created_at?: string
          id?: string
          intent?: string | null
          occurred_at?: string
          user_locale?: string | null
          user_message?: string
          whatsapp_user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_at: string
          id: string
          part_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          part_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          part_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _salesman_for: { Args: { _customer_id: string }; Returns: string }
      admin_search_part_ids_normalized: {
        Args: { _q: string }
        Returns: string[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_active_offer_for_part: {
        Args: { _part_id: string }
        Returns: {
          discount_type: Database["public"]["Enums"]["offer_discount_type"]
          discount_value: number
          end_date: string
          max_discount_amount: number
          offer_id: string
          offer_name: string
          start_date: string
        }[]
      }
      get_user_customer_type: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["customer_type"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inventory_stats: {
        Args: never
        Returns: {
          low: number
          out_: number
          total_skus: number
          total_value: number
        }[]
      }
      is_salesman: { Args: { _uid: string }; Returns: boolean }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      log_customer_activity: {
        Args: {
          _actor_id: string
          _customer_id: string
          _entity_id: string
          _entity_type: string
          _metadata: Json
          _type: Database["public"]["Enums"]["activity_type"]
        }
        Returns: undefined
      }
      lookup_parts_normalized: {
        Args: { _pns: string[] }
        Returns: {
          export_price: number
          gar_price: number
          id: string
          ind_price: number
          match_key: string
          oem_number: string
          part_number: string
          price: number
          stock: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_quotation_number: { Args: never; Returns: string }
      next_statement_number: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_offer_statuses: { Args: never; Returns: undefined }
      search_parts_normalized: {
        Args: { _brand?: string; _limit?: number; _q: string }
        Returns: {
          id: string
          manufacturer: string
          name: string
          part_number: string
          price: number
        }[]
      }
      wallet_check_and_freeze: { Args: { _user: string }; Returns: boolean }
      wallet_credit: {
        Args: {
          _actor: string
          _actor_email: string
          _actor_name: string
          _amount: number
          _order: string
          _reason: string
          _remarks: string
          _uncap?: boolean
          _wallet: string
        }
        Returns: number
      }
      wallet_debit: {
        Args: {
          _amount: number
          _order: string
          _order_number: string
          _user: string
        }
        Returns: number
      }
      wallet_record_payment: {
        Args: {
          _actor: string
          _actor_email: string
          _actor_name: string
          _amount: number
          _method: string
          _notes: string
          _payment_date: string
          _reference: string
          _statement: string
          _wallet: string
        }
        Returns: Json
      }
    }
    Enums: {
      activity_type:
        | "note_added"
        | "followup_created"
        | "followup_completed"
        | "followup_cancelled"
        | "quotation_created"
        | "order_placed"
        | "customer_assigned"
        | "customer_reassigned"
        | "customer_unassigned"
        | "status_changed"
        | "call_logged"
        | "email_sent"
        | "part_viewed"
        | "catalog_viewed"
        | "cart_item_added"
        | "cart_item_removed"
        | "wishlist_added"
        | "ai_prompt"
        | "ai_vin_asked"
        | "ai_part_asked"
      app_role: "admin" | "customer" | "super_admin" | "salesman"
      customer_status: "pending" | "active" | "suspended"
      customer_type: "IND" | "GAR" | "EXP"
      followup_priority: "low" | "medium" | "high"
      followup_status: "pending" | "completed" | "cancelled"
      offer_discount_type: "percentage" | "fixed"
      offer_status: "active" | "scheduled" | "expired" | "disabled"
      quotation_discount_type: "percent" | "fixed"
      quotation_status:
        | "draft"
        | "sent"
        | "approved"
        | "rejected"
        | "expired"
        | "converted"
      salesman_status: "active" | "inactive"
      stock_movement_type:
        | "IN"
        | "OUT"
        | "ADJUST"
        | "TRANSFER"
        | "SALE"
        | "RETURN"
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
      activity_type: [
        "note_added",
        "followup_created",
        "followup_completed",
        "followup_cancelled",
        "quotation_created",
        "order_placed",
        "customer_assigned",
        "customer_reassigned",
        "customer_unassigned",
        "status_changed",
        "call_logged",
        "email_sent",
        "part_viewed",
        "catalog_viewed",
        "cart_item_added",
        "cart_item_removed",
        "wishlist_added",
        "ai_prompt",
        "ai_vin_asked",
        "ai_part_asked",
      ],
      app_role: ["admin", "customer", "super_admin", "salesman"],
      customer_status: ["pending", "active", "suspended"],
      customer_type: ["IND", "GAR", "EXP"],
      followup_priority: ["low", "medium", "high"],
      followup_status: ["pending", "completed", "cancelled"],
      offer_discount_type: ["percentage", "fixed"],
      offer_status: ["active", "scheduled", "expired", "disabled"],
      quotation_discount_type: ["percent", "fixed"],
      quotation_status: [
        "draft",
        "sent",
        "approved",
        "rejected",
        "expired",
        "converted",
      ],
      salesman_status: ["active", "inactive"],
      stock_movement_type: [
        "IN",
        "OUT",
        "ADJUST",
        "TRANSFER",
        "SALE",
        "RETURN",
      ],
    },
  },
} as const
