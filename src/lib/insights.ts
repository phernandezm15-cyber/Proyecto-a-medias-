import { diasParaVencer, type Compra, type Medicamento, type Proveedor, type Venta } from "./store";

export interface Insight {
  icon: string;
  text: string;
}

export function suggestedSupplier(medId: string, compras: Compra[], proveedores: Proveedor[]) {
  const last = compras.filter((c) => c.medId === medId).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  return { proveedor: proveedores.find((p) => p.id === last?.proveedorId) ?? proveedores[0], costo: last?.costo };
}

export function buildInsights(meds: Medicamento[], ventas: Venta[], compras: Compra[], proveedores: Proveedor[]): Insight[] {
  const out: Insight[] = [];
  const since = Date.now() - 7 * 86400000;
  const qty: Record<string, number> = {};
  ventas.filter((v) => new Date(v.fecha).getTime() >= since).forEach((v) => v.items.forEach((i) => (qty[i.medId] = (qty[i.medId] ?? 0) + i.cantidad)));
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const m = meds.find((x) => x.id === top[0]);
    if (m) {
      const { proveedor } = suggestedSupplier(m.id, compras, proveedores);
      out.push({ icon: "💡", text: `${m.nombre} se está vendiendo rápido (${top[1]} uds. en 7 días). Te sugerimos comprar 50 unidades más a ${proveedor?.empresa ?? "tu proveedor"}.` });
    }
  }
  const crit = meds.filter((m) => m.stock < 10).sort((a, b) => a.stock - b.stock);
  if (crit.length) out.push({ icon: "⚠️", text: `${crit.length} productos en stock crítico. Prioriza reponer ${crit.slice(0, 2).map((m) => `${m.nombre} (${m.stock})`).join(" y ")}.` });
  const venc = meds.filter((m) => { const d = diasParaVencer(m.caducidad); return d >= 0 && d <= 30; });
  if (venc.length) out.push({ icon: "🏷️", text: `${venc.map((m) => m.nombre).slice(0, 2).join(", ")} vence pronto. Considera una promoción del 10% para rotarlo.` });
  const pend = compras.filter((c) => c.estado === "Pendiente").length;
  if (pend) out.push({ icon: "📦", text: `Tienes ${pend} compras pendientes de recibir. Confírmalas para actualizar el stock.` });
  if (!out.length) out.push({ icon: "✅", text: "Todo en orden. El inventario está saludable." });
  return out.slice(0, 4);
}
