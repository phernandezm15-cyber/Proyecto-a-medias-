import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { DollarSign, Package, AlertTriangle, Truck, Target, Sparkles, Trophy, Zap, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton, useFakeLoading } from "@/components/PageSkeleton";
import { q, fmtFechaHora, META_DIARIA } from "@/lib/store";
import { useData, useMe } from "@/lib/db";
import { buildInsights, suggestedSupplier } from "@/lib/insights";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FarmaciaDB" },
      { name: "description", content: "Ventas en vivo, predicciones de stock, horas pico y ranking de empleados." },
      { property: "og:title", content: "Dashboard — FarmaciaDB" },
      { property: "og:description", content: "Ventas en vivo, predicciones de stock, horas pico y ranking de empleados." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" };
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const XP_NIVEL = 500;

function Dashboard() {
  const fake = useFakeLoading();
  const me = useMe();
  const { meds, ventas, proveedores, compras, loading, registrarCompra } = useData();
  const today = new Date().toDateString();
  const ventasHoyList = ventas.filter((v) => new Date(v.fecha).toDateString() === today);
  const ventasHoy = ventasHoyList.reduce((s, v) => s + v.total, 0);
  const alertas = meds.filter((m) => m.stock < 10).length;

  const chart = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toDateString();
      const total = ventas.filter((v) => new Date(v.fecha).toDateString() === key).reduce((s, v) => s + v.total, 0);
      return { dia: d.toLocaleDateString("es-GT", { weekday: "short", day: "numeric" }), total: Math.round(total * 100) / 100 };
    }),
    [ventas],
  );

  const porCategoria = useMemo(() => {
    const catOf = Object.fromEntries(meds.map((m) => [m.id, m.categoria]));
    const acc: Record<string, number> = {};
    ventas.forEach((v) => v.items.forEach((i) => { const c = catOf[i.medId] ?? "Otros"; acc[c] = (acc[c] ?? 0) + i.precio * i.cantidad; }));
    const sorted = Object.entries(acc).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5).map(([name, value]) => ({ name, value: Math.round(value) }));
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    return rest ? [...top, { name: "Otros", value: Math.round(rest) }] : top;
  }, [ventas, meds]);

  const heat = useMemo(() => {
    const acc: Record<string, number> = {};
    ventas.forEach((v) => { const d = new Date(v.fecha); const k = `${d.getDay()}-${d.getHours()}`; acc[k] = (acc[k] ?? 0) + 1; });
    return Object.entries(acc).map(([k, n]) => { const [d, h] = k.split("-").map(Number); return { dia: d, hora: h, n }; });
  }, [ventas]);
  const maxHeat = Math.max(1, ...heat.map((h) => h.n));

  const predicciones = useMemo(() => {
    const since = Date.now() - 14 * 86400000;
    const qty: Record<string, number> = {};
    ventas.filter((v) => new Date(v.fecha).getTime() >= since).forEach((v) => v.items.forEach((i) => (qty[i.medId] = (qty[i.medId] ?? 0) + i.cantidad)));
    return meds
      .map((m) => ({ m, rate: (qty[m.id] ?? 0) / 14 }))
      .filter((x) => x.rate > 0)
      .map((x) => ({ ...x, dias: Math.floor(x.m.stock / x.rate) }))
      .filter((x) => x.dias <= 14)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 4);
  }, [ventas, meds]);

  const ranking = useMemo(() => {
    const now = new Date();
    const acc: Record<string, number> = {};
    ventas.filter((v) => { const d = new Date(v.fecha); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .forEach((v) => (acc[v.vendedor] = (acc[v.vendedor] ?? 0) + v.total));
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [ventas]);

  const insights = useMemo(() => buildInsights(meds, ventas, compras, proveedores), [meds, ventas, compras, proveedores]);

  if (fake || loading) return <PageSkeleton />;

  const misVentasHoy = ventasHoyList.filter((v) => v.vendedorId === me?.id).reduce((s, v) => s + v.total, 0);
  const xp = Math.floor(misVentasHoy / 10);
  const nivel = Math.floor(xp / XP_NIVEL) + 1;
  const metaPct = Math.min(100, (ventasHoy / META_DIARIA) * 100);

  const generarOrden = async (medId: string, nombre: string) => {
    const s = suggestedSupplier(medId, compras, proveedores);
    const m = meds.find((x) => x.id === medId)!;
    if (await registrarCompra({ proveedorId: s.proveedor?.id ?? "", medId, cantidad: 50, costo: s.costo ?? m.precioCompra, estado: "Pendiente", nota: "Generada por predicción IA" }))
      toast.success("Orden de compra generada", { description: `50 uds. de ${nombre} a ${s.proveedor?.empresa}` });
  };

  const kpis = [
    { label: "Ventas del Día", value: q(ventasHoy), icon: DollarSign, tone: "text-success" },
    { label: "Productos Totales", value: meds.length, icon: Package, tone: "text-primary" },
    { label: "Alertas de Stock", value: alertas, icon: AlertTriangle, tone: "text-destructive", danger: true },
    { label: "Proveedores Activos", value: proveedores.length, icon: Truck, tone: "text-warning" },
  ];

  return (
    <div>
      <PageHeader title="Panel de Control" subtitle="Datos en vivo desde la base de datos" />

      <div className="glass mb-6 rounded-2xl p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold"><Target className="h-5 w-5 text-primary" /> Meta del Día: {q(META_DIARIA)}</div>
          <span className="text-sm text-muted-foreground">{q(ventasHoy)} · <span className="font-bold text-foreground">{metaPct.toFixed(0)}%</span></span>
        </div>
        <Progress value={metaPct} className="h-3" />
        {metaPct >= 100 && <p className="mt-2 text-sm font-semibold text-success">🎉 ¡Meta alcanzada!</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass lift relative overflow-hidden rounded-2xl p-5">
            <k.icon className={`pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 opacity-10 ${k.tone}`} strokeWidth={1.5} />
            <div className="relative flex items-center gap-3"><k.icon className={`h-6 w-6 ${k.tone}`} /><p className="text-sm font-medium text-muted-foreground">{k.label}</p></div>
            <p className={`relative mt-3 truncate text-3xl font-extrabold ${k.danger ? "text-destructive" : ""}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="ai-border rounded-2xl">
          <div className="glass h-full rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary" /> Sugerencias del Sistema</h2>
            <ul className="space-y-2.5">
              {insights.map((i, n) => (
                <li key={n} className="flex gap-3 rounded-xl bg-card/60 p-3 text-sm animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${n * 80}ms` }}>
                  <span className="text-lg leading-none">{i.icon}</span><span>{i.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><TrendingDown className="h-5 w-5 text-destructive" /> Alertas Predictivas</h2>
          {!predicciones.length && <p className="py-6 text-center text-sm text-muted-foreground">Ningún producto se agotará en las próximas 2 semanas.</p>}
          <ul className="space-y-2.5">
            {predicciones.map(({ m, dias }) => (
              <li key={m.id} className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>🔴 <b>Predicción:</b> “{m.nombre}” se agotará en <b>{dias <= 0 ? "menos de 1" : dias} {dias === 1 ? "día" : "días"}</b> (stock {m.stock}).</span>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => generarOrden(m.id, m.nombre)}>Generar orden de compra</Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {me?.isAdmin && (
        <div className="glass mt-6 grid gap-6 rounded-2xl p-5 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Trophy className="h-5 w-5 text-warning" /> Empleado del Mes</h2>
            <ol className="space-y-2">
              {ranking.map(([n, t], i) => (
                <li key={n} className={`flex items-center justify-between rounded-xl p-3 ${i === 0 ? "bg-warning/15 font-bold" : "bg-card/60"}`}>
                  <span>{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {n}</span><span>{q(t)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Zap className="h-5 w-5 text-primary" /> Tu experiencia de hoy</h2>
            <div className="rounded-xl bg-card/60 p-4">
              <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">Nivel {nivel}</span><span>{xp % XP_NIVEL} / {XP_NIVEL} XP</span></div>
              <Progress value={((xp % XP_NIVEL) / XP_NIVEL) * 100} className="h-3" />
              <p className="mt-2 text-xs text-muted-foreground">Ganas 1 XP por cada Q10 vendidos. Ventas tuyas hoy: {q(misVentasHoy)}.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-lg font-bold">Ventas últimos 7 días</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v: any) => q(Number(v || 0))} contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="total" name="Total" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-lg font-bold">Ventas por Categoría</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3} stroke="none">
                  {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => q(Number(v || 0))} contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl p-5">
        <h2 className="mb-1 text-lg font-bold">Mapa de calor: horas pico de venta</h2>
        <p className="mb-4 text-xs text-muted-foreground">Cada punto es una franja día/hora; más grande e intenso = más ventas.</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 0, right: 10 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="hora" domain={[7, 21]} ticks={[7, 9, 11, 13, 15, 17, 19, 21]} tickFormatter={(h) => `${h}:00`} stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis type="number" dataKey="dia" domain={[-0.5, 6.5]} ticks={[0, 1, 2, 3, 4, 5, 6]} tickFormatter={(d) => DIAS[d] ?? ""} stroke="var(--muted-foreground)" fontSize={12} reversed />
              <ZAxis type="number" dataKey="n" range={[80, 700]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any, k: any) => (k === "n" ? [`${v} ventas`, "Ventas"] : [v, k])} labelFormatter={() => ""} />
              <Scatter data={heat}>
                {heat.map((h, i) => <Cell key={i} fill="var(--chart-1)" fillOpacity={0.25 + 0.75 * (h.n / maxHeat)} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl p-5">
        <h2 className="mb-4 text-lg font-bold">Últimas 5 ventas realizadas</h2>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Fecha</TableHead><TableHead>Productos</TableHead><TableHead>Vendedor</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {ventas.slice(0, 5).map((v) => (
              <TableRow key={v.uuid}>
                <TableCell className="font-medium">{v.id}</TableCell>
                <TableCell>{fmtFechaHora(v.fecha)}</TableCell>
                <TableCell className="max-w-[260px] truncate">{v.items.map((i) => `${i.nombre} x${i.cantidad}`).join(", ")}</TableCell>
                <TableCell>{v.vendedor}</TableCell>
                <TableCell className="text-right font-semibold">{q(v.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
