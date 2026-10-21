import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PackagePlus, Eye, PackageCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton, useFakeLoading } from "@/components/PageSkeleton";
import { fmtFechaHora, q, type Compra, type EstadoCompra } from "@/lib/store";
import { useData } from "@/lib/db";
import { suggestedSupplier } from "@/lib/insights";

export const Route = createFileRoute("/_app/compras")({
  head: () => ({
    meta: [
      { title: "Compras — FarmaciaDB" },
      { name: "description", content: "Registra ingresos de mercadería con proveedor y costo sugeridos." },
      { property: "og:title", content: "Compras — FarmaciaDB" },
      { property: "og:description", content: "Registra ingresos de mercadería con proveedor y costo sugeridos." },
    ],
  }),
  component: Compras,
});

function Compras() {
  const loading = useFakeLoading();
  const { meds, proveedores, compras, registrarCompra, recibirCompra, loading: dbLoading } = useData();
  const [prov, setProv] = useState("");
  const [med, setMed] = useState("");
  const [cant, setCant] = useState("");
  const [costo, setCosto] = useState("");
  const [estado, setEstado] = useState<EstadoCompra>("Completado");
  const [sugerido, setSugerido] = useState(false);
  const [detalle, setDetalle] = useState<Compra | null>(null);

  const pickMed = (id: string) => {
    setMed(id);
    const m = meds.find((x) => x.id === id);
    const s = suggestedSupplier(id, compras, proveedores);
    if (s.proveedor) setProv(s.proveedor.id);
    setCosto(String(s.costo ?? m?.precioCompra ?? ""));
    setSugerido(true);
    toast.info("Datos sugeridos aplicados", { description: `${s.proveedor?.empresa} · ${q(s.costo ?? m?.precioCompra ?? 0)}` });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = Number(cant);
    const k = Number(costo);
    if (!prov || !med) return void toast.error("Selecciona proveedor y producto");
    if (!Number.isInteger(c) || c <= 0) return void toast.error("Cantidad inválida");
    if (!(k > 0)) return void toast.error("Costo unitario inválido");
    if (!(await registrarCompra({ proveedorId: prov, medId: med, cantidad: c, costo: k, estado }))) return;
    const m = meds.find((x) => x.id === med)!;
    toast.success(estado === "Completado" ? "Compra registrada" : "Compra pendiente registrada", {
      description: estado === "Completado" ? `${m.nombre}: +${c} unidades (stock ${m.stock + c})` : `${m.nombre}: ${c} unidades por recibir`,
    });
    setCant("");
    setSugerido(false);
  };

  const provName = (id: string) => proveedores.find((p) => p.id === id)?.empresa ?? "—";
  const medName = (id: string) => meds.find((p) => p.id === id)?.nombre ?? "—";

  if (loading || dbLoading) return <PageSkeleton cards={0} />;

  return (
    <div>
      <PageHeader title="Compras" subtitle="Ingreso de mercadería al inventario" />
      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <form onSubmit={submit} className="glass h-fit space-y-4 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><PackagePlus className="h-5 w-5 text-primary" /> Registrar ingreso</h2>
          <div className="space-y-1.5">
            <Label>Producto</Label>
            <Select value={med} onValueChange={pickMed}>
              <SelectTrigger><SelectValue placeholder="Selecciona producto" /></SelectTrigger>
              <SelectContent>{meds.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre} (stock {m.stock})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              Proveedor {sugerido && <Badge variant="success" className="gap-1"><Sparkles className="h-3 w-3" /> Sugerido</Badge>}
            </Label>
            <Select value={prov} onValueChange={(v) => { setProv(v); setSugerido(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
              <SelectContent>{proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.empresa}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Cantidad</Label><Input type="number" min={1} value={cant} onChange={(e) => setCant(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Costo unit. (Q)</Label><Input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as EstadoCompra)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Completado">Completado (suma stock ahora)</SelectItem>
                <SelectItem value="Pendiente">Pendiente (por recibir)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {Number(cant) > 0 && Number(costo) > 0 && (
            <p className="text-sm text-muted-foreground">Total compra: <span className="font-bold text-foreground">{q(Number(cant) * Number(costo))}</span></p>
          )}
          <Button type="submit" variant="success" className="w-full">Registrar compra</Button>
        </form>

        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 text-lg font-bold">Historial de compras</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.codigo}</TableCell>
                  <TableCell>{fmtFechaHora(c.fecha)}</TableCell>
                  <TableCell>{provName(c.proveedorId)}</TableCell>
                  <TableCell>{medName(c.medId)} <span className="text-muted-foreground">x{c.cantidad}</span></TableCell>
                  <TableCell className="text-right font-semibold">{q(c.cantidad * c.costo)}</TableCell>
                  <TableCell><Badge variant={c.estado === "Completado" ? "success" : "warning"}>{c.estado}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {c.estado === "Pendiente" && (
                      <Button size="icon" variant="ghost" className="text-success" aria-label="Marcar recibida" onClick={async () => { if (await recibirCompra(c.id)) toast.success("Compra recibida", { description: `+${c.cantidad} ${medName(c.medId)}` }); }}>
                        <PackageCheck />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" aria-label="Ver detalles" onClick={() => setDetalle(c)}><Eye /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!compras.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Aún no hay compras registradas</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="glass sm:max-w-md">
          <DialogHeader><DialogTitle>Detalle de compra {detalle?.codigo}</DialogTitle></DialogHeader>
          {detalle && (() => {
            const p = proveedores.find((x) => x.id === detalle.proveedorId);
            const rows: [string, React.ReactNode][] = [
              ["Fecha", fmtFechaHora(detalle.fecha)],
              ["Estado", <Badge key="e" variant={detalle.estado === "Completado" ? "success" : "warning"}>{detalle.estado}</Badge>],
              ["Proveedor", p?.empresa ?? "—"],
              ["Contacto", p ? `${p.contacto} · ${p.telefono}` : "—"],
              ["Correo", p?.correo ?? "—"],
              ["Producto", medName(detalle.medId)],
              ["Cantidad", `${detalle.cantidad} unidades`],
              ["Costo unitario", q(detalle.costo)],
              ["Total", q(detalle.costo * detalle.cantidad)],
              ["Nota", detalle.nota ?? "—"],
            ];
            return (
              <dl className="divide-y text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                ))}
              </dl>
            );
          })()}
          <DialogFooter>
            {detalle?.estado === "Pendiente" && (
              <Button variant="success" onClick={async () => { if (await recibirCompra(detalle.id)) toast.success("Compra recibida"); setDetalle(null); }}>
                <PackageCheck /> Marcar recibida
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
