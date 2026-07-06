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
      academic_years: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          label?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          cohort_id: string | null
          company_id: string | null
          created_at: string
          domain_id: string | null
          file_url: string | null
          id: string
          name: string
          reference_features: Json
        }
        Insert: {
          cohort_id?: string | null
          company_id?: string | null
          created_at?: string
          domain_id?: string | null
          file_url?: string | null
          id?: string
          name: string
          reference_features?: Json
        }
        Update: {
          cohort_id?: string | null
          company_id?: string | null
          created_at?: string
          domain_id?: string | null
          file_url?: string | null
          id?: string
          name?: string
          reference_features?: Json
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_types: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      certificate_versions: {
        Row: {
          certificate_id: string
          created_at: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          certificate_id: string
          created_at?: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          certificate_id?: string
          created_at?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_versions_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          ai_authenticity: number | null
          ai_confidence: number | null
          ai_issues: Json
          ai_summary: Json
          certificate_number: string | null
          certificate_type_id: string | null
          cohort_id: string | null
          company_id: string | null
          completion_date: string | null
          created_at: string
          domain_id: string | null
          extracted_data: Json
          file_mime: string | null
          file_size: number | null
          file_url: string
          id: string
          issue_date: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          student_id: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          ai_authenticity?: number | null
          ai_confidence?: number | null
          ai_issues?: Json
          ai_summary?: Json
          certificate_number?: string | null
          certificate_type_id?: string | null
          cohort_id?: string | null
          company_id?: string | null
          completion_date?: string | null
          created_at?: string
          domain_id?: string | null
          extracted_data?: Json
          file_mime?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          issue_date?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          student_id: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          ai_authenticity?: number | null
          ai_confidence?: number | null
          ai_issues?: Json
          ai_summary?: Json
          certificate_number?: string | null
          certificate_type_id?: string | null
          cohort_id?: string | null
          company_id?: string | null
          completion_date?: string | null
          created_at?: string
          domain_id?: string | null
          extracted_data?: Json
          file_mime?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          issue_date?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          student_id?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_certificate_type_id_fkey"
            columns: ["certificate_type_id"]
            isOneToOne: false
            referencedRelation: "certificate_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          academic_year_id: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      domains: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          student_id: string | null
          submitted_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          student_id?: string | null
          submitted_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          student_id?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          schema: Json
          slug: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          schema?: Json
          slug: string
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          schema?: Json
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          academic_year_id: string | null
          created_at: string
          id: string
          is_current: boolean
          label: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          label: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      students: {
        Row: {
          academic_year_id: string | null
          cohort_id: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          meta: Json
          phone: string | null
          profile_id: string | null
          program_id: string | null
          roll_number: string
          section: string | null
          semester_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          cohort_id?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          meta?: Json
          phone?: string | null
          profile_id?: string | null
          program_id?: string | null
          roll_number: string
          section?: string | null
          semester_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          cohort_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          meta?: Json
          phone?: string | null
          profile_id?: string | null
          program_id?: string | null
          roll_number?: string
          section?: string | null
          semester_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          scope_department_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          scope_department_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          scope_department_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_logs: {
        Row: {
          action: string
          actor_id: string | null
          certificate_id: string
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          payload: Json
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          certificate_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          certificate_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _perm: string; _user: string }
        Returns: boolean
      }
      has_role_slug: {
        Args: { _slug: string; _user: string }
        Returns: boolean
      }
      is_admin: { Args: { _user: string }; Returns: boolean }
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
