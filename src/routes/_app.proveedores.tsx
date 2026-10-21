import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { type Proveedor } from "@/lib/store";
import { useData } from "@/lib/db";
import { PageSkeleton, useFakeLoading } from "@/components/PageSkeleton";

export const Route = createFileRoute("/_app/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores — FarmaciaDB" },
      { name: "description", content: "Registra y administra las empresas proveedoras." },
      { property: "og:title", content: "Proveedores — FarmaciaDB" },
      { property: "og:description", content: "Registra y administra las empresas proveedoras." },
    ],
  }),
  component: Proveedores,
});

const empty = (): Proveedor => ({ id: "", empresa: "", contacto: "", telefono: "", correo: "", direccion: "" });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Proveedores() {
  const fake = useFakeLoading();
  const { proveedores, saveProv, deleteProv, loading } = useData();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [toDelete, setToDelete] = useState<Proveedor | null>(null);
  const rows = proveedores.filter((p) => `${p.empresa} ${p.contacto}`.toLowerCase().includes(search.toLowerCase()));

  if (fake || loading) return <PageSkeleton cards={0} />;

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle={`${proveedores.length} empresas registradas`}
        actions={<Button onClick={() => setEditing(empty())}><Plus /> Nuevo Proveedor</Button>}
      />
      <div className="glass rounded-2xl p-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar empresa o contacto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.id}</TableCell>
                <TableCell className="font-semibold">{p.empresa}</TableCell>
                <TableCell>{p.contacto}</TableCell>
                <TableCell>{p.telefono}</TableCell>
                <TableCell>{p.correo}</TableCell>
                <TableCell>{p.direccion}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label="Editar"><Pencil /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(p)} aria-label="Eliminar"><Trash2 /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <ProvForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (p) => {
            const isNew = !p.id;
            if (!(await saveProv(p))) return;
            toast.success(isNew ? "Proveedor registrado" : "Proveedor actualizado", { description: p.empresa });
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="¿Eliminar proveedor?"
        description={`Se eliminará "${toDelete?.empresa}". Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          if (toDelete && (await deleteProv(toDelete.id))) {
            toast.success("Proveedor eliminado", { description: toDelete.empresa });
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

function ProvForm({ initial, onClose, onSave }: { initial: Proveedor; onClose: () => void; onSave: (p: Proveedor) => void }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<Partial<Record<keyof Proveedor, string>>>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<Record<keyof Proveedor, string>> = {};
    (["empresa", "contacto", "telefono", "direccion"] as const).forEach((k) => !f[k].trim() && (er[k] = "Requerido"));
    if (!EMAIL_RE.test(f.correo)) er.correo = "Correo inválido";
    setErr(er);
    if (Object.keys(er).length) return void toast.error("Revisa los campos del formulario");
    onSave(f);
  };
  const field = (k: keyof Proveedor, label: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {err[k] && <p className="text-xs text-destructive">{err[k]}</p>}
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass sm:max-w-lg">
        <DialogHeader><DialogTitle>{initial.id ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {field("empresa", "Empresa")}
          {field("contacto", "Contacto")}
          {field("telefono", "Teléfono")}
          {field("correo", "Correo")}
          <div className="sm:col-span-2">{field("direccion", "Dirección")}</div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
