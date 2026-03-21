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
      pricing_settings: {
        Row: {
          id: string
          spread_type: string
          spread_value: number
          updated_at: string
        }
        Insert: {
          id?: string
          spread_type?: string
          spread_value?: number
          updated_at?: string
        }
        Update: {
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
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          image_url: string | null
          is_special: boolean
          manufacturer_id: string | null
          name: string
          ncm: string | null
          price_brl: number | null
          price_cost: number | null
          price_usd: number | null
          sku: string | null
          stock: number | null
          weight: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          is_special?: boolean
          manufacturer_id?: string | null
          name: string
          ncm?: string | null
          price_brl?: number | null
          price_cost?: number | null
          price_usd?: number | null
          sku?: string | null
          stock?: number | null
          weight?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          is_special?: boolean
          manufacturer_id?: string | null
          name?: string
          ncm?: string | null
          price_brl?: number | null
          price_cost?: number | null
          price_usd?: number | null
          sku?: string | null
          stock?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
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
// Table: manufacturers
//   id: uuid (not null, default: gen_random_uuid())
//   name: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: pricing_settings
//   id: uuid (not null, default: gen_random_uuid())
//   spread_type: text (not null, default: 'percentage'::text)
//   spread_value: numeric (not null, default: 0.10)
//   updated_at: timestamp with time zone (not null, default: now())
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

// --- CONSTRAINTS ---
// Table: ai_agent_settings
//   PRIMARY KEY ai_agent_settings_pkey: PRIMARY KEY (id)
// Table: ai_providers
//   PRIMARY KEY ai_providers_pkey: PRIMARY KEY (id)
//   UNIQUE ai_providers_provider_name_key: UNIQUE (provider_name)
//   CHECK ai_providers_validation_status_check: CHECK ((validation_status = ANY (ARRAY['pending'::text, 'valid'::text, 'invalid'::text, 'error'::text])))
// Table: company_info
//   PRIMARY KEY company_info_pkey: PRIMARY KEY (id)
// Table: conversation_history
//   PRIMARY KEY conversation_history_pkey: PRIMARY KEY (id)
//   FOREIGN KEY conversation_history_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: manufacturers
//   UNIQUE manufacturers_name_key: UNIQUE (name)
//   PRIMARY KEY manufacturers_pkey: PRIMARY KEY (id)
// Table: pricing_settings
//   PRIMARY KEY pricing_settings_pkey: PRIMARY KEY (id)
// Table: product_cache
//   PRIMARY KEY product_cache_pkey: PRIMARY KEY (id)
//   FOREIGN KEY product_cache_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: product_search_cache
//   PRIMARY KEY product_search_cache_pkey: PRIMARY KEY (id)
//   CHECK product_search_cache_source_check: CHECK ((source = ANY (ARRAY['ai_generated'::text, 'manual_entry'::text, 'web_search'::text])))
// Table: products
//   FOREIGN KEY products_manufacturer_id_fkey: FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
//   PRIMARY KEY products_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: ai_agent_settings
//   Policy "Allow admin write on ai_agent_settings" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
//   Policy "Allow authenticated read on ai_agent_settings" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: ai_providers
//   Policy "Admin full access ai_providers" (ALL, PERMISSIVE) roles={authenticated}
//     USING: (((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
// Table: conversation_history
//   Policy "Auth insert own history" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "Auth read own history" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
// Table: manufacturers
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

// --- INDEXES ---
// Table: ai_providers
//   CREATE INDEX ai_providers_priority_active_idx ON public.ai_providers USING btree (priority_order, is_active)
//   CREATE UNIQUE INDEX ai_providers_provider_name_key ON public.ai_providers USING btree (provider_name)
// Table: conversation_history
//   CREATE INDEX idx_conv_history_created_at ON public.conversation_history USING btree (created_at DESC)
//   CREATE INDEX idx_conv_history_session_id ON public.conversation_history USING btree (session_id)
// Table: manufacturers
//   CREATE UNIQUE INDEX manufacturers_name_key ON public.manufacturers USING btree (name)
// Table: product_cache
//   CREATE INDEX idx_product_cache_expires ON public.product_cache USING btree (expires_at)
//   CREATE INDEX idx_product_cache_name ON public.product_cache USING btree (product_name)
// Table: product_search_cache
//   CREATE INDEX product_search_cache_created_idx ON public.product_search_cache USING btree (created_at DESC)
//   CREATE INDEX product_search_cache_query_idx ON public.product_search_cache USING btree (search_query)
// Table: products
//   CREATE INDEX products_is_special_idx ON public.products USING btree (is_special)
//   CREATE UNIQUE INDEX products_manufacturer_sku_key ON public.products USING btree (manufacturer_id, sku)

