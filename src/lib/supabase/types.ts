// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_agent_settings: {
        Row: {
          cache_expiration_days: number | null
          confidence_threshold_for_whatsapp: string | null
          created_at: string | null
          id: string
          max_web_search_attempts: number | null
          price_threshold_usd: number | null
          system_prompt: string
          updated_at: string | null
          whatsapp_trigger_expensive_product: boolean | null
          whatsapp_trigger_keywords: string[] | null
          whatsapp_trigger_low_confidence: boolean | null
          whatsapp_trigger_project_keywords: boolean | null
          whatsapp_trigger_purchase_keywords: boolean | null
        }
        Insert: {
          cache_expiration_days?: number | null
          confidence_threshold_for_whatsapp?: string | null
          created_at?: string | null
          id?: string
          max_web_search_attempts?: number | null
          price_threshold_usd?: number | null
          system_prompt?: string
          updated_at?: string | null
          whatsapp_trigger_expensive_product?: boolean | null
          whatsapp_trigger_keywords?: string[] | null
          whatsapp_trigger_low_confidence?: boolean | null
          whatsapp_trigger_project_keywords?: boolean | null
          whatsapp_trigger_purchase_keywords?: boolean | null
        }
        Update: {
          cache_expiration_days?: number | null
          confidence_threshold_for_whatsapp?: string | null
          created_at?: string | null
          id?: string
          max_web_search_attempts?: number | null
          price_threshold_usd?: number | null
          system_prompt?: string
          updated_at?: string | null
          whatsapp_trigger_expensive_product?: boolean | null
          whatsapp_trigger_keywords?: string[] | null
          whatsapp_trigger_low_confidence?: boolean | null
          whatsapp_trigger_project_keywords?: boolean | null
          whatsapp_trigger_purchase_keywords?: boolean | null
        }
        Relationships: []
      }
      ai_providers: {
        Row: {
          api_key_secret_name: string
          created_at: string | null
          custom_endpoint: string | null
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          model_id: string
          priority: number | null
          priority_order: number | null
          provider_name: string
          provider_type: string | null
          updated_at: string | null
          validation_error: string | null
          validation_status: string | null
        }
        Insert: {
          api_key_secret_name: string
          created_at?: string | null
          custom_endpoint?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          model_id: string
          priority?: number | null
          priority_order?: number | null
          provider_name: string
          provider_type?: string | null
          updated_at?: string | null
          validation_error?: string | null
          validation_status?: string | null
        }
        Update: {
          api_key_secret_name?: string
          created_at?: string | null
          custom_endpoint?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          model_id?: string
          priority?: number | null
          priority_order?: number | null
          provider_name?: string
          provider_type?: string | null
          updated_at?: string | null
          validation_error?: string | null
          validation_status?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          setting_value_numeric: number | null
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          setting_value_numeric?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          setting_value_numeric?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string | null
          cart_id: string | null
          id: string
          product_id: string
          quantity: number
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          product_id: string
          quantity: number
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shopping_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          content: string
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          id?: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          created_at: string | null
          id: string
          query: string
          response: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          response: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          response?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          customer_id: string
          id: string
          order_id: string | null
          used_at: string | null
        }
        Insert: {
          coupon_id: string
          customer_id: string
          id?: string
          order_id?: string | null
          used_at?: string | null
        }
        Update: {
          coupon_id?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_type: string
          city: string
          complement: string | null
          country: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          address_type: string
          city: string
          complement?: string | null
          country?: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          address_type?: string
          city?: string
          complement?: string | null
          country?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_methods: {
        Row: {
          card_brand: string | null
          card_expiry_month: number | null
          card_expiry_year: number | null
          card_last_four: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          stripe_payment_method_id: string
        }
        Insert: {
          card_brand?: string | null
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_last_four?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id: string
        }
        Update: {
          card_brand?: string | null
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_last_four?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: Json | null
          bio: string | null
          company_name: string | null
          cpf: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_login: string | null
          phone: string | null
          profile_photo_url: string | null
          role: string
          shipping_address: Json | null
          status: string
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          bio?: string | null
          company_name?: string | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role?: string
          shipping_address?: Json | null
          status?: string
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          bio?: string | null
          company_name?: string | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role?: string
          shipping_address?: Json | null
          status?: string
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by_user_id: string
          discount_amount: number
          id: string
          is_used: boolean | null
          max_profit_margin: number
          order_id: string | null
          status: string | null
          used_at: string | null
          used_on_order_id: string | null
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by_user_id: string
          discount_amount: number
          id?: string
          is_used?: boolean | null
          max_profit_margin: number
          order_id?: string | null
          status?: string | null
          used_at?: string | null
          used_on_order_id?: string | null
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by_user_id?: string
          discount_amount?: number
          id?: string
          is_used?: boolean | null
          max_profit_margin?: number
          order_id?: string | null
          status?: string | null
          used_at?: string | null
          used_on_order_id?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_coupons_used_on_order_id_fkey"
            columns: ["used_on_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rule_categories: {
        Row: {
          category: string
          discount_rule_id: string
          id: string
        }
        Insert: {
          category: string
          discount_rule_id: string
          id?: string
        }
        Update: {
          category?: string
          discount_rule_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_rule_categories_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rule_customers: {
        Row: {
          created_at: string | null
          customer_id: string
          discount_rule_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          discount_rule_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          discount_rule_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_rule_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_rule_customers_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rule_exclusions: {
        Row: {
          created_at: string | null
          discount_rule_id: string
          id: string
          is_active: boolean | null
          product_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          discount_rule_id: string
          id?: string
          is_active?: boolean | null
          product_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          discount_rule_id?: string
          id?: string
          is_active?: boolean | null
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_rule_exclusions_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_rule_exclusions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rule_manufacturers: {
        Row: {
          discount_rule_id: string
          id: string
          manufacturer_id: string
        }
        Insert: {
          discount_rule_id: string
          id?: string
          manufacturer_id: string
        }
        Update: {
          discount_rule_id?: string
          id?: string
          manufacturer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_rule_manufacturers_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_rule_manufacturers_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rule_products: {
        Row: {
          discount_rule_id: string
          id: string
          product_id: string
        }
        Insert: {
          discount_rule_id: string
          id?: string
          product_id: string
        }
        Update: {
          discount_rule_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_rule_products_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_rule_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rules: {
        Row: {
          application_type: string | null
          created_at: string | null
          customers: string[] | null
          discount_calculation_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          role: string | null
          rule_name: string
          rule_type: string
          scope_data: Json | null
          scope_type: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          application_type?: string | null
          created_at?: string | null
          customers?: string[] | null
          discount_calculation_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          rule_name: string
          rule_type: string
          scope_data?: Json | null
          scope_type: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          application_type?: string | null
          created_at?: string | null
          customers?: string[] | null
          discount_calculation_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          rule_name?: string
          rule_type?: string
          scope_data?: Json | null
          scope_type?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discounts: {
        Row: {
          category_id: string | null
          created_at: string | null
          customer_application_type: string | null
          customer_role: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          manufacturer_id: string | null
          max_purchase: number | null
          min_purchase: number | null
          name: string
          product_selection: Json | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          customer_application_type?: string | null
          customer_role?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer_id?: string | null
          max_purchase?: number | null
          min_purchase?: number | null
          name: string
          product_selection?: Json | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          customer_application_type?: string | null
          customer_role?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer_id?: string | null
          max_purchase?: number | null
          min_purchase?: number | null
          name?: string
          product_selection?: Json | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          spread_percentage: number
          spread_type: string
          updated_by: string | null
          usd_to_brl: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          spread_percentage?: number
          spread_type?: string
          updated_by?: string | null
          usd_to_brl: number
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          spread_percentage?: number
          spread_type?: string
          updated_by?: string | null
          usd_to_brl?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
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
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          completed_at: string | null
          id: string
          order_id: string
          order_item_id: string
          reason: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          order_id: string
          order_item_id: string
          reason?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          order_id?: string
          order_item_id?: string
          reason?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          old_status: string | null
          order_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          order_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address_id: string | null
          created_at: string | null
          customer_id: string
          discount_amount: number | null
          estimated_delivery_date: string | null
          id: string
          order_number: string
          payment_data: Json | null
          payment_method_id: string | null
          payment_method_type: string | null
          shipping_address_id: string | null
          shipping_cost: number | null
          shipping_method: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          total: number
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address_id?: string | null
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          id?: string
          order_number: string
          payment_data?: Json | null
          payment_method_id?: string | null
          payment_method_type?: string | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          status?: string
          subtotal: number
          tax_amount?: number | null
          total: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address_id?: string | null
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          id?: string
          order_number?: string
          payment_data?: Json | null
          payment_method_id?: string | null
          payment_method_type?: string | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "customer_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          device_type: string | null
          id: string
          page_path: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          device_type?: string | null
          id?: string
          page_path: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          device_type?: string | null
          id?: string
          page_path?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_tokens: {
        Row: {
          created_at: string | null
          id: string
          is_used: boolean | null
          order_id: string
          token: string
          used_at: string | null
          user_id: string
          valid_until: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          order_id: string
          token: string
          used_at?: string | null
          user_id: string
          valid_until: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          order_id?: string
          token?: string
          used_at?: string | null
          user_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      price_settings: {
        Row: {
          exchange_rate: number
          exchange_spread: number
          freight_per_kg_usd: number
          id: string
          markup: number
          updated_at: string
          updated_by: string | null
          weight_margin: number
        }
        Insert: {
          exchange_rate?: number
          exchange_spread?: number
          freight_per_kg_usd?: number
          id?: string
          markup?: number
          updated_at?: string
          updated_by?: string | null
          weight_margin?: number
        }
        Update: {
          exchange_rate?: number
          exchange_spread?: number
          freight_per_kg_usd?: number
          id?: string
          markup?: number
          updated_at?: string
          updated_by?: string | null
          weight_margin?: number
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          exchange_rate: number
          id: string
          spread_type: string
          spread_value: number
          updated_at: string
        }
        Insert: {
          exchange_rate?: number
          id?: string
          spread_type?: string
          spread_value?: number
          updated_at?: string
        }
        Update: {
          exchange_rate?: number
          id?: string
          spread_type?: string
          spread_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_cache: {
        Row: {
          cached_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          product_name: string | null
          product_specs: Json | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          cached_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          product_name?: string | null
          product_specs?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          cached_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          product_name?: string | null
          product_specs?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_search_cache: {
        Row: {
          created_at: string | null
          created_by_admin: boolean | null
          id: string
          product_currency: string | null
          product_description: string | null
          product_image_url: string | null
          product_name: string
          product_price: number | null
          product_specs: Json | null
          search_query: string
          source: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_admin?: boolean | null
          id?: string
          product_currency?: string | null
          product_description?: string | null
          product_image_url?: string | null
          product_name: string
          product_price?: number | null
          product_specs?: Json | null
          search_query: string
          source: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_admin?: boolean | null
          id?: string
          product_currency?: string | null
          product_description?: string | null
          product_image_url?: string | null
          product_name?: string
          product_price?: number | null
          product_specs?: Json | null
          search_query?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          image_url: string | null
          is_discontinued: boolean
          is_special: boolean
          manufacturer_id: string | null
          name: string
          ncm: string | null
          price_brl: number | null
          price_cost: number | null
          price_usd: number | null
          sku: string | null
          stock: number | null
          technical_info: string | null
          weight: number | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          is_discontinued?: boolean
          is_special?: boolean
          manufacturer_id?: string | null
          name: string
          ncm?: string | null
          price_brl?: number | null
          price_cost?: number | null
          price_usd?: number | null
          sku?: string | null
          stock?: number | null
          technical_info?: string | null
          weight?: number | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          is_discontinued?: boolean
          is_special?: boolean
          manufacturer_id?: string | null
          name?: string
          ncm?: string | null
          price_brl?: number | null
          price_cost?: number | null
          price_usd?: number | null
          sku?: string | null
          stock?: number | null
          technical_info?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_metrics: {
        Row: {
          conversion_rate: number | null
          created_at: string | null
          date: string
          id: string
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          id?: string
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      shopping_carts: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          login_timestamp: string
          logout_timestamp: string | null
          page_viewed: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          login_timestamp?: string
          logout_timestamp?: string | null
          page_viewed?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          login_timestamp?: string
          logout_timestamp?: string | null
          page_viewed?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_final_price: {
        Args: { p_customer_id: string; p_product_id: string }
        Returns: number
      }
      check_is_admin: { Args: never; Returns: boolean }
      get_applicable_discounts: {
        Args: { p_customer_id: string; p_product_id: string }
        Returns: {
          discount_calculation_type: string
          discount_value: number
          rule_id: string
          rule_name: string
          scope_type: string
        }[]
      }
      normalize_sku: { Args: { sku: string }; Returns: string }
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


// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: ai_agent_settings
//   id: uuid (not null, default: gen_random_uuid())
//   price_threshold_usd: numeric (nullable, default: 5000)
//   whatsapp_trigger_keywords: _text (nullable, default: ARRAY['comprar'::text, 'orçamento'::text, 'quanto custa'::text, 'disponível'::text, 'preço'::text, 'tabela de preços'::text, 'cotação'::text, 'desconto'::text, 'promoção'::text])
//   max_web_search_attempts: integer (nullable, default: 2)
//   confidence_threshold_for_whatsapp: text (nullable, default: 'low'::text)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
//   cache_expiration_days: integer (nullable, default: 30)
//   whatsapp_trigger_low_confidence: boolean (nullable, default: true)
//   whatsapp_trigger_purchase_keywords: boolean (nullable, default: true)
//   whatsapp_trigger_project_keywords: boolean (nullable, default: true)
//   whatsapp_trigger_expensive_product: boolean (nullable, default: true)
//   system_prompt: text (not null, default: 'You are an expert AI assistant for My Way Business, a professional audiovisual equipment supplier. Your role is to help customers find the perfect equipment for their production needs.  CRITICAL BEHAVIORS: 1. Always search the internal product database FIRST before web search. 2. Prioritize products from our catalog that match customer requirements. 3. Provide detailed technical specifications for all products mentioned. 4. If a product is mentioned in your response, it MUST appear as a card below. 5. If you cannot provide a satisfactory answer or detect purchase interest in expensive projects (over USD 5000), set confidence_level to low to trigger the WhatsApp specialist button. 6. Always respond in Portuguese (PT-BR). 7. Be professional, knowledgeable, and customer-focused.'::text)
// Table: ai_providers
//   id: uuid (not null, default: gen_random_uuid())
//   provider_name: text (not null)
//   api_key_secret_name: text (not null)
//   model_id: text (not null)
//   is_active: boolean (nullable, default: false)
//   priority_order: integer (nullable, default: 999)
//   last_validated_at: timestamp with time zone (nullable)
//   validation_status: text (nullable, default: 'pending'::text)
//   validation_error: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
//   provider_type: text (nullable)
//   custom_endpoint: text (nullable)
//   priority: integer (nullable, default: 999)
// Table: app_settings
//   id: uuid (not null, default: gen_random_uuid())
//   setting_key: text (not null)
//   setting_value: text (not null)
//   updated_at: timestamp with time zone (nullable, default: now())
//   updated_by_user_id: uuid (nullable)
//   setting_value_numeric: numeric (nullable, default: NULL::numeric)
// Table: cart_items
//   id: uuid (not null, default: gen_random_uuid())
//   cart_id: uuid (nullable)
//   product_id: uuid (not null)
//   quantity: integer (not null)
//   added_at: timestamp without time zone (nullable, default: now())
//   user_id: uuid (nullable)
// Table: categories
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   description: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: company_info
//   id: uuid (not null, default: gen_random_uuid())
//   content: text (not null)
//   updated_at: timestamp with time zone (not null, default: now())
//   type: text (not null, default: 'ai_knowledge'::text)
// Table: conversation_history
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   session_id: uuid (not null)
//   query: text (not null)
//   response: text (not null)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: coupon_usage
//   id: uuid (not null, default: gen_random_uuid())
//   coupon_id: uuid (not null)
//   customer_id: uuid (not null)
//   used_at: timestamp without time zone (nullable, default: now())
//   order_id: uuid (nullable)
// Table: customer_addresses
//   id: uuid (not null, default: gen_random_uuid())
//   customer_id: uuid (not null)
//   address_type: text (not null)
//   street: text (not null)
//   number: text (not null)
//   complement: text (nullable)
//   neighborhood: text (not null)
//   city: text (not null)
//   state: text (not null)
//   zip_code: text (not null)
//   country: text (not null, default: 'Brasil'::text)
//   is_default: boolean (not null, default: false)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   latitude: numeric (nullable)
//   longitude: numeric (nullable)
// Table: customer_favorites
//   id: uuid (not null, default: gen_random_uuid())
//   customer_id: uuid (not null)
//   product_id: uuid (not null)
//   created_at: timestamp without time zone (nullable, default: now())
// Table: customer_payment_methods
//   id: uuid (not null, default: gen_random_uuid())
//   customer_id: uuid (not null)
//   stripe_payment_method_id: character varying (not null)
//   card_last_four: character varying (nullable)
//   card_brand: character varying (nullable)
//   card_expiry_month: integer (nullable)
//   card_expiry_year: integer (nullable)
//   is_default: boolean (nullable, default: false)
//   created_at: timestamp without time zone (nullable, default: now())
// Table: customers
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (not null)
//   full_name: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
//   phone: text (nullable)
//   date_of_birth: date (nullable)
//   gender: text (nullable)
//   company_name: text (nullable)
//   profile_photo_url: text (nullable)
//   cpf: text (nullable)
//   role: character varying (not null, default: 'customer'::character varying)
//   bio: text (nullable)
//   last_login: timestamp with time zone (nullable)
//   two_factor_enabled: boolean (nullable, default: false)
//   status: text (not null, default: 'ativo'::text)
//   email: text (nullable)
//   billing_address: jsonb (nullable)
//   shipping_address: jsonb (nullable)
// Table: discount_coupons
//   id: uuid (not null, default: gen_random_uuid())
//   code: character varying (not null)
//   discount_amount: numeric (not null)
//   max_profit_margin: numeric (not null)
//   order_id: uuid (nullable)
//   created_by_user_id: uuid (not null)
//   created_at: timestamp with time zone (nullable, default: now())
//   valid_until: timestamp with time zone (not null)
//   used_on_order_id: uuid (nullable)
//   used_at: timestamp with time zone (nullable)
//   is_used: boolean (nullable, default: false)
//   status: text (nullable, default: 'active'::text)
// Table: discount_rule_categories
//   id: uuid (not null, default: gen_random_uuid())
//   discount_rule_id: uuid (not null)
//   category: character varying (not null)
// Table: discount_rule_customers
//   id: uuid (not null, default: gen_random_uuid())
//   discount_rule_id: uuid (not null)
//   customer_id: uuid (not null)
//   created_at: timestamp without time zone (nullable, default: now())
// Table: discount_rule_exclusions
//   id: uuid (not null, default: gen_random_uuid())
//   discount_rule_id: uuid (not null)
//   product_id: uuid (not null)
//   reason: text (nullable)
//   created_at: timestamp without time zone (nullable, default: now())
//   is_active: boolean (nullable, default: true)
// Table: discount_rule_manufacturers
//   id: uuid (not null, default: gen_random_uuid())
//   discount_rule_id: uuid (not null)
//   manufacturer_id: uuid (not null)
// Table: discount_rule_products
//   id: uuid (not null, default: gen_random_uuid())
//   discount_rule_id: uuid (not null)
//   product_id: uuid (not null)
// Table: discount_rules
//   id: uuid (not null, default: gen_random_uuid())
//   rule_name: character varying (not null)
//   rule_type: character varying (not null)
//   scope_type: character varying (not null)
//   discount_calculation_type: character varying (not null)
//   discount_value: numeric (not null)
//   is_active: boolean (nullable, default: true)
//   created_at: timestamp without time zone (nullable, default: now())
//   updated_at: timestamp without time zone (nullable, default: now())
//   scope_data: jsonb (nullable)
//   application_type: text (nullable)
//   role: text (nullable)
//   customers: _uuid (nullable)
//   start_date: timestamp with time zone (nullable)
//   end_date: timestamp with time zone (nullable)
// Table: discounts
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   description: text (nullable)
//   discount_type: text (not null)
//   discount_value: numeric (not null)
//   product_selection: jsonb (nullable, default: '[]'::jsonb)
//   manufacturer_id: uuid (nullable)
//   category_id: uuid (nullable)
//   min_purchase: numeric (nullable)
//   max_purchase: numeric (nullable)
//   start_date: timestamp with time zone (nullable)
//   end_date: timestamp with time zone (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
//   is_active: boolean (nullable, default: true)
//   customer_application_type: text (nullable)
//   customer_role: text (nullable)
// Table: exchange_rate
//   id: uuid (not null, default: gen_random_uuid())
//   usd_to_brl: numeric (not null)
//   spread_percentage: numeric (not null, default: 0.2)
//   spread_type: text (not null, default: 'percentage'::text)
//   last_updated: timestamp with time zone (not null, default: now())
//   updated_by: uuid (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: favorites
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (not null)
//   product_id: uuid (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: manufacturers
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: order_items
//   id: uuid (not null, default: gen_random_uuid())
//   order_id: uuid (not null)
//   product_id: uuid (not null)
//   quantity: integer (not null)
//   unit_price: numeric (not null)
//   total_price: numeric (not null)
// Table: order_returns
//   id: uuid (not null, default: gen_random_uuid())
//   order_id: uuid (not null)
//   order_item_id: uuid (not null)
//   reason: text (nullable)
//   status: character varying (nullable, default: 'pending'::character varying)
//   requested_at: timestamp without time zone (nullable, default: now())
//   completed_at: timestamp without time zone (nullable)
// Table: order_status_history
//   id: uuid (not null, default: gen_random_uuid())
//   order_id: uuid (not null)
//   old_status: character varying (nullable)
//   new_status: character varying (not null)
//   changed_at: timestamp without time zone (nullable, default: now())
//   changed_by: uuid (nullable)
// Table: orders
//   id: uuid (not null, default: gen_random_uuid())
//   customer_id: uuid (not null)
//   order_number: character varying (not null)
//   status: character varying (not null, default: 'pending'::character varying)
//   shipping_address_id: uuid (nullable)
//   billing_address_id: uuid (nullable)
//   payment_method_id: uuid (nullable)
//   payment_method_type: character varying (nullable)
//   subtotal: numeric (not null)
//   discount_amount: numeric (nullable, default: 0)
//   tax_amount: numeric (nullable, default: 0)
//   shipping_cost: numeric (nullable, default: 0)
//   total: numeric (not null)
//   shipping_method: character varying (nullable)
//   tracking_number: character varying (nullable)
//   estimated_delivery_date: date (nullable)
//   created_at: timestamp without time zone (nullable, default: now())
//   updated_at: timestamp without time zone (nullable, default: now())
//   payment_data: jsonb (nullable)
// Table: page_visits
//   id: uuid (not null, default: gen_random_uuid())
//   page_path: character varying (not null)
//   user_id: uuid (nullable)
//   device_type: character varying (nullable)
//   timestamp: timestamp without time zone (nullable, default: now())
// Table: payment_tokens
//   id: uuid (not null, default: gen_random_uuid())
//   token: text (not null)
//   order_id: uuid (not null)
//   user_id: uuid (not null)
//   created_at: timestamp with time zone (nullable, default: now())
//   valid_until: timestamp with time zone (not null)
//   is_used: boolean (nullable, default: false)
//   used_at: timestamp with time zone (nullable)
// Table: price_settings
//   id: uuid (not null, default: gen_random_uuid())
//   exchange_rate: numeric (not null, default: 5.2655)
//   exchange_spread: numeric (not null, default: 0.20)
//   freight_per_kg_usd: numeric (not null, default: 120)
//   weight_margin: numeric (not null, default: 0.5)
//   markup: numeric (not null, default: 0.8)
//   updated_at: timestamp with time zone (not null, default: now())
//   updated_by: uuid (nullable)
// Table: pricing_settings
//   id: uuid (not null, default: gen_random_uuid())
//   spread_type: text (not null, default: 'percentage'::text)
//   spread_value: numeric (not null, default: 0.10)
//   updated_at: timestamp with time zone (not null, default: now())
//   exchange_rate: numeric (not null, default: 5.00)
// Table: product_cache
//   id: uuid (not null, default: gen_random_uuid())
//   product_name: text (nullable)
//   product_specs: jsonb (nullable)
//   source: text (nullable, default: 'web_search'::text)
//   cached_at: timestamp with time zone (nullable, default: now())
//   expires_at: timestamp with time zone (nullable)
//   user_id: uuid (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: product_search_cache
//   id: uuid (not null, default: gen_random_uuid())
//   search_query: text (not null)
//   product_name: text (not null)
//   product_description: text (nullable)
//   product_price: numeric (nullable)
//   product_currency: text (nullable, default: 'USD'::text)
//   product_image_url: text (nullable)
//   product_specs: jsonb (nullable)
//   source: text (not null)
//   created_by_admin: boolean (nullable, default: false)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
// Table: products
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   sku: text (nullable)
//   description: text (nullable)
//   price_brl: numeric (nullable, default: 0)
//   stock: integer (nullable, default: 0)
//   image_url: text (nullable)
//   ncm: text (nullable)
//   weight: numeric (nullable)
//   dimensions: text (nullable)
//   category: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   is_special: boolean (not null, default: false)
//   manufacturer_id: uuid (nullable)
//   price_usd: numeric (nullable, default: 0)
//   price_cost: numeric (nullable, default: 0)
//   technical_info: text (nullable)
//   is_discontinued: boolean (not null, default: false)
//   category_id: uuid (nullable)
// Table: sales_metrics
//   id: uuid (not null, default: gen_random_uuid())
//   date: date (not null)
//   total_orders: integer (nullable, default: 0)
//   total_revenue: numeric (nullable, default: 0)
//   conversion_rate: numeric (nullable, default: 0)
//   created_at: timestamp without time zone (nullable, default: now())
// Table: settings
//   id: uuid (not null, default: gen_random_uuid())
//   key: text (not null)
//   value: text (nullable)
//   description: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   updated_at: timestamp with time zone (nullable, default: now())
// Table: shopping_carts
//   id: uuid (not null, default: gen_random_uuid())
//   customer_id: uuid (not null)
//   created_at: timestamp without time zone (nullable, default: now())
//   updated_at: timestamp without time zone (nullable, default: now())
// Table: user_sessions
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   login_timestamp: timestamp with time zone (not null, default: now())
//   logout_timestamp: timestamp with time zone (nullable)
//   page_viewed: text (nullable)
//   ip_address: text (nullable)
//   user_agent: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: ai_agent_settings
//   PRIMARY KEY ai_agent_settings_pkey: PRIMARY KEY (id)
// Table: ai_providers
//   PRIMARY KEY ai_providers_pkey: PRIMARY KEY (id)
//   UNIQUE ai_providers_provider_name_key: UNIQUE (provider_name)
//   CHECK ai_providers_validation_status_check: CHECK ((validation_status = ANY (ARRAY['pending'::text, 'valid'::text, 'invalid'::text, 'error'::text])))
// Table: app_settings
//   PRIMARY KEY app_settings_pkey: PRIMARY KEY (id)
//   UNIQUE app_settings_setting_key_key: UNIQUE (setting_key)
//   FOREIGN KEY app_settings_updated_by_user_id_fkey: FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id)
// Table: cart_items
//   FOREIGN KEY cart_items_cart_id_fkey: FOREIGN KEY (cart_id) REFERENCES shopping_carts(id) ON DELETE CASCADE
//   PRIMARY KEY cart_items_pkey: PRIMARY KEY (id)
//   FOREIGN KEY cart_items_product_id_fkey: FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
//   CHECK cart_items_quantity_check: CHECK (((quantity >= 1) AND (quantity <= 50)))
//   FOREIGN KEY cart_items_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: categories
//   PRIMARY KEY categories_pkey: PRIMARY KEY (id)
// Table: company_info
//   PRIMARY KEY company_info_pkey: PRIMARY KEY (id)
// Table: conversation_history
//   PRIMARY KEY conversation_history_pkey: PRIMARY KEY (id)
//   FOREIGN KEY conversation_history_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: coupon_usage
//   UNIQUE coupon_usage_coupon_id_customer_id_key: UNIQUE (coupon_id, customer_id)
//   FOREIGN KEY coupon_usage_customer_id_fkey: FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
//   PRIMARY KEY coupon_usage_pkey: PRIMARY KEY (id)
// Table: customer_addresses
//   CHECK customer_addresses_address_type_check: CHECK ((address_type = ANY (ARRAY['shipping'::text, 'billing'::text])))
//   FOREIGN KEY customer_addresses_customer_id_fkey: FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
//   PRIMARY KEY customer_addresses_pkey: PRIMARY KEY (id)
// Table: customer_favorites
//   FOREIGN KEY customer_favorites_customer_id_fkey: FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
//   UNIQUE customer_favorites_customer_id_product_id_key: UNIQUE (customer_id, product_id)
//   PRIMARY KEY customer_favorites_pkey: PRIMARY KEY (id)
//   FOREIGN KEY customer_favorites_product_id_fkey: FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
// Table: customer_payment_methods
//   FOREIGN KEY customer_payment_methods_customer_id_fkey: FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
//   PRIMARY KEY customer_payment_methods_pkey: PRIMARY KEY (id)
//   UNIQUE customer_payment_methods_stripe_payment_method_id_key: UNIQUE (stripe_payment_method_id)
// Table: customers
//   PRIMARY KEY customers_pkey: PRIMARY KEY (id)
//   CHECK customers_role_check: CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'customer'::character varying, 'reseller'::character varying, 'vip'::character varying])::text[])))
//   CHECK customers_status_check: CHECK ((status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'suspenso'::text])))
//   FOREIGN KEY customers_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
//   UNIQUE customers_user_id_key: UNIQUE (user_id)
// Table: discount_coupons
//   UNIQUE discount_coupons_code_key: UNIQUE (code)
//   FOREIGN KEY discount_coupons_created_by_user_id_fkey: FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT
//   FOREIGN KEY discount_coupons_order_id_fkey: FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
//   PRIMARY KEY discount_coupons_pkey: PRIMARY KEY (id)
//   FOREIGN KEY discount_coupons_used_on_order_id_fkey: FOREIGN KEY (used_on_order_id) REFERENCES orders(id) ON DELETE SET NULL
// Table: discount_rule_categories
//   UNIQUE discount_rule_categories_discount_rule_id_category_key: UNIQUE (discount_rule_id, category)
//   FOREIGN KEY discount_rule_categories_discount_rule_id_fkey: FOREIGN KEY (discount_rule_id) REFERENCES discount_rules(id) ON DELETE CASCADE
//   PRIMARY KEY discount_rule_categories_pkey: PRIMARY KEY (id)
// Table: discount_rule_customers
//   FOREIGN KEY discount_rule_customers_customer_id_fkey: FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
//   UNIQUE discount_rule_customers_discount_rule_id_customer_id_key: UNIQUE (discount_rule_id, customer_id)
//   FOREIGN KEY discount_rule_customers_discount_rule_id_fkey: FOREIGN KEY (discount_rule_id) REFERENCES discount_rules(id) ON DELETE CASCADE
//   PRIMARY KEY discount_rule_customers_pkey: PRIMARY KEY (id)
// Table: discount_rule_exclusions
//   FOREIGN KEY discount_rule_exclusions_discount_rule_id_fkey: FOREIGN KEY (discount_rule_id) REFERENCES discount_rules(id) ON DELETE CASCADE
//   UNIQUE discount_rule_exclusions_discount_rule_id_product_id_key: UNIQUE (discount_rule_id, product_id)
//   PRIMARY KEY discount_rule_exclusions_pkey: PRIMARY KEY (id)
//   FOREIGN KEY discount_rule_exclusions_product_id_fkey: FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
// Table: discount_rule_manufacturers
//   FOREIGN KEY discount_rule_manufacturers_discount_rule_id_fkey: FOREIGN KEY (discount_rule_id) REFERENCES discount_rules(id) ON DELETE CASCADE
//   UNIQUE discount_rule_manufacturers_discount_rule_id_manufacturer_i_key: UNIQUE (discount_rule_id, manufacturer_id)
//   FOREIGN KEY discount_rule_manufacturers_manufacturer_id_fkey: FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE CASCADE
//   PRIMARY KEY discount_rule_manufacturers_pkey: PRIMARY KEY (id)
// Table: discount_rule_products
//   FOREIGN KEY discount_rule_products_discount_rule_id_fkey: FOREIGN KEY (discount_rule_id) REFERENCES discount_rules(id) ON DELETE CASCADE
//   UNIQUE discount_rule_products_discount_rule_id_product_id_key: UNIQUE (discount_rule_id, product_id)
//   PRIMARY KEY discount_rule_products_pkey: PRIMARY KEY (id)
//   FOREIGN KEY discount_rule_products_product_id_fkey: FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
// Table: discount_rules
//   CHECK discount_rules_discount_calculation_type_check: CHECK (((discount_calculation_type)::text = ANY ((ARRAY['margin_percentage'::character varying, 'price_usa_percentage'::character varying])::text[])))
//   PRIMARY KEY discount_rules_pkey: PRIMARY KEY (id)
//   CHECK discount_rules_scope_type_check: CHECK (((scope_type)::text = ANY ((ARRAY['all_products'::character varying, 'by_manufacturer'::character varying, 'by_category'::character varying, 'by_manufacturer_category'::character varying, 'individual_products'::character varying])::text[])))
// Table: discounts
//   FOREIGN KEY discounts_category_id_fkey: FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
//   FOREIGN KEY discounts_manufacturer_id_fkey: FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
//   PRIMARY KEY discounts_pkey: PRIMARY KEY (id)
// Table: exchange_rate
//   PRIMARY KEY exchange_rate_pkey: PRIMARY KEY (id)
//   FOREIGN KEY exchange_rate_updated_by_fkey: FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: favorites
//   PRIMARY KEY favorites_pkey: PRIMARY KEY (id)
//   FOREIGN KEY favorites_product_id_fkey: FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
//   FOREIGN KEY favorites_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
//   UNIQUE favorites_user_id_product_id_key: UNIQUE (user_id, product_id)
// Table: manufacturers
//   UNIQUE manufacturers_name_key: UNIQUE (name)
//   PRIMARY KEY manufacturers_pkey: PRIMARY KEY (id)
// Table: order_items
//   FOREIGN KEY order_items_order_id_fkey: FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
//   PRIMARY KEY order_items_pkey: PRIMARY KEY (id)
//   FOREIGN KEY order_items_product_id_fkey: FOREIGN KEY (product_id) REFERENCES products(id)
// Table: order_returns
//   FOREIGN KEY order_returns_order_id_fkey: FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
//   FOREIGN KEY order_returns_order_item_id_fkey: FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
//   PRIMARY KEY order_returns_pkey: PRIMARY KEY (id)
//   CHECK order_returns_status_check: CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'completed'::character varying])::text[])))
// Table: order_status_history
//   FOREIGN KEY order_status_history_changed_by_fkey: FOREIGN KEY (changed_by) REFERENCES customers(id)
//   CHECK order_status_history_new_status_check: CHECK (((new_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('pending_payment'::character varying)::text, ('paid'::character varying)::text, ('processing'::character varying)::text, ('shipped'::character varying)::text, ('delivered'::character varying)::text, ('cancelled'::character varying)::text])))
//   CHECK order_status_history_old_status_check: CHECK (((old_status IS NULL) OR ((old_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('pending_payment'::character varying)::text, ('paid'::character varying)::text, ('processing'::character varying)::text, ('shipped'::character varying)::text, ('delivered'::character varying)::text, ('cancelled'::character varying)::text]))))
//   FOREIGN KEY order_status_history_order_id_fkey: FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
//   PRIMARY KEY order_status_history_pkey: PRIMARY KEY (id)
// Table: orders
//   FOREIGN KEY orders_billing_address_id_fkey: FOREIGN KEY (billing_address_id) REFERENCES customer_addresses(id)
//   FOREIGN KEY orders_customer_id_fkey: FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
//   UNIQUE orders_order_number_key: UNIQUE (order_number)
//   FOREIGN KEY orders_payment_method_id_fkey: FOREIGN KEY (payment_method_id) REFERENCES customer_payment_methods(id)
//   CHECK orders_payment_method_type_check: CHECK (((payment_method_type)::text = ANY ((ARRAY['card'::character varying, 'paypal'::character varying, 'pix'::character varying, 'transfer'::character varying])::text[])))
//   PRIMARY KEY orders_pkey: PRIMARY KEY (id)
//   FOREIGN KEY orders_shipping_address_id_fkey: FOREIGN KEY (shipping_address_id) REFERENCES customer_addresses(id)
//   CHECK orders_shipping_method_check: CHECK (((shipping_method)::text = ANY ((ARRAY['miami_pickup'::character varying, 'brazil_delivery'::character varying, 'usa_cargo'::character varying])::text[])))
//   CHECK orders_status_check: CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('pending_payment'::character varying)::text, ('paid'::character varying)::text, ('processing'::character varying)::text, ('shipped'::character varying)::text, ('delivered'::character varying)::text, ('cancelled'::character varying)::text])))
// Table: page_visits
//   PRIMARY KEY page_visits_pkey: PRIMARY KEY (id)
//   FOREIGN KEY page_visits_user_id_fkey: FOREIGN KEY (user_id) REFERENCES customers(id)
// Table: payment_tokens
//   FOREIGN KEY payment_tokens_order_id_fkey: FOREIGN KEY (order_id) REFERENCES orders(id)
//   PRIMARY KEY payment_tokens_pkey: PRIMARY KEY (id)
//   UNIQUE payment_tokens_token_key: UNIQUE (token)
//   FOREIGN KEY payment_tokens_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id)
// Table: price_settings
//   PRIMARY KEY price_settings_pkey: PRIMARY KEY (id)
//   FOREIGN KEY price_settings_updated_by_fkey: FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: pricing_settings
//   PRIMARY KEY pricing_settings_pkey: PRIMARY KEY (id)
// Table: product_cache
//   PRIMARY KEY product_cache_pkey: PRIMARY KEY (id)
//   FOREIGN KEY product_cache_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: product_search_cache
//   PRIMARY KEY product_search_cache_pkey: PRIMARY KEY (id)
//   CHECK product_search_cache_source_check: CHECK ((source = ANY (ARRAY['ai_generated'::text, 'manual_entry'::text, 'web_search'::text])))
// Table: products
//   FOREIGN KEY products_category_id_fkey: FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
//   FOREIGN KEY products_manufacturer_id_fkey: FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
//   PRIMARY KEY products_pkey: PRIMARY KEY (id)
// Table: sales_metrics
//   UNIQUE sales_metrics_date_key: UNIQUE (date)
//   PRIMARY KEY sales_metrics_pkey: PRIMARY KEY (id)
// Table: settings
//   UNIQUE settings_key_key: UNIQUE (key)
//   PRIMARY KEY settings_pkey: PRIMARY KEY (id)
// Table: shopping_carts
//   FOREIGN KEY shopping_carts_customer_id_fkey: FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
//   PRIMARY KEY shopping_carts_pkey: PRIMARY KEY (id)
// Table: user_sessions
//   PRIMARY KEY user_sessions_pkey: PRIMARY KEY (id)
//   FOREIGN KEY user_sessions_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

// --- ROW LEVEL SECURITY POLICIES ---
// Table: ai_agent_settings
//   Policy "Allow admin write on ai_agent_settings" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "Allow authenticated read on ai_agent_settings" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: ai_providers
//   Policy "Admin full access ai_providers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "allow_public_read_ai_providers" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: app_settings
//   Policy "Admin only insert app_settings" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admin only update app_settings" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Anyone can read app_settings" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "No one delete app_settings" (DELETE, PERMISSIVE) roles={public}
//     USING: false
// Table: cart_items
//   Policy "Admins can delete all cart items" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: check_is_admin()
//   Policy "Admins can insert all cart items" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: check_is_admin()
//   Policy "Admins can update all cart items" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: check_is_admin()
//   Policy "Admins can view all cart items" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: check_is_admin()
//   Policy "Customers can add cart items" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (cart_id IN ( SELECT shopping_carts.id    FROM shopping_carts   WHERE (shopping_carts.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
//   Policy "Customers can delete own cart items" (DELETE, PERMISSIVE) roles={public}
//     USING: (cart_id IN ( SELECT shopping_carts.id    FROM shopping_carts   WHERE (shopping_carts.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
//   Policy "Customers can update own cart items" (UPDATE, PERMISSIVE) roles={public}
//     USING: (cart_id IN ( SELECT shopping_carts.id    FROM shopping_carts   WHERE (shopping_carts.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
//   Policy "Customers can view own cart items" (SELECT, PERMISSIVE) roles={public}
//     USING: (cart_id IN ( SELECT shopping_carts.id    FROM shopping_carts   WHERE (shopping_carts.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
//   Policy "cart_items_delete_user" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "cart_items_insert_user" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "cart_items_select_user" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "cart_items_update_user" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
// Table: conversation_history
//   Policy "Auth insert own history" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "Auth read own history" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
// Table: coupon_usage
//   Policy "Admins can view all coupon usage" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Customers can use coupon" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can view own coupon usage" (SELECT, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
// Table: customer_addresses
//   Policy "Admins can delete addresses" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can insert addresses" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can update addresses" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can view all addresses" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Customers can delete own addresses" (DELETE, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can manage own addresses" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can update own addresses" (UPDATE, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can view own addresses" (SELECT, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Users can delete own addresses" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Users can insert own addresses" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Users can update own addresses" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Users can view own addresses" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
// Table: customer_favorites
//   Policy "Customers can add favorites" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can delete own favorites" (DELETE, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can view own favorites" (SELECT, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
// Table: customer_payment_methods
//   Policy "Customers can add payment methods" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can delete own payment methods" (DELETE, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can view own payment methods" (SELECT, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
// Table: customers
//   Policy "Enable DELETE for admins only" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (check_is_admin() OR ((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "Enable INSERT for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable SELECT for admins - all data" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (check_is_admin() OR ((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "Enable SELECT for users own data only" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "Enable UPDATE for admins - all data" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (check_is_admin() OR ((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "Enable UPDATE for users own data only" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
// Table: discount_coupons
//   Policy "Admin only can delete discount_coupons" (DELETE, PERMISSIVE) roles={public}
//     USING: false
//   Policy "Admin or collaborator can create discount_coupons" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (auth.uid() IS NOT NULL)
//   Policy "Admin or collaborator can update discount_coupons" (UPDATE, PERMISSIVE) roles={public}
//     USING: (auth.uid() IS NOT NULL)
//   Policy "Anyone can read discount_coupons" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: discount_rules
//   Policy "allow_admin_all_discount_rules" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "allow_public_read_discount_rules" (SELECT, PERMISSIVE) roles={public}
//     USING: (is_active = true)
// Table: exchange_rate
//   Policy "exchange_rate_insert_admin" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "exchange_rate_select_all" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "exchange_rate_update_admin" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//     WITH CHECK: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
// Table: favorites
//   Policy "favorites_delete_own" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "favorites_insert_own" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "favorites_select_own" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "favorites_update_own" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//     WITH CHECK: (auth.uid() = user_id)
// Table: manufacturers
//   Policy "Admins can manage manufacturers" (ALL, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can view all manufacturers" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Allow anon read on manufacturers" (SELECT, PERMISSIVE) roles={anon}
//     USING: true
//   Policy "Allow authenticated delete on manufacturers" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Allow authenticated insert on manufacturers" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Allow authenticated read on manufacturers" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Allow authenticated update on manufacturers" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: order_items
//   Policy "Admins can insert order items" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: check_is_admin()
//   Policy "Admins can view all order items" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Customers can insert own order items" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (order_id IN ( SELECT orders.id    FROM orders   WHERE (orders.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
//   Policy "Customers can view own order items" (SELECT, PERMISSIVE) roles={public}
//     USING: (order_id IN ( SELECT orders.id    FROM orders   WHERE (orders.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
// Table: order_returns
//   Policy "Admins can update returns" (UPDATE, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can view all returns" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Customers can request return" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (order_id IN ( SELECT orders.id    FROM orders   WHERE (orders.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
//   Policy "Customers can view own returns" (SELECT, PERMISSIVE) roles={public}
//     USING: (order_id IN ( SELECT orders.id    FROM orders   WHERE (orders.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
// Table: order_status_history
//   Policy "Admins can log status change" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can view all order status history" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Customers can insert own order status history" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (order_id IN ( SELECT orders.id    FROM orders   WHERE (orders.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
//   Policy "Customers can view own order status history" (SELECT, PERMISSIVE) roles={public}
//     USING: (order_id IN ( SELECT orders.id    FROM orders   WHERE (orders.customer_id IN ( SELECT customers.id            FROM customers           WHERE (customers.user_id = auth.uid())))))
// Table: orders
//   Policy "Admins can insert orders" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: check_is_admin()
//   Policy "Admins can update any order" (UPDATE, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can view all orders" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Customers can create orders" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can update own orders" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can view own orders" (SELECT, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
// Table: page_visits
//   Policy "Admins can view all page visits" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Anyone can log page visit" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
// Table: payment_tokens
//   Policy "Admins can update tokens" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins or collaborators can insert tokens" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = ANY ((ARRAY['admin'::character varying, 'collaborator'::character varying])::text[])))))
//   Policy "No one delete payment_tokens" (DELETE, PERMISSIVE) roles={public}
//     USING: false
//   Policy "Users can read own tokens or admins" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((auth.uid() = user_id) OR (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text)))))
// Table: price_settings
//   Policy "Allow admin insert on price_settings" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Allow admin update on price_settings" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//     WITH CHECK: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Allow authenticated select on price_settings" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: pricing_settings
//   Policy "Allow anon read on pricing_settings" (SELECT, PERMISSIVE) roles={anon}
//     USING: true
//   Policy "Allow anon select on pricing_settings" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "Allow authenticated insert on pricing_settings" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Allow authenticated read on pricing_settings" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Allow authenticated select on pricing_settings" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Allow authenticated update on pricing_settings" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: product_cache
//   Policy "Admin write cache" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "Auth read cache" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: product_search_cache
//   Policy "Admin write cache" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "Auth read cache" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "allow_public_read_cache" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: products
//   Policy "Admins can manage products" (ALL, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Admins can view all products" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "allow_admin_update_products" (UPDATE, PERMISSIVE) roles={public}
//     USING: ((auth.jwt() ->> 'role'::text) = 'admin'::text)
//     WITH CHECK: ((auth.jwt() ->> 'role'::text) = 'admin'::text)
//   Policy "allow_public_read_products" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: sales_metrics
//   Policy "Admins can view sales metrics" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
// Table: settings
//   Policy "allow_admin_write_settings" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (auth.role() = 'authenticated'::text))
//     WITH CHECK: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (auth.role() = 'authenticated'::text))
//   Policy "allow_all_read_settings" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: shopping_carts
//   Policy "Admins can delete all shopping carts" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: check_is_admin()
//   Policy "Admins can insert all shopping carts" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: check_is_admin()
//   Policy "Admins can update all shopping carts" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: check_is_admin()
//   Policy "Admins can view all shopping carts" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: check_is_admin()
//   Policy "Customers can create cart" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can update own cart" (UPDATE, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
//   Policy "Customers can view own cart" (SELECT, PERMISSIVE) roles={public}
//     USING: (customer_id IN ( SELECT customers.id    FROM customers   WHERE (customers.user_id = auth.uid())))
// Table: user_sessions
//   Policy "Admin full access user_sessions" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//     WITH CHECK: (EXISTS ( SELECT 1    FROM customers   WHERE ((customers.user_id = auth.uid()) AND ((customers.role)::text = 'admin'::text))))
//   Policy "Anon can insert sessions" (INSERT, PERMISSIVE) roles={anon}
//     WITH CHECK: (user_id IS NULL)
//   Policy "Anon can update sessions" (UPDATE, PERMISSIVE) roles={anon}
//     USING: (user_id IS NULL)
//   Policy "Users can insert own sessions" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: ((auth.uid() = user_id) OR (user_id IS NULL))
//   Policy "Users can update own sessions" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((auth.uid() = user_id) OR (user_id IS NULL))

// --- WARNING: TABLES WITH RLS ENABLED BUT NO POLICIES ---
// These tables have Row Level Security enabled but NO policies defined.
// This means ALL queries (SELECT, INSERT, UPDATE, DELETE) will return ZERO rows
// for non-superuser roles (including the anon and authenticated roles used by the app).
// You MUST create RLS policies for these tables to allow data access.
//   - discount_rule_categories
//   - discount_rule_customers
//   - discount_rule_exclusions
//   - discount_rule_manufacturers
//   - discount_rule_products

// --- DATABASE FUNCTIONS ---
// FUNCTION calculate_final_price(uuid, uuid)
//   CREATE OR REPLACE FUNCTION public.calculate_final_price(p_product_id uuid, p_customer_id uuid)
//    RETURNS numeric
//    LANGUAGE plpgsql
//    STABLE
//   AS $function$
//   DECLARE
//     v_price_usa NUMERIC;
//     v_price_cost NUMERIC;
//     v_max_discount NUMERIC := 0;
//     v_discount_type VARCHAR;
//     v_final_price NUMERIC;
//   BEGIN
//     SELECT price_usa, price_cost INTO v_price_usa, v_price_cost
//     FROM products WHERE id = p_product_id;
//     
//     IF v_price_usa IS NULL THEN RETURN NULL; END IF;
//     
//     SELECT dr.discount_value, dr.discount_calculation_type
//     INTO v_max_discount, v_discount_type
//     FROM discount_rules dr
//     INNER JOIN discount_rule_customers drc ON dr.id = drc.discount_rule_id
//     WHERE dr.is_active = true
//       AND drc.customer_id = p_customer_id
//       AND dr.scope_type = 'all_products'
//       AND NOT EXISTS (
//         SELECT 1 FROM discount_rule_exclusions dre 
//         WHERE dre.discount_rule_id = dr.id 
//           AND dre.product_id = p_product_id 
//           AND dre.is_active = true
//       )
//     ORDER BY dr.discount_value DESC
//     LIMIT 1;
//     
//     IF v_max_discount IS NULL OR v_max_discount = 0 THEN
//       RETURN v_price_usa;
//     END IF;
//     
//     IF v_discount_type = 'margin_percentage' THEN
//       v_final_price := v_price_cost + ((v_max_discount / 100) * (v_price_usa - v_price_cost));
//     ELSIF v_discount_type = 'price_usa_percentage' THEN
//       v_final_price := v_price_usa - ((v_max_discount / 100) * v_price_usa);
//     ELSE
//       RETURN v_price_usa;
//     END IF;
//     
//     RETURN ROUND(v_final_price, 2);
//   END;
//   $function$
//   
// FUNCTION check_is_admin()
//   CREATE OR REPLACE FUNCTION public.check_is_admin()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_is_admin BOOLEAN;
//   BEGIN
//     SELECT EXISTS (
//       SELECT 1 FROM public.customers 
//       WHERE user_id = auth.uid() AND role = 'admin'
//     ) INTO v_is_admin;
//     
//     RETURN v_is_admin;
//   END;
//   $function$
//   
// FUNCTION get_applicable_discounts(uuid, uuid)
//   CREATE OR REPLACE FUNCTION public.get_applicable_discounts(p_product_id uuid, p_customer_id uuid)
//    RETURNS TABLE(rule_id uuid, rule_name character varying, discount_value numeric, discount_calculation_type character varying, scope_type character varying)
//    LANGUAGE plpgsql
//    STABLE
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT dr.id, dr.rule_name, dr.discount_value, dr.discount_calculation_type, dr.scope_type
//     FROM discount_rules dr
//     INNER JOIN discount_rule_customers drc ON dr.id = drc.discount_rule_id
//     WHERE dr.is_active = true
//       AND drc.customer_id = p_customer_id
//       AND dr.scope_type = 'all_products'
//       AND NOT EXISTS (
//         SELECT 1 FROM discount_rule_exclusions dre 
//         WHERE dre.discount_rule_id = dr.id 
//           AND dre.product_id = p_product_id 
//           AND dre.is_active = true
//       )
//     ORDER BY dr.discount_value DESC;
//   END;
//   $function$
//   
// FUNCTION handle_new_customer()
//   CREATE OR REPLACE FUNCTION public.handle_new_customer()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     INSERT INTO public.customers (user_id, full_name, email)
//     VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email)
//     ON CONFLICT (user_id) DO NOTHING;
//     RETURN NEW;
//   END;
//   $function$
//   
// FUNCTION normalize_sku(text)
//   CREATE OR REPLACE FUNCTION public.normalize_sku(sku text)
//    RETURNS text
//    LANGUAGE plpgsql
//    IMMUTABLE
//   AS $function$
//   BEGIN
//     RETURN upper(regexp_replace(sku, '[^a-zA-Z0-9]', '', 'g'));
//   END;
//   $function$
//   

// --- INDEXES ---
// Table: ai_providers
//   CREATE INDEX ai_providers_priority_active_idx ON public.ai_providers USING btree (priority_order, is_active)
//   CREATE UNIQUE INDEX ai_providers_provider_name_key ON public.ai_providers USING btree (provider_name)
// Table: app_settings
//   CREATE UNIQUE INDEX app_settings_setting_key_key ON public.app_settings USING btree (setting_key)
//   CREATE INDEX idx_app_settings_key ON public.app_settings USING btree (setting_key)
// Table: cart_items
//   CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id)
// Table: conversation_history
//   CREATE INDEX idx_conv_history_created_at ON public.conversation_history USING btree (created_at DESC)
//   CREATE INDEX idx_conv_history_session_id ON public.conversation_history USING btree (session_id)
// Table: coupon_usage
//   CREATE UNIQUE INDEX coupon_usage_coupon_id_customer_id_key ON public.coupon_usage USING btree (coupon_id, customer_id)
// Table: customer_favorites
//   CREATE UNIQUE INDEX customer_favorites_customer_id_product_id_key ON public.customer_favorites USING btree (customer_id, product_id)
//   CREATE INDEX idx_customer_favorites_customer_id ON public.customer_favorites USING btree (customer_id)
// Table: customer_payment_methods
//   CREATE UNIQUE INDEX customer_payment_methods_stripe_payment_method_id_key ON public.customer_payment_methods USING btree (stripe_payment_method_id)
//   CREATE INDEX idx_customer_payment_methods_customer_id ON public.customer_payment_methods USING btree (customer_id)
// Table: customers
//   CREATE UNIQUE INDEX customers_user_id_key ON public.customers USING btree (user_id)
//   CREATE INDEX idx_customers_role ON public.customers USING btree (role)
//   CREATE INDEX idx_customers_user_id ON public.customers USING btree (user_id)
// Table: discount_coupons
//   CREATE UNIQUE INDEX discount_coupons_code_key ON public.discount_coupons USING btree (code)
//   CREATE INDEX idx_discount_coupons_code ON public.discount_coupons USING btree (code)
//   CREATE INDEX idx_discount_coupons_created_by ON public.discount_coupons USING btree (created_by_user_id)
//   CREATE INDEX idx_discount_coupons_order_id ON public.discount_coupons USING btree (order_id)
//   CREATE INDEX idx_discount_coupons_status ON public.discount_coupons USING btree (status)
//   CREATE INDEX idx_discount_coupons_used_on_order_id ON public.discount_coupons USING btree (used_on_order_id)
// Table: discount_rule_categories
//   CREATE UNIQUE INDEX discount_rule_categories_discount_rule_id_category_key ON public.discount_rule_categories USING btree (discount_rule_id, category)
//   CREATE INDEX idx_discount_rule_categories_rule_id ON public.discount_rule_categories USING btree (discount_rule_id)
// Table: discount_rule_customers
//   CREATE UNIQUE INDEX discount_rule_customers_discount_rule_id_customer_id_key ON public.discount_rule_customers USING btree (discount_rule_id, customer_id)
//   CREATE INDEX idx_discount_rule_customers_customer_id ON public.discount_rule_customers USING btree (customer_id)
//   CREATE INDEX idx_discount_rule_customers_rule_id ON public.discount_rule_customers USING btree (discount_rule_id)
// Table: discount_rule_exclusions
//   CREATE UNIQUE INDEX discount_rule_exclusions_discount_rule_id_product_id_key ON public.discount_rule_exclusions USING btree (discount_rule_id, product_id)
//   CREATE INDEX idx_discount_rule_exclusions_active ON public.discount_rule_exclusions USING btree (discount_rule_id, is_active)
//   CREATE INDEX idx_discount_rule_exclusions_product_id ON public.discount_rule_exclusions USING btree (product_id)
//   CREATE INDEX idx_discount_rule_exclusions_rule_id ON public.discount_rule_exclusions USING btree (discount_rule_id)
// Table: discount_rule_manufacturers
//   CREATE UNIQUE INDEX discount_rule_manufacturers_discount_rule_id_manufacturer_i_key ON public.discount_rule_manufacturers USING btree (discount_rule_id, manufacturer_id)
//   CREATE INDEX idx_discount_rule_manufacturers_rule_id ON public.discount_rule_manufacturers USING btree (discount_rule_id)
// Table: discount_rule_products
//   CREATE UNIQUE INDEX discount_rule_products_discount_rule_id_product_id_key ON public.discount_rule_products USING btree (discount_rule_id, product_id)
//   CREATE INDEX idx_discount_rule_products_product_id ON public.discount_rule_products USING btree (product_id)
//   CREATE INDEX idx_discount_rule_products_rule_id ON public.discount_rule_products USING btree (discount_rule_id)
// Table: discount_rules
//   CREATE INDEX idx_discount_rules_active ON public.discount_rules USING btree (is_active)
//   CREATE INDEX idx_discount_rules_type_active ON public.discount_rules USING btree (rule_type, is_active)
// Table: discounts
//   CREATE INDEX idx_discounts_category_id ON public.discounts USING btree (category_id)
//   CREATE INDEX idx_discounts_manufacturer_id ON public.discounts USING btree (manufacturer_id)
// Table: exchange_rate
//   CREATE INDEX idx_exchange_rate_last_updated ON public.exchange_rate USING btree (last_updated DESC)
// Table: favorites
//   CREATE UNIQUE INDEX favorites_user_id_product_id_key ON public.favorites USING btree (user_id, product_id)
//   CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id)
// Table: manufacturers
//   CREATE UNIQUE INDEX manufacturers_name_key ON public.manufacturers USING btree (name)
// Table: orders
//   CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC)
//   CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id)
//   CREATE INDEX idx_orders_status ON public.orders USING btree (status)
//   CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number)
// Table: page_visits
//   CREATE INDEX idx_page_visits_timestamp ON public.page_visits USING btree ("timestamp" DESC)
//   CREATE INDEX idx_page_visits_user_id ON public.page_visits USING btree (user_id)
// Table: payment_tokens
//   CREATE INDEX idx_payment_tokens_order_id ON public.payment_tokens USING btree (order_id)
//   CREATE INDEX idx_payment_tokens_token ON public.payment_tokens USING btree (token)
//   CREATE INDEX idx_payment_tokens_user_id ON public.payment_tokens USING btree (user_id)
//   CREATE UNIQUE INDEX payment_tokens_token_key ON public.payment_tokens USING btree (token)
// Table: product_cache
//   CREATE INDEX idx_product_cache_expires ON public.product_cache USING btree (expires_at)
//   CREATE INDEX idx_product_cache_name ON public.product_cache USING btree (product_name)
// Table: product_search_cache
//   CREATE INDEX product_search_cache_created_idx ON public.product_search_cache USING btree (created_at DESC)
//   CREATE INDEX product_search_cache_query_idx ON public.product_search_cache USING btree (search_query)
// Table: products
//   CREATE INDEX idx_products_is_discontinued ON public.products USING btree (is_discontinued)
//   CREATE INDEX products_is_special_idx ON public.products USING btree (is_special)
//   CREATE UNIQUE INDEX products_manufacturer_sku_key ON public.products USING btree (manufacturer_id, sku)
// Table: sales_metrics
//   CREATE INDEX idx_sales_metrics_date ON public.sales_metrics USING btree (date DESC)
//   CREATE UNIQUE INDEX sales_metrics_date_key ON public.sales_metrics USING btree (date)
// Table: settings
//   CREATE INDEX idx_settings_key ON public.settings USING btree (key)
//   CREATE UNIQUE INDEX settings_key_key ON public.settings USING btree (key)
// Table: shopping_carts
//   CREATE INDEX idx_shopping_carts_customer_id ON public.shopping_carts USING btree (customer_id)

