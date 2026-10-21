import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { type Rol } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — FarmaciaDB" },
      { name: "description", content: "Accede o regístrate en el panel de gestión de FarmaciaDB." },
      { property: "og:title", content: "Iniciar sesión — FarmaciaDB" },
      { property: "og:description", content: "Accede o regístrate en el panel de gestión de FarmaciaDB." },
    ],
  }),
  component: Login,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function PassInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input id={id} type={show ? "text" : "password"} placeholder="••••••••" className="px-9" value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const Err = ({ m }: { m?: string | undefined }) => (m ? <p className="text-xs text-destructive">{m}</p> : null);

function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"email" | "pass", string>>>({});
  const [reg, setReg] = useState({ nombre: "", correo: "", password: "", rol: "Empleado" as Rol });
  const [regErr, setRegErr] = useState<Partial<Record<"nombre" | "correo" | "password", string>>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<Record<"email" | "pass", string>> = {};
    if (!email.trim()) er.email = "El correo es obligatorio";
    else if (!EMAIL_RE.test(email)) er.email = "Correo electrónico inválido";
    if (!pass) er.pass = "La contraseña es obligatoria";
    setErrors(er);
    if (Object.keys(er).length) return void toast.error("Revisa los campos del formulario");
    setLoading(true);
    const [{ data, error }] = await Promise.all([
      supabase.auth.signInWithPassword({ email: email.trim(), password: pass }),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
    if (error || !data.user) {
      setLoading(false);
      toast.error("Credenciales incorrectas", { description: "Correo o contraseña no coinciden" });
      return;
    }
    const { data: p } = await supabase.from("profiles").select("nombre").eq("id", data.user.id).maybeSingle();
    toast.success(`Bienvenido, ${p?.nombre ?? "usuario"}`, { description: "Conectado a la base de datos" });
    navigate({ to: "/dashboard" });
  };

  const submitReg = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<Record<"nombre" | "correo" | "password", string>> = {};
    if (reg.nombre.trim().length < 3) er.nombre = "Mínimo 3 caracteres";
    if (!EMAIL_RE.test(reg.correo)) er.correo = "Correo electrónico inválido";
    if (reg.password.length < 6) er.password = "Mínimo 6 caracteres";
    setRegErr(er);
    if (Object.keys(er).length) return void toast.error("Revisa los campos del registro");
    setRegLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: reg.correo.trim(),
      password: reg.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nombre: reg.nombre.trim(), rol: reg.rol === "Administrador" ? "admin" : "empleado" },
      },
    });
    setRegLoading(false);
    if (error || (data.user && data.user.identities?.length === 0)) {
      setRegErr({ correo: "Este correo ya está registrado" });
      return void toast.error("No se pudo registrar", { description: error?.message ?? "El correo ya existe" });
    }
    await supabase.auth.signOut();
    toast.success("Cuenta creada con éxito", { description: "Ahora puedes iniciar sesión" });
    setEmail(reg.correo.trim());
    setPass("");
    setReg({ nombre: "", correo: "", password: "", rol: "Empleado" });
    setTab("login");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-auth px-4 py-10">
      <div className="glass w-full max-w-md rounded-3xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gestión farmacéutica</h1>
            <p className="text-sm text-muted-foreground">Inventario, ventas y compras en un solo lugar</p>
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-5 grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="animate-in fade-in duration-300">
            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="admin@farmacia.gt" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Err m={errors.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pass">Contraseña</Label>
                <PassInput id="pass" value={pass} onChange={setPass} />
                <Err m={errors.pass} />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin" /> Ingresando...</> : "Ingresar"}
              </Button>
              <div className="rounded-xl border bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-semibold text-foreground">Cuentas demo</p>
                <p>admin@farmacia.gt · admin123 (Administrador)</p>
                <p>empleado@farmacia.gt · empleado123 (Empleado)</p>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="register" className="animate-in fade-in duration-300">
            <form onSubmit={submitReg} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rnombre">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="rnombre" placeholder="Juan Pérez" className="pl-9" value={reg.nombre} onChange={(e) => setReg({ ...reg, nombre: e.target.value })} />
                </div>
                <Err m={regErr.nombre} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcorreo">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="rcorreo" type="email" placeholder="tu@farmacia.gt" className="pl-9" value={reg.correo} onChange={(e) => setReg({ ...reg, correo: e.target.value })} />
                </div>
                <Err m={regErr.correo} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpass">Contraseña</Label>
                <PassInput id="rpass" value={reg.password} onChange={(v) => setReg({ ...reg, password: v })} />
                <Err m={regErr.password} />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={reg.rol} onValueChange={(v) => setReg({ ...reg, rol: v as Rol })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Empleado">Empleado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="success" size="lg" className="w-full" disabled={regLoading}>{regLoading ? <><Loader2 className="animate-spin" /> Creando...</> : "Crear cuenta"}</Button>
            </form>
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-center text-xs text-muted-foreground">Versión de prototipo. Datos guardados en este navegador.</p>
      </div>
    </div>
  );
}
