import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente, Compra, EstadoCompra, Medicamento, Proveedor, Rol, Venta, VentaItem } from "./store";

const num = (v: unknown) => Number(v ?? 0);
const fail = (e: unknown) => {
  const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Error desconocido";
  toast.error("Error de base de datos", { description: msg });
};

// ---------- Auth / current user ----------
export interface Me {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  isAdmin: boolean;
}

export function useMe() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => setUid(data?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((ev: any, s: any) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED") setUid(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return useQuery({
    queryKey: ["me", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Me> => {
      const { data: u } = await supabase.auth.getUser();
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("nombre").eq("id", uid!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid!),
      ]);
      const isAdmin = (r ?? []).some((x: any) => x.role === "admin");
      return { id: uid!, email: u.user?.email ?? "", nombre: p?.nombre ?? "Usuario", rol: isAdmin ? "Administrador" : "Empleado", isAdmin };
    },
  }).data ?? null;
}

// ---------- Queries ----------
export const keys = { meds: ["meds"], prov: ["prov"], cli: ["cli"], ventas: ["ventas"], compras: ["compras"] } as const;

function useMeds() {
  return useQuery({
    queryKey: keys.meds,
    queryFn: async (): Promise<Medicamento[]> => {
      const { data, error } = await supabase.from("medicamentos").select("*").order("id");
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id, codigo: m.codigo, nombre: m.nombre, principio: m.principio, categoria: m.categoria,
        caducidad: m.caducidad, precioCompra: num(m.precio_compra), precioVenta: num(m.precio_venta), stock: m.stock,
      }));
    },
  });
}
function useProv() {
  return useQuery({
    queryKey: keys.prov,
    queryFn: async (): Promise<Proveedor[]> => {
      const { data, error } = await supabase.from("proveedores").select("*").order("id");
      if (error) throw error;
      return (data || []).map(({ created_at: _c, ...p }: any) => p);
    },
  });
}
function useClientes() {
  return useQuery({
    queryKey: keys.cli,
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase.from("clientes").select("id,nombre,telefono,nit,puntos").order("nombre");
      if (error) throw error;
      return data || [];
    },
  });
}
function useVentas() {
  return useQuery({
    queryKey: keys.ventas,
    queryFn: async (): Promise<Venta[]> => {
      const { data, error } = await supabase
        .from("ventas")
        .select("*, venta_detalle(med_id,nombre,cantidad,precio)")
        .order("fecha", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []).map((v: any) => ({
        uuid: v.id, id: v.codigo, fecha: v.fecha, subtotal: num(v.subtotal), descuento: num(v.descuento), descPct: num(v.desc_pct),
        iva: num(v.iva), total: num(v.total), vendedor: v.vendedor_nombre, vendedorId: v.vendedor_id, clienteId: v.cliente_id, puntos: v.puntos,
        items: (v.venta_detalle ?? []).map((d: any) => ({ medId: d.med_id ?? "", nombre: d.nombre, cantidad: d.cantidad, precio: num(d.precio) })),
      }));
    },
  });
}
function useCompras() {
  return useQuery({
    queryKey: keys.compras,
    queryFn: async (): Promise<Compra[]> => {
      const { data, error } = await supabase.from("compras").select("*").order("fecha", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id, codigo: c.codigo, fecha: c.fecha, proveedorId: c.proveedor_id ?? "", medId: c.med_id ?? "",
        cantidad: c.cantidad, costo: num(c.costo), estado: c.estado as EstadoCompra, nota: c.nota,
      }));
    },
  });
}

// ---------- Combined hook ----------
export function useData() {
  const qc = useQueryClient();
  const m = useMeds(), p = useProv(), c = useClientes(), v = useVentas(), cp = useCompras();
  const inv = (...ks: (readonly string[])[]) => ks.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const run = async (fn: () => PromiseLike<{ error: unknown }>, ...ks: (readonly string[])[]) => {
    const { error } = await fn();
    if (error) { fail(error); return false; }
    inv(...ks);
    return true;
  };

  const ventaMut = useMutation({
    mutationFn: async (a: { items: VentaItem[]; descPct: number; clienteId: string | null }) => {
      const { data, error } = await supabase.rpc("registrar_venta", {
        _items: a.items.map((i) => ({ med_id: i.medId, cantidad: i.cantidad })),
        _desc_pct: a.descPct,
        _cliente_id: a.clienteId as string,
      });
      if (error) throw error;
      return data as { id: string; codigo: string; fecha: string; total: number; puntos: number; subtotal: number; descuento: number; iva: number; desc_pct: number; vendedor_nombre: string };
    },
    onSuccess: () => inv(keys.ventas, keys.meds, keys.cli),
  });

  return {
    loading: m.isLoading || p.isLoading || c.isLoading || v.isLoading || cp.isLoading,
    error: m.error || p.error || c.error || v.error || cp.error,
    meds: m.data ?? [],
    proveedores: p.data ?? [],
    clientes: c.data ?? [],
    ventas: v.data ?? [],
    compras: cp.data ?? [],

    saveMed: (x: Medicamento) => {
      const row = { codigo: x.codigo, nombre: x.nombre, principio: x.principio, categoria: x.categoria, caducidad: x.caducidad, precio_compra: x.precioCompra, precio_venta: x.precioVenta, stock: x.stock };
      return run(() => (x.id ? supabase.from("medicamentos").update(row).eq("id", x.id) : supabase.from("medicamentos").insert(row)), keys.meds);
    },
    deleteMed: (id: string) => run(() => supabase.from("medicamentos").delete().eq("id", id).select("id").then(okIfDeleted), keys.meds),
    saveProv: (x: Proveedor) => {
      const { id, ...row } = x;
      return run(() => (id ? supabase.from("proveedores").update(row).eq("id", id) : supabase.from("proveedores").insert(row)), keys.prov);
    },
    deleteProv: (id: string) => run(() => supabase.from("proveedores").delete().eq("id", id).select("id").then(okIfDeleted), keys.prov),
    saveCliente: (x: Cliente) => {
      const row = { nombre: x.nombre, telefono: x.telefono, nit: x.nit };
      return run(() => (x.id ? supabase.from("clientes").update(row).eq("id", x.id) : supabase.from("clientes").insert(row)), keys.cli);
    },
    deleteCliente: (id: string) => run(() => supabase.from("clientes").delete().eq("id", id).select("id").then(okIfDeleted), keys.cli),
    registrarCompra: (x: { proveedorId: string; medId: string; cantidad: number; costo: number; estado: EstadoCompra; nota?: string }) =>
      run(() => supabase.from("compras").insert({ proveedor_id: x.proveedorId, med_id: x.medId, cantidad: x.cantidad, costo: x.costo, estado: x.estado, nota: x.nota ?? null }), keys.compras, keys.meds),
    recibirCompra: (id: string) => run(() => supabase.rpc("recibir_compra", { _id: id }), keys.compras, keys.meds),
    registrarVenta: async (items: VentaItem[], descPct: number, clienteId: string | null) => {
      try {
        return await ventaMut.mutateAsync({ items, descPct, clienteId });
      } catch (e) {
        fail(e);
        return null;
      }
    },
    vendiendo: ventaMut.isPending,
  };
}

/** RLS silently filters a forbidden delete; surface it as an error. */
function okIfDeleted({ data, error }: { data: unknown[] | null; error: unknown }) {
  if (error) return { error };
  if (!data?.length) return { error: new Error("Solo un Administrador puede eliminar registros") };
  return { error: null };
}
