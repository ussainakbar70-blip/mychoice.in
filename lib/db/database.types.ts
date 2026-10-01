/**
 * Supabase Database TypeScript Definitions
 * Auto-generated & strictly mapped to PostgreSQL schema migrations:
 * - 20260926000001_initial_schema.sql
 * - 20260926000002_rls_and_security.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: "customer" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: "customer" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: "customer" | "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_description: string | null;
          description: string | null;
          category_id: string | null;
          brand_name: string | null;
          status: "draft" | "published" | "archived";
          risk_status: "normal" | "review_required" | "restricted" | "rejected";
          featured: boolean;
          bestseller: boolean;
          new_arrival: boolean;
          seo_title: string | null;
          seo_description: string | null;
          base_currency: string;
          base_price: number;
          compare_at_price: number | null;
          cj_product_id: string | null;
          cj_product_sku: string | null;
          product_rating: number;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          short_description?: string | null;
          description?: string | null;
          category_id?: string | null;
          brand_name?: string | null;
          status?: "draft" | "published" | "archived";
          risk_status?: "normal" | "review_required" | "restricted" | "rejected";
          featured?: boolean;
          bestseller?: boolean;
          new_arrival?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          base_currency?: string;
          base_price?: number;
          compare_at_price?: number | null;
          cj_product_id?: string | null;
          cj_product_sku?: string | null;
          product_rating?: number;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          short_description?: string | null;
          description?: string | null;
          category_id?: string | null;
          brand_name?: string | null;
          status?: "draft" | "published" | "archived";
          risk_status?: "normal" | "review_required" | "restricted" | "rejected";
          featured?: boolean;
          bestseller?: boolean;
          new_arrival?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          base_currency?: string;
          base_price?: number;
          compare_at_price?: number | null;
          cj_product_id?: string | null;
          cj_product_sku?: string | null;
          product_rating?: number;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          cj_variant_id: string | null;
          sku: string;
          option_1_name: string | null;
          option_1_value: string | null;
          option_2_name: string | null;
          option_2_value: string | null;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          shipping_cost: number | null;
          inventory_quantity: number;
          weight: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          cj_variant_id?: string | null;
          sku: string;
          option_1_name?: string | null;
          option_1_value?: string | null;
          option_2_name?: string | null;
          option_2_value?: string | null;
          price: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          shipping_cost?: number | null;
          inventory_quantity?: number;
          weight?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          cj_variant_id?: string | null;
          sku?: string;
          option_1_name?: string | null;
          option_1_value?: string | null;
          option_2_name?: string | null;
          option_2_value?: string | null;
          price?: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          shipping_cost?: number | null;
          inventory_quantity?: number;
          weight?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          storage_path: string | null;
          public_url: string;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          storage_path?: string | null;
          public_url: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string | null;
          storage_path?: string | null;
          public_url?: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      product_tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
      };
      product_tag_map: {
        Row: {
          product_id: string;
          tag_id: string;
        };
        Insert: {
          product_id: string;
          tag_id: string;
        };
        Update: {
          product_id?: string;
          tag_id?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          customer_id: string;
          full_name: string;
          phone: string;
          address_line_1: string;
          address_line_2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          country_code: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          full_name: string;
          phone: string;
          address_line_1: string;
          address_line_2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          country_code?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          full_name?: string;
          phone?: string;
          address_line_1?: string;
          address_line_2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          country_code?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          customer_id: string | null;
          session_id: string | null;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          session_id?: string | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          session_id?: string | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          variant_id: string;
          quantity?: number;
          unit_price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          variant_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          email: string;
          currency: string;
          subtotal: number;
          shipping_amount: number;
          discount_amount: number;
          tax_amount: number;
          total_amount: number;
          payment_status: "pending" | "paid" | "failed" | "refunded";
          order_status: "pending" | "confirmed" | "processing" | "completed" | "cancelled";
          fulfillment_status:
            | "unfulfilled"
            | "pending_sync"
            | "submitted_to_cj"
            | "awaiting_cj_payment"
            | "cj_processing"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "failed";
          shipping_status: string | null;
          cj_order_id: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          idempotency_key: string | null;
          shipping_address: Record<string, any> | null;
          phone: string | null;
          customer_name: string | null;
          notes: string | null;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id?: string | null;
          email?: string | null;
          currency?: string;
          subtotal?: number;
          shipping_amount?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          payment_status?: "pending" | "paid" | "failed" | "refunded" | string;
          order_status?: "pending" | "confirmed" | "processing" | "completed" | "cancelled" | string;
          fulfillment_status?:
            | "unfulfilled"
            | "pending_sync"
            | "submitted_to_cj"
            | "awaiting_cj_payment"
            | "cj_processing"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "failed"
            | string;
          shipping_status?: string | null;
          cj_order_id?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          idempotency_key?: string | null;
          shipping_address?: Record<string, any> | null;
          phone?: string | null;
          customer_name?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_id?: string | null;
          email?: string | null;
          currency?: string;
          subtotal?: number;
          shipping_amount?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          payment_status?: "pending" | "paid" | "failed" | "refunded" | string;
          order_status?: "pending" | "confirmed" | "processing" | "completed" | "cancelled" | string;
          fulfillment_status?:
            | "unfulfilled"
            | "pending_sync"
            | "submitted_to_cj"
            | "awaiting_cj_payment"
            | "cj_processing"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "failed"
            | string;
          shipping_status?: string | null;
          cj_order_id?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          idempotency_key?: string | null;
          shipping_address?: Record<string, any> | null;
          phone?: string | null;
          customer_name?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name: string;
          variant_name: string | null;
          sku: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          cj_product_id: string | null;
          cj_variant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name: string;
          variant_name?: string | null;
          sku: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          cj_product_id?: string | null;
          cj_variant_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name?: string;
          variant_name?: string | null;
          sku?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          cj_product_id?: string | null;
          cj_variant_id?: string | null;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          provider: string;
          provider_payment_id: string | null;
          amount: number;
          currency: string;
          status: "pending" | "succeeded" | "failed" | "refunded";
          raw_response: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider: string;
          provider_payment_id?: string | null;
          amount: number;
          currency: string;
          status: "pending" | "succeeded" | "failed" | "refunded";
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: string;
          provider_payment_id?: string | null;
          amount?: number;
          currency?: string;
          status?: "pending" | "succeeded" | "failed" | "refunded";
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shipments: {
        Row: {
          id: string;
          order_id: string;
          provider: string;
          cj_order_id: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          carrier: string | null;
          shipping_method: string | null;
          status: string;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider?: string;
          cj_order_id?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          carrier?: string | null;
          shipping_method?: string | null;
          status?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: string;
          cj_order_id?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          carrier?: string | null;
          shipping_method?: string | null;
          status?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          minimum_order_value: number | null;
          maximum_discount: number | null;
          usage_limit: number | null;
          used_count: number;
          starts_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          minimum_order_value?: number | null;
          maximum_discount?: number | null;
          usage_limit?: number | null;
          used_count?: number;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          discount_type?: "percentage" | "fixed";
          discount_value?: number;
          minimum_order_value?: number | null;
          maximum_discount?: number | null;
          usage_limit?: number | null;
          used_count?: number;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupon_redemptions: {
        Row: {
          id: string;
          coupon_id: string;
          customer_id: string | null;
          order_id: string;
          discount_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          customer_id?: string | null;
          order_id: string;
          discount_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          customer_id?: string | null;
          order_id?: string;
          discount_amount?: number;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          customer_id: string | null;
          order_id: string | null;
          author_name: string;
          rating: number;
          title: string | null;
          review_text: string;
          verified_purchase: boolean;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          customer_id?: string | null;
          order_id?: string | null;
          author_name?: string;
          rating: number;
          title?: string | null;
          review_text: string;
          verified_purchase?: boolean;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          customer_id?: string | null;
          order_id?: string | null;
          author_name?: string;
          rating?: number;
          title?: string | null;
          review_text?: string;
          verified_purchase?: boolean;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      wishlist_items: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          status: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          status?: string;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          status?: string;
          source?: string | null;
          created_at?: string;
        };
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
          status?: string;
          created_at?: string;
        };
      };
      cj_products: {
        Row: {
          id: string;
          cj_product_id: string;
          raw_data: Json;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cj_product_id: string;
          raw_data: Json;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cj_product_id?: string;
          raw_data?: Json;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cj_variants: {
        Row: {
          id: string;
          cj_product_id: string;
          cj_variant_id: string;
          sku: string;
          raw_data: Json;
          inventory_quantity: number;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cj_product_id: string;
          cj_variant_id: string;
          sku: string;
          raw_data: Json;
          inventory_quantity?: number;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cj_product_id?: string;
          cj_variant_id?: string;
          sku?: string;
          raw_data?: Json;
          inventory_quantity?: number;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cj_order_sync: {
        Row: {
          id: string;
          order_id: string;
          cj_order_id: string | null;
          sync_status: string;
          error_message: string | null;
          retry_count: number;
          last_attempt_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          cj_order_id?: string | null;
          sync_status?: string;
          error_message?: string | null;
          retry_count?: number;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          cj_order_id?: string | null;
          sync_status?: string;
          error_message?: string | null;
          retry_count?: number;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      webhook_events: {
        Row: {
          id: string;
          source: string;
          event_type: string;
          event_id: string;
          payload: Json;
          processed: boolean;
          received_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          source: string;
          event_type: string;
          event_id: string;
          payload: Json;
          processed?: boolean;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          source?: string;
          event_type?: string;
          event_id?: string;
          payload?: Json;
          processed?: boolean;
          received_at?: string;
          processed_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      site_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      cj_fulfillment_attempts: {
        Row: {
          id: string;
          order_id: string;
          attempt_type: string;
          idempotency_key: string;
          cj_order_id: string | null;
          cj_order_number: string | null;
          status: string;
          payload: Json | null;
          response: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          attempt_type?: string;
          idempotency_key: string;
          cj_order_id?: string | null;
          cj_order_number?: string | null;
          status?: string;
          payload?: Json | null;
          response?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          attempt_type?: string;
          idempotency_key?: string;
          cj_order_id?: string | null;
          cj_order_number?: string | null;
          status?: string;
          payload?: Json | null;
          response?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cj_sync_logs: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string | null;
          cj_entity_id: string | null;
          operation: string;
          status: string;
          error_code: string | null;
          error_message: string | null;
          duration_ms: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id?: string | null;
          cj_entity_id?: string | null;
          operation: string;
          status: string;
          error_code?: string | null;
          error_message?: string | null;
          duration_ms?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string | null;
          cj_entity_id?: string | null;
          operation?: string;
          status?: string;
          error_code?: string | null;
          error_message?: string | null;
          duration_ms?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      cj_tracking_events: {
        Row: {
          id: string;
          order_id: string;
          tracking_number: string;
          carrier: string | null;
          checkpoint_time: string;
          status: string;
          location: string | null;
          description: string;
          raw_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          tracking_number: string;
          carrier?: string | null;
          checkpoint_time: string;
          status: string;
          location?: string | null;
          description: string;
          raw_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          tracking_number?: string;
          carrier?: string | null;
          checkpoint_time?: string;
          status?: string;
          location?: string | null;
          description?: string;
          raw_data?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductVariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
