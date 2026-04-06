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

