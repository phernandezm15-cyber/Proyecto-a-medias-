import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Rol = "Administrador" | "Empleado";
export interface Medicamento {
  id: string;
  codigo: string;
  nombre: string;
  principio: string;
  categoria: string;
  caducidad: string; // yyyy-mm-dd
  precioCompra: number;
  precioVenta: number;
  stock: number;
}
export interface Proveedor {
  id: string;
  empresa: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion: string;
}
export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  nit: string;
  puntos: number;
}
export interface VentaItem {
  medId: string;
  nombre: string;
  cantidad: number;
  precio: number;
}
export interface Venta {
  uuid: string;
  id: string; // display code
  fecha: string;
  items: VentaItem[];
  subtotal: number;
  descuento: number;
  descPct: number;
  iva: number;
  total: number;
  vendedor: string;
  vendedorId: string | null;
  clienteId: string | null;
  puntos: number;
}
export type EstadoCompra = "Completado" | "Pendiente";
export interface Compra {
  id: string;
  codigo: string;
  fecha: string;
  proveedorId: string;
  medId: string;
  cantidad: number;
  costo: number;
  estado: EstadoCompra;
  nota?: string | null;
}

export const CATEGORIAS = [
  "Analgésicos",
  "Antibióticos",
  "Antiinflamatorios",
  "Antihistamínicos",
  "Gastrointestinal",
  "Cardiovascular",
  "Vitaminas",
  "Respiratorio",
  "Dermatológicos",
  "Diabetes",
];
export const IVA_RATE = 0.12;
export const META_DIARIA = 2000;
const DAY = 86400000;

export function calcTotals(items: VentaItem[], descPct: number) {
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const descuento = subtotal * (descPct / 100);
  const base = subtotal - descuento;
  const iva = base * IVA_RATE;
  return { subtotal, descuento, iva, total: base + iva };
}
export const puntosPor = (total: number) => Math.floor(total / 100) * 5;

export const q = (n: number) => `Q ${n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtFecha = (s: string) =>
  new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
export const fmtFechaHora = (s: string) =>
  new Date(s).toLocaleString("es-GT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const diasParaVencer = (f: string) => Math.ceil((new Date(f + "T12:00:00").getTime() - Date.now()) / DAY);

export type EstadoMed = "Óptimo" | "Por Vencer" | "Crítico";
export const estadoMed = (m: Medicamento): EstadoMed =>
  m.stock < 10 || diasParaVencer(m.caducidad) < 0 ? "Crítico" : diasParaVencer(m.caducidad) <= 30 ? "Por Vencer" : "Óptimo";
export const estadoVariant = { "Óptimo": "success", "Por Vencer": "warning", "Crítico": "danger" } as const;

/** UI-only preferences kept in the browser. All business data lives in the database. */
interface UIState {
  dark: boolean;
  toggleDark: () => void;
  focus: boolean;
  setFocus: (v: boolean) => void;
}
export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggleDark: () => set({ dark: !get().dark }),
      focus: false,
      setFocus: (focus) => set({ focus }),
    }),
    { name: "farmaciadb-ui", partialize: (s) => ({ dark: s.dark }) as UIState },
  ),
);
