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
        Args: { p_order_id: string }
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
        Args: { p_order_id: string; p_original_image_path: string }
        Returns: boolean
      }
      delete_draft_order: { Args: { p_order_id: string }; Returns: boolean }
      fail_order_analysis: {
        Args: { p_error: string; p_order_id: string }
        Returns: boolean
      }
      is_vimmoai_admin: { Args: never; Returns: boolean }
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
