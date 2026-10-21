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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          created_at: string
          id: string
          nit: string
          nombre: string
          puntos: number
          telefono: string
        }
        Insert: {
          created_at?: string
          id?: string
          nit?: string
          nombre: string
          puntos?: number
          telefono?: string
        }
        Update: {
          created_at?: string
          id?: string
          nit?: string
          nombre?: string
          puntos?: number
          telefono?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          cantidad: number
          codigo: string
          costo: number
          estado: string
          fecha: string
          id: string
          med_id: string | null
          nota: string | null
          proveedor_id: string | null
        }
        Insert: {
          cantidad: number
          codigo?: string
          costo: number
          estado?: string
          fecha?: string
          id?: string
          med_id?: string | null
          nota?: string | null
          proveedor_id?: string | null
        }
        Update: {
          cantidad?: number
          codigo?: string
          costo?: number
          estado?: string
          fecha?: string
          id?: string
          med_id?: string | null
          nota?: string | null
          proveedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_med_id_fkey"
            columns: ["med_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          caducidad: string
          categoria: string
          codigo: string
          created_at: string
          id: string
          nombre: string
          precio_compra: number
          precio_venta: number
          principio: string
          stock: number
        }
        Insert: {
          caducidad: string
          categoria: string
          codigo?: string
          created_at?: string
          id?: string
          nombre: string
          precio_compra?: number
          precio_venta?: number
          principio?: string
          stock?: number
        }
        Update: {
          caducidad?: string
          categoria?: string
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          precio_compra?: number
          precio_venta?: number
          principio?: string
          stock?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id: string
          nombre?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          contacto: string
          correo: string
          created_at: string
          direccion: string
          empresa: string
          id: string
          telefono: string
        }
        Insert: {
          contacto?: string
          correo?: string
          created_at?: string
          direccion?: string
          empresa: string
          id?: string
          telefono?: string
        }
        Update: {
          contacto?: string
          correo?: string
          created_at?: string
          direccion?: string
          empresa?: string
          id?: string
          telefono?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venta_detalle: {
        Row: {
          cantidad: number
          id: string
          med_id: string | null
          nombre: string
          precio: number
          venta_id: string
        }
        Insert: {
          cantidad: number
          id?: string
          med_id?: string | null
          nombre: string
          precio: number
          venta_id: string
        }
        Update: {
          cantidad?: number
          id?: string
          med_id?: string | null
          nombre?: string
          precio?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_detalle_med_id_fkey"
            columns: ["med_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_detalle_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          cliente_id: string | null
          codigo: string
          desc_pct: number
          descuento: number
          fecha: string
          id: string
          iva: number
          puntos: number
          subtotal: number
          total: number
          vendedor_id: string | null
          vendedor_nombre: string
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string
          desc_pct?: number
          descuento?: number
          fecha?: string
          id?: string
          iva?: number
          puntos?: number
          subtotal?: number
          total?: number
          vendedor_id?: string | null
          vendedor_nombre?: string
        }
        Update: {
          cliente_id?: string | null
          codigo?: string
          desc_pct?: number
          descuento?: number
          fecha?: string
          id?: string
          iva?: number
          puntos?: number
          subtotal?: number
          total?: number
          vendedor_id?: string | null
          vendedor_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
      recibir_compra: { Args: { _id: string }; Returns: undefined }
      registrar_venta: {
        Args: { _cliente_id: string; _desc_pct: number; _items: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "empleado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "empleado"],
    },
  },
} as const
