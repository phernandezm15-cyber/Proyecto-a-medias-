import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Barcode } from "@/components/Barcode";
import { PageSkeleton, TableSkeleton, useDebouncedLoading, useFakeLoading } from "@/components/PageSkeleton";
import { CATEGORIAS, estadoMed, estadoVariant, fmtFecha, q, type Medicamento } from "@/lib/store";
import { useData, useMe } from "@/lib/db";
import { VoiceButton } from "@/components/VoiceButton";
import { Lock, ShieldAlert, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — FarmaciaDB" },
      { name: "description", content: "Gestiona medicamentos, stock, códigos y fechas de vencimiento." },
      { property: "og:title", content: "Inventario — FarmaciaDB" },
      { property: "og:description", content: "Gestiona medicamentos, stock, códigos y fechas de vencimiento." },
    ],
  }),
  component: Inventario,
});

const PAGE = 8;
type Chip = "todo" | "critico" | "vencer";
interface Adv { cat: string; pMin: string; pMax: string; sMin: string; sMax: string }
const emptyAdv: Adv = { cat: "todas", pMin: "", pMax: "", sMin: "", sMax: "" };
const empty = (): Medicamento => ({ id: "", codigo: "", nombre: "", principio: "", categoria: CATEGORIAS[0], caducidad: "", precioCompra: 0, precioVenta: 0, stock: 0 });

function Inventario() {
  const pageLoading = useFakeLoading();
  const me = useMe();
  const isAdmin = !!me?.isAdmin;
  const { meds, saveMed, deleteMed, loading } = useData();
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<Chip>("todo");
  const [adv, setAdv] = useState<Adv>(emptyAdv);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Medicamento | null>(null);
  const [toDelete, setToDelete] = useState<Medicamento | null>(null);
  const tableLoading = useDebouncedLoading([search, chip, adv]);

  const n = (s: string) => (s === "" ? null : Number(s));
  const sNorm = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const sTokens = sNorm.split(/\s+/).filter(Boolean);
  const filtered = meds.filter((m) => {
    const e = estadoMed(m);
    const mText = `${m.nombre} ${m.principio} ${m.categoria} ${m.codigo}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (sNorm && !mText.includes(sNorm) && !sTokens.every((token) => mText.includes(token))) return false;
    if (chip === "critico" && m.stock >= 10) return false;
    if (chip === "vencer" && e !== "Por Vencer") return false;
    if (adv.cat !== "todas" && m.categoria !== adv.cat) return false;
    const [pMin, pMax, sMin, sMax] = [n(adv.pMin), n(adv.pMax), n(adv.sMin), n(adv.sMax)];
    if (pMin !== null && m.precioVenta < pMin) return false;
    if (pMax !== null && m.precioVenta > pMax) return false;
    if (sMin !== null && m.stock < sMin) return false;
    if (sMax !== null && m.stock > sMax) return false;
    return true;
  });
  const advCount = Object.entries(adv).filter(([k, v]) => (k === "cat" ? v !== "todas" : v !== "")).length;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  useEffect(() => setPage(1), [search, chip, adv]);
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);

  if (pageLoading || loading) return <PageSkeleton cards={0} />;

  const chips: { k: Chip; label: string; count: number }[] = [
    { k: "todo", label: "Mostrar Todo", count: meds.length },
    { k: "critico", label: "Solo Stock Crítico", count: meds.filter((m) => m.stock < 10).length },
    { k: "vencer", label: "Próximos a Vencer", count: meds.filter((m) => estadoMed(m) === "Por Vencer").length },
  ];

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle={`${meds.length} medicamentos registrados`}
        actions={
          isAdmin ? (
            <Button onClick={() => setEditing(empty())} className="gap-1.5">
              <Plus /> Añadir Nuevo
            </Button>
          ) : (
            <Button
              variant="outline"
              className="opacity-80 gap-1.5"
              onClick={() =>
                toast.info("Función de Administrador", {
                  description:
                    "Solo los Administradores con clave autorizada pueden registrar nuevos medicamentos.",
                })
              }
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span>Añadir Nuevo (Solo Admin)</span>
            </Button>
          )
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
              <span className="font-bold">Modo Catálogo de Empleado (Consulta & Venta):</span> Puedes buscar productos por texto o voz, consultar existencias para clientes y revisar caducidades.
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shrink-0 hidden sm:inline-flex">
            Solo Consulta
          </Badge>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-3 flex items-center justify-between text-xs text-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary flex items-center gap-1">👑 Modo Administrador Total:</span>
            <span className="text-muted-foreground">Tienes privilegios completos para dar de alta fármacos, editar precios y eliminar del catálogo.</span>
          </div>
          <Badge className="bg-primary/20 text-primary border border-primary/40 shrink-0 hidden sm:inline-flex">
            Control Total
          </Badge>
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o código..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <VoiceButton onText={setSearch} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal /> Filtros Avanzados {advCount > 0 && <Badge className="ml-1">{advCount}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="glass w-80 space-y-3">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={adv.cat} onValueChange={(v) => setAdv({ ...adv, cat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Precio mín.</Label><Input type="number" value={adv.pMin} onChange={(e) => setAdv({ ...adv, pMin: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Precio máx.</Label><Input type="number" value={adv.pMax} onChange={(e) => setAdv({ ...adv, pMax: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Stock mín.</Label><Input type="number" value={adv.sMin} onChange={(e) => setAdv({ ...adv, sMin: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Stock máx.</Label><Input type="number" value={adv.sMax} onChange={(e) => setAdv({ ...adv, sMax: e.target.value })} /></div>
              </div>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setAdv(emptyAdv)}><X /> Limpiar filtros</Button>
            </PopoverContent>
          </Popover>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.k}
              onClick={() => setChip(c.k)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold hover:-translate-y-0.5 ${chip === c.k ? "border-primary bg-primary text-primary-foreground shadow-md" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}
            >
              {c.label} <span className="opacity-70">({c.count})</span>
            </button>
          ))}
        </div>
        {tableLoading ? (
          <TableSkeleton rows={PAGE} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">{isAdmin ? "Acciones" : "Permiso"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="animate-in fade-in duration-300">
              {rows.map((m) => {
                const e = estadoMed(m);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.id}</TableCell>
                    <TableCell><Barcode value={m.codigo} /></TableCell>
                    <TableCell>
                      <div className="font-semibold">{m.nombre}</div>
                      <div className="text-xs text-muted-foreground">{m.principio}</div>
                    </TableCell>
                    <TableCell>{m.categoria}</TableCell>
                    <TableCell>{fmtFecha(m.caducidad)}</TableCell>
                    <TableCell className="text-right">{q(m.precioVenta)}</TableCell>
                    <TableCell className={`text-right font-semibold ${m.stock < 10 ? "text-destructive" : ""}`}>{m.stock}</TableCell>
                    <TableCell>
                      <Badge variant={estadoVariant[e]} className="gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {e}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {isAdmin ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => setEditing(m)} aria-label="Editar"><Pencil /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(m)} aria-label="Eliminar"><Trash2 /></Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground opacity-60 hover:opacity-100"
                          onClick={() =>
                            toast.info("Función de Administrador", {
                              description: "Solo los Administradores pueden editar precios o dar de baja medicamentos.",
                            })
                          }
                          aria-label="Solo Administrador"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {pages} · {filtered.length} resultados</span>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /></Button>
            <Button size="icon" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight /></Button>
          </div>
        </div>
      </div>

      {editing && (
        <MedForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (m) => {
            const isNew = !m.id;
            const codigo = m.codigo || `750${Date.now().toString().slice(-8)}`;
            if (!(await saveMed({ ...m, codigo }))) return;
            toast.success(isNew ? "Producto guardado" : "Producto actualizado", { description: m.nombre });
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="¿Eliminar medicamento?"
        description={`Se eliminará "${toDelete?.nombre}" del inventario. Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          if (toDelete && (await deleteMed(toDelete.id))) {
            toast.success("Producto eliminado", { description: toDelete.nombre });
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

function MedForm({ initial, onClose, onSave }: { initial: Medicamento; onClose: () => void; onSave: (m: Medicamento) => void }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Partial<Record<keyof Medicamento, string>>>({});
  const set = <K extends keyof Medicamento>(k: K, v: Medicamento[K]) => setF({ ...f, [k]: v });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<Record<keyof Medicamento, string>> = {};
    if (!f.nombre.trim()) er.nombre = "Requerido";
    if (!f.principio.trim()) er.principio = "Requerido";
    if (!f.caducidad) er.caducidad = "Requerido";
    if (f.precioCompra <= 0) er.precioCompra = "Debe ser mayor a 0";
    if (f.precioVenta <= 0) er.precioVenta = "Debe ser mayor a 0";
    else if (f.precioVenta < f.precioCompra) er.precioVenta = "Debe ser ≥ precio de compra";
    if (f.stock < 0 || !Number.isInteger(f.stock)) er.stock = "Entero ≥ 0";
    setErr(er);
    if (Object.keys(er).length) return void toast.error("Revisa los campos del formulario");
    onSave(f);
  };

  const field = (k: keyof Medicamento, label: string, type = "text", placeholder?: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        value={f[k] as string | number}
        onChange={(e) => set(k, (type === "number" ? Number(e.target.value) : e.target.value) as never)}
      />
      {err[k] && <p className="text-xs text-destructive">{err[k]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-h-[90vh] overflow-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{initial.id ? "Editar medicamento" : "Nuevo medicamento"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {field("nombre", "Nombre comercial")}
          {field("principio", "Principio activo")}
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={f.categoria} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {field("caducidad", "Fecha de caducidad", "date")}
          {field("precioCompra", "Precio compra (Q)", "number")}
          {field("precioVenta", "Precio venta (Q)", "number")}
          {field("stock", "Stock actual", "number")}
          {field("codigo", "Código de barras", "text", "Se genera si se deja vacío")}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
