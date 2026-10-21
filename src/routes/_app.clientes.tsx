import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Search, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageSkeleton, useFakeLoading } from "@/components/PageSkeleton";
import { useData } from "@/lib/db";
import type { Cliente } from "@/lib/store";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — FarmaciaDB" },
      { name: "description", content: "Clientes VIP y programa de fidelización Puntos Salud." },
      { property: "og:title", content: "Clientes — FarmaciaDB" },
      { property: "og:description", content: "Clientes VIP y programa de fidelización Puntos Salud." },
    ],
  }),
  component: Clientes,
});

const empty = (): Cliente => ({ id: "", nombre: "", telefono: "", nit: "CF", puntos: 0 });
const nivel = (p: number) => (p >= 150 ? { label: "Oro", v: "warning" as const } : p >= 50 ? { label: "Plata", v: "secondary" as const } : { label: "Bronce", v: "outline" as const });

function Clientes() {
  const fake = useFakeLoading();
  const { clientes, saveCliente, deleteCliente, loading } = useData();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);
  const rows = clientes.filter((c) => `${c.nombre} ${c.nit} ${c.telefono}`.toLowerCase().includes(search.toLowerCase()));

  if (fake || loading) return <PageSkeleton cards={0} />;

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} clientes · ${clientes.reduce((s, c) => s + c.puntos, 0)} Puntos Salud acumulados`}
        actions={<Button onClick={() => setEditing(empty())}><Plus /> Nuevo Cliente</Button>}
      />
      <div className="glass mb-6 flex items-start gap-3 rounded-2xl p-4 text-sm">
        <Heart className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <p><b>Programa Puntos Salud:</b> por cada Q100 de compra el cliente gana 5 puntos. Selecciona al cliente en el Punto de Venta antes de cobrar.</p>
      </div>
      <div className="glass rounded-2xl p-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, NIT o teléfono..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead className="text-right">Puntos Salud</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const n = nivel(c.puntos);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.nombre}</TableCell>
                  <TableCell>{c.telefono}</TableCell>
                  <TableCell>{c.nit}</TableCell>
                  <TableCell className="text-right font-bold text-success">{c.puntos}</TableCell>
                  <TableCell><Badge variant={n.v}>{n.label}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label="Editar"><Pencil /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(c)} aria-label="Eliminar"><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <ClienteForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (c) => {
            if (!(await saveCliente(c))) return;
            toast.success(c.id ? "Cliente actualizado" : "Cliente registrado", { description: c.nombre });
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="¿Eliminar cliente?"
        description={`Se eliminará "${toDelete?.nombre}" y sus puntos. Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          if (toDelete && (await deleteCliente(toDelete.id))) toast.success("Cliente eliminado", { description: toDelete.nombre });
          setToDelete(null);
        }}
      />
    </div>
  );
}

function ClienteForm({ initial, onClose, onSave }: { initial: Cliente; onClose: () => void; onSave: (c: Cliente) => void }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Partial<Record<keyof Cliente, string>>>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<Record<keyof Cliente, string>> = {};
    if (f.nombre.trim().length < 3) er.nombre = "Mínimo 3 caracteres";
    if (!/^[\d\s-]{8,}$/.test(f.telefono.trim())) er.telefono = "Teléfono inválido";
    if (!/^(CF|\d{4,}-?[\dkK])$/i.test(f.nit.trim())) er.nit = "NIT inválido (o CF)";
    setErr(er);
    if (Object.keys(er).length) return void toast.error("Revisa los campos del formulario");
    onSave({ ...f, nombre: f.nombre.trim(), telefono: f.telefono.trim(), nit: f.nit.trim().toUpperCase() });
  };
  const field = (k: "nombre" | "telefono" | "nit", label: string, ph?: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {err[k] && <p className="text-xs text-destructive">{err[k]}</p>}
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader><DialogTitle>{initial.id ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {field("nombre", "Nombre completo")}
          {field("telefono", "Teléfono", "5512-3344")}
          {field("nit", "NIT", "1234567-8 o CF")}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
