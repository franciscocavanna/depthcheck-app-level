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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          alias_banco: string | null
          banco_preferido: string | null
          canal_preferido: string | null
          cbu_banco: string | null
          created_at: string | null
          cuit: string | null
          email: string | null
          hora_preferida_pago: string | null
          id: string
          razon_social: string
          telefono: string | null
        }
        Insert: {
          alias_banco?: string | null
          banco_preferido?: string | null
          canal_preferido?: string | null
          cbu_banco?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          hora_preferida_pago?: string | null
          id?: string
          razon_social: string
          telefono?: string | null
        }
        Update: {
          alias_banco?: string | null
          banco_preferido?: string | null
          canal_preferido?: string | null
          cbu_banco?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          hora_preferida_pago?: string | null
          id?: string
          razon_social?: string
          telefono?: string | null
        }
        Relationships: []
      }
      cobranzas: {
        Row: {
          banco_origen: string | null
          cbu_origen: string | null
          cliente_id: string
          concepto: string | null
          conciliacion_estado: string | null
          created_at: string | null
          factura_id: string | null
          fecha_pago: string
          fuente: string | null
          id: string
          metodo: string | null
          moneda: string | null
          monto: number
          raw: Json | null
          referencia_detectada: string | null
        }
        Insert: {
          banco_origen?: string | null
          cbu_origen?: string | null
          cliente_id: string
          concepto?: string | null
          conciliacion_estado?: string | null
          created_at?: string | null
          factura_id?: string | null
          fecha_pago: string
          fuente?: string | null
          id?: string
          metodo?: string | null
          moneda?: string | null
          monto: number
          raw?: Json | null
          referencia_detectada?: string | null
        }
        Update: {
          banco_origen?: string | null
          cbu_origen?: string | null
          cliente_id?: string
          concepto?: string | null
          conciliacion_estado?: string | null
          created_at?: string | null
          factura_id?: string | null
          fecha_pago?: string
          fuente?: string | null
          id?: string
          metodo?: string | null
          moneda?: string | null
          monto?: number
          raw?: Json | null
          referencia_detectada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobranzas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobranzas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          alias_empresa: string | null
          cbu_empresa: string | null
          created_at: string | null
          cuit_empresa: string | null
          formato_referencia_ej: string | null
          horario_contacto_fin: string | null
          horario_contacto_inicio: string | null
          id: string
          tolerancia_monto_porcentual: number | null
          updated_at: string | null
          ventana_dias_match: number | null
        }
        Insert: {
          alias_empresa?: string | null
          cbu_empresa?: string | null
          created_at?: string | null
          cuit_empresa?: string | null
          formato_referencia_ej?: string | null
          horario_contacto_fin?: string | null
          horario_contacto_inicio?: string | null
          id?: string
          tolerancia_monto_porcentual?: number | null
          updated_at?: string | null
          ventana_dias_match?: number | null
        }
        Update: {
          alias_empresa?: string | null
          cbu_empresa?: string | null
          created_at?: string | null
          cuit_empresa?: string | null
          formato_referencia_ej?: string | null
          horario_contacto_fin?: string | null
          horario_contacto_inicio?: string | null
          id?: string
          tolerancia_monto_porcentual?: number | null
          updated_at?: string | null
          ventana_dias_match?: number | null
        }
        Relationships: []
      }
      facturas: {
        Row: {
          cliente_id: string
          created_at: string | null
          estado: string | null
          fecha_emision: string
          fecha_vencimiento: string
          id: string
          moneda: string | null
          monto: number
          notas: string | null
          numero: string
          referencia_pago: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          estado?: string | null
          fecha_emision: string
          fecha_vencimiento: string
          id?: string
          moneda?: string | null
          monto: number
          notas?: string | null
          numero: string
          referencia_pago?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          estado?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string
          id?: string
          moneda?: string | null
          monto?: number
          notas?: string | null
          numero?: string
          referencia_pago?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      interacciones: {
        Row: {
          canal: string | null
          cliente_id: string
          created_at: string | null
          factura_id: string | null
          fecha: string | null
          id: string
          mensaje_enviado: string | null
          meta_json: Json | null
          plantilla: string | null
          resultado: string | null
        }
        Insert: {
          canal?: string | null
          cliente_id: string
          created_at?: string | null
          factura_id?: string | null
          fecha?: string | null
          id?: string
          mensaje_enviado?: string | null
          meta_json?: Json | null
          plantilla?: string | null
          resultado?: string | null
        }
        Update: {
          canal?: string | null
          cliente_id?: string
          created_at?: string | null
          factura_id?: string | null
          fecha?: string | null
          id?: string
          mensaje_enviado?: string | null
          meta_json?: Json | null
          plantilla?: string | null
          resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interacciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacciones_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          pasos_json: Json
          trigger: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          pasos_json: Json
          trigger?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          pasos_json?: Json
          trigger?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promesas: {
        Row: {
          canal_origen: string | null
          cliente_id: string
          created_at: string | null
          estado: string | null
          factura_id: string
          fecha_promesa: string
          id: string
          monto_promesa: number
          notas: string | null
        }
        Insert: {
          canal_origen?: string | null
          cliente_id: string
          created_at?: string | null
          estado?: string | null
          factura_id: string
          fecha_promesa: string
          id?: string
          monto_promesa: number
          notas?: string | null
        }
        Update: {
          canal_origen?: string | null
          cliente_id?: string
          created_at?: string | null
          estado?: string | null
          factura_id?: string
          fecha_promesa?: string
          id?: string
          monto_promesa?: number
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promesas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promesas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      reglas_conciliacion: {
        Row: {
          activa: boolean | null
          created_at: string | null
          id: string
          parametros_json: Json | null
          prioridad: number
          tipo: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          id?: string
          parametros_json?: Json | null
          prioridad: number
          tipo?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          id?: string
          parametros_json?: Json | null
          prioridad?: number
          tipo?: string | null
        }
        Relationships: []
      }
      scores_clientes: {
        Row: {
          actualizado_at: string | null
          cliente_id: string
          pay_score: number | null
        }
        Insert: {
          actualizado_at?: string | null
          cliente_id: string
          pay_score?: number | null
        }
        Update: {
          actualizado_at?: string | null
          cliente_id?: string
          pay_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_facturas: {
        Row: {
          actualizado_at: string | null
          factura_id: string
          inv_score: number | null
        }
        Insert: {
          actualizado_at?: string | null
          factura_id: string
          inv_score?: number | null
        }
        Update: {
          actualizado_at?: string | null
          factura_id?: string
          inv_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_facturas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: true
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "cobranzas" | "visor"
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
      app_role: ["owner", "cobranzas", "visor"],
    },
  },
} as const
