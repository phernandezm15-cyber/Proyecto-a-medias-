import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, FileSpreadsheet, FileDown, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { endOfDay, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton, TableSkeleton, useDebouncedLoading, useFakeLoading } from "@/components/PageSkeleton";
import { estadoMed, fmtFecha, fmtFechaHora, q } from "@/lib/store";
import { useData, useMe } from "@/lib/db";
import { exportCSV, exportPDF, exportXLSX, type Sheet } from "@/lib/export";
import { Badge } from "@/components/ui/badge";
import { Lock, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_app/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — FarmaciaDB" },
      { name: "description", content: "Reportes filtrados por fecha exportables a PDF, Excel y CSV." },
      { property: "og:title", content: "Reportes — FarmaciaDB" },
      { property: "og:description", content: "Reportes filtrados por fecha exportables a PDF, Excel y CSV." },
    ],
  }),
  component: Reportes,
});

type Tipo = "ventas" | "inventario";

function Reportes() {
  const loading = useFakeLoading();
  const me = useMe();
  const isAdmin = !!me?.isAdmin;
  const { ventas, meds, loading: dbLoading } = useData();
  const [tipo, setTipo] = useState<Tipo>("ventas");
  const [range, setRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  const tableLoading = useDebouncedLoading([tipo, range?.from?.getTime(), range?.to?.getTime()]);

  const from = range?.from ? startOfDay(range.from).getTime() : -Infinity;
  const to = range?.to ? endOfDay(range.to).getTime() : range?.from ? endOfDay(range.from).getTime() : Infinity;
  const inRange = (d: string) => { const t = new Date(d.length === 10 ? d + "T12:00:00" : d).getTime(); return t >= from && t <= to; };

  const ventasF = useMemo(() => ventas.filter((v) => inRange(v.fecha)), [ventas, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const medsF = useMemo(() => meds.filter((m) => inRange(m.caducidad)), [meds, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const rangoTxt = range?.from
    ? `${format(range.from, "dd MMM yyyy", { locale: es })} – ${format(range.to ?? range.from, "dd MMM yyyy", { locale: es })}`
    : "Todas las fechas";

  const totalV = ventasF.reduce((s, v) => s + v.total, 0);
  const valorInv = medsF.reduce((s, m) => s + m.stock * m.precioCompra, 0);

  const sheet = (): Sheet =>
    tipo === "ventas"
      ? {
          name: "Ventas",
          subtitle: `Rango: ${rangoTxt} · ${ventasF.length} ventas`,
          headers: ["ID", "Fecha", "Vendedor", "Productos", "Subtotal (Q)", "Descuento (Q)", "IVA (Q)", "Total (Q)"],
          rows: ventasF.map((v) => [v.id, fmtFechaHora(v.fecha), v.vendedor, v.items.map((i) => `${i.nombre} x${i.cantidad}`).join("; "), +v.subtotal.toFixed(2), +v.descuento.toFixed(2), +v.iva.toFixed(2), +v.total.toFixed(2)]),
          totals: ["TOTAL", "", "", "", +ventasF.reduce((s, v) => s + v.subtotal, 0).toFixed(2), +ventasF.reduce((s, v) => s + v.descuento, 0).toFixed(2), +ventasF.reduce((s, v) => s + v.iva, 0).toFixed(2), +totalV.toFixed(2)],
        }
      : {
          name: "Inventario",
          subtitle: `Vencimiento en rango: ${rangoTxt} · ${medsF.length} productos`,
          headers: ["ID", "Código", "Nombre", "Categoría", "Vencimiento", "Precio compra (Q)", "Precio venta (Q)", "Stock", "Estado"],
          rows: medsF.map((m) => [m.id, m.codigo, m.nombre, m.categoria, m.caducidad, m.precioCompra, m.precioVenta, m.stock, estadoMed(m)]),
          totals: ["TOTAL", "", "", "", "", "", "", medsF.reduce((s, m) => s + m.stock, 0), `Valor ${q(valorInv)}`],
        };

  const file = `FarmaciaDB_${tipo}_${new Date().toISOString().slice(0, 10)}`;
  const run = (fn: () => void, label: string) => {
    const count = tipo === "ventas" ? ventasF.length : medsF.length;
    if (!count) return void toast.warning("No hay datos en el rango seleccionado");
    try {
      fn();
      toast.success(`Reporte exportado a ${label}`, { description: `${count} registros` });
    } catch {
      toast.error(`No se pudo exportar a ${label}`);
    }
  };

  const presets = [
    { label: "Hoy", r: () => ({ from: new Date(), to: new Date() }) },
    { label: "Últimos 7 días", r: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: "Este Mes", r: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  ];

  if (loading || dbLoading) return <PageSkeleton cards={0} />;

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Reportes Financieros & Ventas" : "Corte de Turno & Arqueo de Ventas"}
        subtitle={
          tipo === "ventas"
            ? `${ventasF.length} ventas en rango · Total ${q(totalV)}`
            : `${medsF.length} productos · Valor ${q(valorInv)}`
        }
        actions={
          <>
            <Button
              variant="destructive"
              size="lg"
              className="hover:-translate-y-0.5"
              onClick={() => run(() => exportPDF(`Reporte de ${sheet().name} — FarmaciaDB`, [sheet()], file), "PDF")}
            >
              <FileText /> Exportar PDF
            </Button>
            <Button variant="success" size="lg" onClick={() => run(() => exportXLSX([sheet()], file), "Excel")}>
              <FileSpreadsheet /> Exportar Excel
            </Button>
            <Button size="lg" onClick={() => run(() => exportCSV([sheet()], file), "CSV")}>
              <FileDown /> Exportar CSV
            </Button>
          </>
        }
      />

      {/* ROL BANNER */}
      {!isAdmin ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
              👤
            </span>
            <div>
              <span className="font-bold">Vista de Empleado (Corte de Turno):</span> Consulta de ventas y recaudación para arqueo de caja. Los balances generales y costos de compras al mayoreo están reservados para la Administración.
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shrink-0 hidden sm:inline-flex">
            Corte de Turno
          </Badge>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-3 flex items-center justify-between text-xs text-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary flex items-center gap-1">👑 Modo Administrador Total:</span>
            <span className="text-muted-foreground">Acceso irrestricto a balances financieros, costo valorizado de inventario y exportaciones oficiales.</span>
          </div>
          <Badge className="bg-primary/20 text-primary border border-primary/40 shrink-0 hidden sm:inline-flex">
            Acceso Financiero Total
          </Badge>
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
            <SelectTrigger className="lg:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ventas">Reporte de Ventas</SelectItem>
              {isAdmin ? (
                <SelectItem value="inventario">Reporte de Inventario (Costos)</SelectItem>
              ) : (
                <SelectItem value="inventario" disabled>
                  🔒 Reporte de Inventario (Solo Admin)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start font-normal lg:w-72">
                <CalendarIcon /> {rangoTxt}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} locale={es} defaultMonth={range?.from} className="pointer-events-auto p-3" />
            </PopoverContent>
          </Popover>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button key={p.label} variant="secondary" size="sm" onClick={() => setRange(p.r())}>{p.label}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setRange(undefined)}>Todo</Button>
          </div>
        </div>
        {tipo === "inventario" && <p className="mb-3 text-xs text-muted-foreground">El rango filtra por fecha de vencimiento.</p>}

        {tableLoading ? (
          <TableSkeleton rows={8} />
        ) : tipo === "ventas" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="animate-in fade-in duration-300">
              {ventasF.map((v) => (
                <TableRow key={v.uuid}>
                  <TableCell className="font-medium">{v.id}</TableCell>
                  <TableCell>{fmtFechaHora(v.fecha)}</TableCell>
                  <TableCell>{v.vendedor}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{v.items.map((i) => `${i.nombre} x${i.cantidad}`).join(", ")}</TableCell>
                  <TableCell className="text-right">{q(v.subtotal)}</TableCell>
                  <TableCell className="text-right">{q(v.iva)}</TableCell>
                  <TableCell className="text-right font-semibold">{q(v.total)}</TableCell>
                </TableRow>
              ))}
              {!ventasF.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin ventas en este rango</TableCell></TableRow>}
              {!!ventasF.length && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6}>Total</TableCell>
                  <TableCell className="text-right text-primary">{q(totalV)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Precio venta</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="animate-in fade-in duration-300">
              {medsF.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.id}</TableCell>
                  <TableCell>{m.nombre}</TableCell>
                  <TableCell>{m.categoria}</TableCell>
                  <TableCell>{fmtFecha(m.caducidad)}</TableCell>
                  <TableCell className="text-right">{q(m.precioVenta)}</TableCell>
                  <TableCell className={`text-right font-semibold ${m.stock < 10 ? "text-destructive" : ""}`}>{m.stock}</TableCell>
                  <TableCell>{estadoMed(m)}</TableCell>
                </TableRow>
              ))}
              {!medsF.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Ningún producto vence en este rango</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
