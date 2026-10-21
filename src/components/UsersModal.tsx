import { useState } from "react";
import { Users, Shield, User, ShieldCheck, KeyRound, Plus, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADMIN_MASTER_PASSWORD } from "@/routes/login";
import { evaluatePasswordStrength } from "@/lib/password-strength";

interface UserItem {
  id: string;
  nombre: string;
  email: string;
  role: "admin" | "empleado";
  created_at?: string;
}

export function UsersModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({
    nombre: "",
    email: "",
    password: "",
    role: "empleado" as "admin" | "empleado",
    adminKey: "",
  });
  const qc = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["app_users_list"],
    queryFn: async (): Promise<UserItem[]> => {
      // Fetch users from profiles
      const { data } = await supabase.from("profiles").select("*");
      if (data && data.length) {
        return (data as any[]).map((u) => ({
          id: u.id,
          nombre: u.nombre || "Usuario",
          email: u.email || `${u.id}@farmacia.gt`,
          role: u.role === "admin" ? "admin" : "empleado",
          created_at: u.created_at || "2026-01-01",
        }));
      }
      return [
        { id: "usr-admin", nombre: "Admin General", email: "admin@farmacia.gt", role: "admin" },
        { id: "usr-emp", nombre: "María López", email: "empleado@farmacia.gt", role: "empleado" },
      ];
    },
    enabled: open,
  });

  const passStrength = evaluatePasswordStrength(newUser.password);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.nombre.trim() || !newUser.email.trim()) {
      return toast.error("Por favor completa el nombre y correo");
    }

    if (!passStrength.isAllowed) {
      return toast.error("Contraseña débil no permitida", {
        description: "Se requiere una contraseña de nivel Medio o Fuerte.",
      });
    }

    if (newUser.role === "admin" && newUser.adminKey !== ADMIN_MASTER_PASSWORD) {
      return toast.error("Clave de autorización maestra incorrecta", {
        description: "Solo el programador y la empresa poseen la clave para crear administradores.",
      });
    }

    const { error } = await supabase.auth.signUp({
      email: newUser.email.trim(),
      password: newUser.password,
      options: {
        data: {
          nombre: newUser.nombre.trim(),
          rol: newUser.role,
        },
      },
    });

    if (error) {
      return toast.error("No se pudo crear la cuenta", { description: error.message });
    }

    toast.success("Usuario registrado exitosamente", {
      description: `${newUser.nombre} (${newUser.role === "admin" ? "Administrador" : "Empleado"})`,
    });

    setNewUser({ nombre: "", email: "", password: "", role: "empleado", adminKey: "" });
    setShowAdd(false);
    refetch();
    qc.invalidateQueries({ queryKey: ["profiles"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>Personal & Roles</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="glass max-w-3xl overflow-hidden rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Gestión de Personal & Roles</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Auditoría de cuentas registradas y matriz de permisos por rol
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant={showAdd ? "ghost" : "default"}
              onClick={() => setShowAdd(!showAdd)}
              className="gap-1.5"
            >
              {showAdd ? "Ver Lista" : <><Plus className="h-4 w-4" /> Nuevo Usuario</>}
            </Button>
          </div>
        </DialogHeader>

        {showAdd ? (
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Registrar Nuevo Colaborador
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nombre completo</Label>
                  <Input
                    placeholder="Ej. Andrea Gómez"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Correo electrónico</Label>
                  <Input
                    type="email"
                    placeholder="andrea@farmacia.gt"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label>Contraseña</Label>
                    {newUser.password && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        passStrength.level === "baja"
                          ? "bg-destructive/20 text-destructive"
                          : passStrength.level === "media"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {passStrength.label}
                      </span>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres (letras y números)"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Rol en la Farmacia</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(v: "admin" | "empleado") => setNewUser({ ...newUser, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empleado">👤 Empleado (Caja & Ventas)</SelectItem>
                      <SelectItem value="admin">👑 Administrador (Control Total)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newUser.role === "admin" && (
                <div className="p-3 rounded-xl border border-primary/40 bg-primary/10 space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-primary" /> Clave de Autorización Maestra Requerida
                  </Label>
                  <Input
                    type="password"
                    placeholder="Introduce farmaciadbadmin123"
                    value={newUser.adminKey}
                    onChange={(e) => setNewUser({ ...newUser, adminKey: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Autorización del programador / empresa para conceder privilegios administrativos.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="hero"
                  disabled={
                    !passStrength.isAllowed ||
                    (newUser.role === "admin" && newUser.adminKey !== ADMIN_MASTER_PASSWORD)
                  }
                >
                  Registrar Colaborador
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol Asignado</TableHead>
                    <TableHead>Privilegios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold flex items-center gap-2">
                        {u.role === "admin" ? (
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">👑</span>
                        ) : (
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">👤</span>
                        )}
                        <span>{u.nombre}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{u.email}</TableCell>
                      <TableCell>
                        {u.role === "admin" ? (
                          <Badge variant="default" className="bg-primary hover:bg-primary gap-1 font-semibold">
                            👑 Administrador
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1 font-semibold">
                            👤 Empleado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.role === "admin"
                          ? "Acceso total, edición de catálogo, reportes y compras"
                          : "Punto de Venta, consulta de catálogo y ventas de turno"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Permissions Matrix Comparison Card */}
            <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <Shield className="h-4 w-4 text-primary" /> Matriz de Diferenciación de Permisos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                  <p className="font-bold text-primary flex items-center gap-1.5">👑 Administrador (Dueño / Gerencia)</p>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    <li>✅ Crear, editar precios y eliminar medicamentos del catálogo.</li>
                    <li>✅ Ver costos confidenciales y márgenes de ganancia.</li>
                    <li>✅ Reportes financieros completos y exportación (PDF/Excel/CSV).</li>
                    <li>✅ Gestión de compras de mercadería y proveedores.</li>
                    <li>✅ Auditoría y creación de personal del sistema.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">👤 Empleado (Caja & Ventas)</p>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    <li>✅ Punto de Venta (POS), cobro rápido y emisión de recibos.</li>
                    <li>✅ Búsqueda por voz directa y consulta de stock al cliente.</li>
                    <li>✅ Asistente de IA clínica para consultar dudas de fármacos.</li>
                    <li>✅ Consulta de su propio corte de caja / ventas del turno.</li>
                    <li>🔒 Restringido: No puede alterar precios, eliminar ítems ni ver compras a costo.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
