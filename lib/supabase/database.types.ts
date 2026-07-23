export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          ai_analysis: Json | null
          analysis_completed_at: string | null
          analysis_error: string | null
          analysis_started_at: string | null
          approved_video_path: string | null
          camera_motion: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          image_rights_confirmed_at: string | null
          kling_prompt: string | null
          negative_prompt: string | null
          notes: string | null
          original_image_path: string | null
          prompt_model: string | null
          property_type: string | null
          recommended_settings: Json | null
          room_type: string | null
          status: string
          style: string | null
          updated_at: string
          usage_type: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          analysis_completed_at?: string | null
          analysis_error?: string | null
          analysis_started_at?: string | null
          approved_video_path?: string | null
          camera_motion?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_rights_confirmed_at?: string | null
          kling_prompt?: string | null
          negative_prompt?: string | null
          notes?: string | null
          original_image_path?: string | null
          prompt_model?: string | null
          property_type?: string | null
          recommended_settings?: Json | null
          room_type?: string | null
          status?: string
          style?: string | null
          updated_at?: string
          usage_type?: string | null
          user_id?: string
        }
        Update: {
          ai_analysis?: Json | null
          analysis_completed_at?: string | null
          analysis_error?: string | null
          analysis_started_at?: string | null
          approved_video_path?: string | null
          camera_motion?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_rights_confirmed_at?: string | null
          kling_prompt?: string | null
          negative_prompt?: string | null
          notes?: string | null
          original_image_path?: string | null
          prompt_model?: string | null
          property_type?: string | null
          recommended_settings?: Json | null
          room_type?: string | null
          status?: string
          style?: string | null
          updated_at?: string
          usage_type?: string | null
          user_id?: string
        }
        Relationships: []
      }

      video_generations: {
        Row: {
          actual_cost_cents: number
          attempt_number: number
          created_at: string
          currency: string
          error_code: string | null
          error_message: string | null
          estimated_cost_cents: number
          finished_at: string | null
          id: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_request_id: string
          provider_task_id: string | null
          queued_at: string
          requested_by: string
          result_video_path: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_cost_cents?: number
          attempt_number: number
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost_cents?: number
          finished_at?: string | null
          id?: string
          idempotency_key: string
          order_id: string
          provider?: string
          provider_request_id?: string
          provider_task_id?: string | null
          queued_at?: string
          requested_by: string
          result_video_path?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_cost_cents?: number
          attempt_number?: number
          created_at?: string
          currency?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost_cents?: number
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string
          provider?: string
          provider_request_id?: string
          provider_task_id?: string | null
          queued_at?: string
          requested_by?: string
          result_video_path?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_generations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_generations_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "video_providers"
            referencedColumns: ["provider_key"]
          },
        ]
      }

      video_providers: {
        Row: {
          configuration: Json
          created_at: string
          default_model: string | null
          display_name: string
          enabled: boolean
          id: string
          priority: number
          provider_key: string
          supports_image_to_video: boolean
          supports_text_to_video: boolean
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          default_model?: string | null
          display_name: string
          enabled?: boolean
          id?: string
          priority?: number
          provider_key: string
          supports_image_to_video?: boolean
          supports_text_to_video?: boolean
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          default_model?: string | null
          display_name?: string
          enabled?: boolean
          id?: string
          priority?: number
          provider_key?: string
          supports_image_to_video?: boolean
          supports_text_to_video?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      vimmoai_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      claim_order_analysis: {
        Args: {
          p_order_id: string
        }
        Returns: {
          camera_motion: string
          duration_seconds: number
          id: string
          notes: string
          original_image_path: string
          property_type: string
          room_type: string
          style: string
          usage_type: string
        }[]
      }

      claim_video_generation: {
        Args: {
          p_generation_id: string
        }
        Returns: {
          attempt_number: number
          generation_id: string
          order_id: string
          provider_request_id: string
          started_at: string
        }[]
      }

      complete_order_analysis: {
        Args: {
          p_ai_analysis: Json
          p_kling_prompt: string
          p_negative_prompt: string
          p_order_id: string
          p_prompt_model: string
          p_recommended_settings: Json
        }
        Returns: boolean
      }

      complete_order_upload: {
        Args: {
          p_order_id: string
          p_original_image_path: string
        }
        Returns: boolean
      }

      complete_video_generation: {
        Args: {
          p_actual_cost_cents: number
          p_generation_id: string
          p_provider_task_id: string
          p_result_video_path: string
        }
        Returns: boolean
      }

      delete_draft_order: {
        Args: {
          p_order_id: string
        }
        Returns: boolean
      }

      fail_order_analysis: {
        Args: {
          p_error: string
          p_order_id: string
        }
        Returns: boolean
      }

      fail_video_generation: {
        Args: {
          p_actual_cost_cents: number
          p_error_code: string | null
          p_error_message: string
          p_generation_id: string
          p_provider_task_id: string | null
        }
        Returns: boolean
      }

               get_active_video_provider: {
        Args: never
        Returns: {
          configuration: Json
          default_model: string | null
          display_name: string
          priority: number
          provider_key: string
        }[]
      }

      get_video_generation_dry_run: {
        Args: {
          p_generation_id: string
        }
        Returns: {
          attempt_number: number
          duration_seconds: number | null
          estimated_cost_cents: number
          generation_id: string
          generation_status: string
          kling_prompt: string | null
          negative_prompt: string | null
          order_id: string
          order_status: string
          original_image_path: string | null
          provider_configuration: Json
          provider_default_model: string | null
          provider_display_name: string
          provider_enabled: boolean
          provider_key: string
          provider_priority: number
          provider_request_id: string
          provider_supports_image_to_video: boolean
          recommended_settings: Json | null
        }[]
      }

      is_vimmoai_admin: {
        Args: never
        Returns: boolean
      }

      queue_video_generation: {
        Args: {
          p_estimated_cost_cents: number
          p_idempotency_key: string
          p_order_id: string
        }
        Returns: {
          attempt_number: number
          created_at: string
          estimated_cost_cents: number
          generation_id: string
          order_id: string
          provider_request_id: string
          status: string
        }[]
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

type DatabaseWithoutInternals = Omit<
  Database,
  "__InternalSupabase"
>

type DefaultSchema =
  DatabaseWithoutInternals[
    Extract<keyof Database, "public">
  ]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (
        DefaultSchema["Tables"] &
        DefaultSchema["Views"]
      )
    | {
        schema: keyof DatabaseWithoutInternals
      },
  TableName extends
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof (
          DatabaseWithoutInternals[
            DefaultSchemaTableNameOrOptions["schema"]
          ]["Tables"] &
          DatabaseWithoutInternals[
            DefaultSchemaTableNameOrOptions["schema"]
          ]["Views"]
        )
      : never = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? (
        DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Tables"] &
        DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Views"]
      )[TableName] extends {
        Row: infer R
      }
      ? R
      : never
    : DefaultSchemaTableNameOrOptions extends keyof (
          DefaultSchema["Tables"] &
          DefaultSchema["Views"]
        )
      ? (
          DefaultSchema["Tables"] &
          DefaultSchema["Views"]
        )[DefaultSchemaTableNameOrOptions] extends {
          Row: infer R
        }
        ? R
        : never
      : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | {
        schema: keyof DatabaseWithoutInternals
      },
  TableName extends
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Tables"]
      : never = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"][TableName] extends {
        Insert: infer I
      }
      ? I
      : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][
          DefaultSchemaTableNameOrOptions
        ] extends {
          Insert: infer I
        }
        ? I
        : never
      : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | {
        schema: keyof DatabaseWithoutInternals
      },
  TableName extends
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Tables"]
      : never = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"][TableName] extends {
        Update: infer U
      }
      ? U
      : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][
          DefaultSchemaTableNameOrOptions
        ] extends {
          Update: infer U
        }
        ? U
        : never
      : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | {
        schema: keyof DatabaseWithoutInternals
      },
  EnumName extends
    DefaultSchemaEnumNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof DatabaseWithoutInternals[
          DefaultSchemaEnumNameOrOptions["schema"]
        ]["Enums"]
      : never = never,
> =
  DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaEnumNameOrOptions["schema"]
      ]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][
          DefaultSchemaEnumNameOrOptions
        ]
      : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | {
        schema: keyof DatabaseWithoutInternals
      },
  CompositeTypeName extends
    PublicCompositeTypeNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof DatabaseWithoutInternals[
          PublicCompositeTypeNameOrOptions["schema"]
        ]["CompositeTypes"]
      : never = never,
> =
  PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? DatabaseWithoutInternals[
        PublicCompositeTypeNameOrOptions["schema"]
      ]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][
          PublicCompositeTypeNameOrOptions
        ]
      : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
