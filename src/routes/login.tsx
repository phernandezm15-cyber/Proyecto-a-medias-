import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, User, ShieldCheck, KeyRound, ShieldAlert, Check, X as XIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { type Rol } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { evaluatePasswordStrength } from "@/lib/password-strength";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — FarmaciaDB" },
      { name: "description", content: "Acceso y registro para Administradores y Empleados en FarmaciaDB." },
      { property: "og:title", content: "Iniciar sesión — FarmaciaDB" },
      { property: "og:description", content: "Acceso y registro para Administradores y Empleados en FarmaciaDB." },
    ],
  }),
  component: Login,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const ADMIN_MASTER_PASSWORD = "farmaciadbadmin123";

function PassInput({
  id,
  value,
  onChange,
  placeholder = "••••••••",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className="px-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const Err = ({ m }: { m?: string | undefined }) => (m ? <p className="text-xs font-medium text-destructive mt-1">{m}</p> : null);

function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"email" | "pass", string>>>({});
  const [reg, setReg] = useState({
    nombre: "",
    correo: "",
    password: "",
    rol: "Empleado" as Rol,
    adminAuthKey: "",
  });
  const [regErr, setRegErr] = useState<Partial<Record<"nombre" | "correo" | "password" | "adminAuthKey", string>>>({});

  const passStrength = evaluatePasswordStrength(reg.password);

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
      new Promise((r) => setTimeout(r, 600)),
    ]);

    if (error || !data.user) {
      setLoading(false);
      toast.error("Credenciales incorrectas", { description: "Correo o contraseña no coinciden" });
      return;
    }

    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("nombre").eq("id", data.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    ]);
    const isAdmin = (r ?? []).some((x: any) => x.role === "admin");

    toast.success(`Bienvenido, ${p?.nombre ?? "usuario"}`, {
      description: isAdmin ? "👑 Sesión iniciada como Administrador General" : "👤 Sesión iniciada como Empleado",
    });
    navigate({ to: "/dashboard" });
  };

  const submitReg = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<Record<"nombre" | "correo" | "password" | "adminAuthKey", string>> = {};

    if (reg.nombre.trim().length < 3) er.nombre = "Mínimo 3 caracteres para el nombre";
    if (!EMAIL_RE.test(reg.correo)) er.correo = "Correo electrónico inválido";

    // 1. Validar Fortaleza de Contraseña
    if (!passStrength.isAllowed) {
      er.password = "La contraseña es muy débil. Debe ser al menos nivel Medio (mínimo 6 caracteres combinando letras y números)";
    }

    // 2. Validar Clave de Autorización para cuenta de Administrador
    if (reg.rol === "Administrador") {
      if (!reg.adminAuthKey) {
        er.adminAuthKey = "Ingresa la clave de autorización para crear cuenta de Administrador";
      } else if (reg.adminAuthKey !== ADMIN_MASTER_PASSWORD) {
        er.adminAuthKey = "Clave de autorización incorrecta. Solo el programador y la empresa pueden autorizar Administradores";
      }
    }

    setRegErr(er);

    if (Object.keys(er).length) {
      if (er.adminAuthKey) {
        toast.error("Autorización de Administrador rechazada", {
          description: "La clave de autorización no es válida.",
        });
      } else if (er.password) {
        toast.error("Contraseña débil no permitida", {
          description: "Debes ingresar una contraseña de nivel Medio o Fuerte.",
        });
      } else {
        toast.error("Revisa los campos del registro");
      }
      return;
    }

    setRegLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: reg.correo.trim(),
      password: reg.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nombre: reg.nombre.trim(),
          rol: reg.rol === "Administrador" ? "admin" : "empleado",
        },
      },
    });
    setRegLoading(false);

    if (error || (data.user && data.user.identities?.length === 0)) {
      setRegErr({ correo: "Este correo ya está registrado" });
      return void toast.error("No se pudo registrar", { description: error?.message ?? "El correo ya existe" });
    }

    await supabase.auth.signOut();
    toast.success("¡Cuenta creada con éxito!", {
      description: reg.rol === "Administrador"
        ? "Cuenta de Administrador autorizada. Ahora puedes iniciar sesión."
        : "Cuenta de Empleado registrada. Ahora puedes iniciar sesión.",
    });

    setEmail(reg.correo.trim());
    setPass("");
    setReg({ nombre: "", correo: "", password: "", rol: "Empleado", adminAuthKey: "" });
    setTab("login");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-auth px-4 py-10">
      <div className="glass w-full max-w-lg rounded-3xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl border border-primary/20">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gestión Farmacéutica</h1>
            <p className="text-sm text-muted-foreground">Sistema de farmacia con control por roles (Administrador y Empleado)</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-5 grid w-full grid-cols-2">
            <TabsTrigger value="login" className="font-semibold">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register" className="font-semibold">Crear Cuenta</TabsTrigger>
          </TabsList>

          {/* TAB: LOGIN */}
          <TabsContent value="login" className="animate-in fade-in duration-300">
            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@farmacia.gt o tu@correo.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Err m={errors.email} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pass">Contraseña</Label>
                <PassInput id="pass" value={pass} onChange={setPass} />
                <Err m={errors.pass} />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin" /> Ingresando...</> : "Ingresar al Sistema"}
              </Button>

              <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-2">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Cuentas Demostrativas Rápidas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => { setEmail("admin@farmacia.gt"); setPass("admin123"); }}
                    className="cursor-pointer rounded-xl border border-primary/30 bg-primary/5 p-2 hover:bg-primary/10 transition-colors"
                  >
                    <p className="font-bold text-primary flex items-center gap-1">👑 Administrador</p>
                    <p className="text-[11px] text-foreground font-mono">admin@farmacia.gt</p>
                    <p className="text-[11px] text-muted-foreground">Clave: admin123 (Acceso Total)</p>
                  </div>
                  <div
                    onClick={() => { setEmail("empleado@farmacia.gt"); setPass("empleado123"); }}
                    className="cursor-pointer rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2 hover:bg-emerald-500/10 transition-colors"
                  >
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">👤 Empleado</p>
                    <p className="text-[11px] text-foreground font-mono">empleado@farmacia.gt</p>
                    <p className="text-[11px] text-muted-foreground">Clave: empleado123 (Caja & Ventas)</p>
                  </div>
                </div>
                <p className="text-[11px] italic text-muted-foreground text-center">
                  💡 Haz clic en cualquiera de las dos tarjetas para auto-completar los datos
                </p>
              </div>
            </form>
          </TabsContent>

          {/* TAB: REGISTRO */}
          <TabsContent value="register" className="animate-in fade-in duration-300">
            <form onSubmit={submitReg} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rnombre">Nombre completo del usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="rnombre"
                    placeholder="Ej. Carlos Méndez"
                    className="pl-9"
                    value={reg.nombre}
                    onChange={(e) => setReg({ ...reg, nombre: e.target.value })}
                  />
                </div>
                <Err m={regErr.nombre} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rcorreo">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="rcorreo"
                    type="email"
                    placeholder="carlos@farmacia.gt"
                    className="pl-9"
                    value={reg.correo}
                    onChange={(e) => setReg({ ...reg, correo: e.target.value })}
                  />
                </div>
                <Err m={regErr.correo} />
              </div>

              {/* SELECCIÓN DE ROL */}
              <div className="space-y-1.5">
                <Label htmlFor="rrol">Tipo de Cuenta (Rol en Farmacia)</Label>
                <Select
                  value={reg.rol}
                  onValueChange={(v) => {
                    setReg({ ...reg, rol: v as Rol, adminAuthKey: "" });
                    setRegErr({ ...regErr, adminAuthKey: undefined });
                  }}
                >
                  <SelectTrigger id="rrol" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Empleado">
                      <div className="flex items-center gap-2">
                        <span>👤</span>
                        <div>
                          <p className="font-semibold leading-none">Empleado</p>
                          <p className="text-[11px] text-muted-foreground">Punto de Venta, cobro, catálogo y asistente IA</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="Administrador">
                      <div className="flex items-center gap-2">
                        <span>👑</span>
                        <div>
                          <p className="font-semibold leading-none text-primary">Administrador</p>
                          <p className="text-[11px] text-muted-foreground">Control total: inventario, compras, reportes y usuarios</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CLAVE DE AUTORIZACIÓN PARA ADMINISTRADOR */}
              {reg.rol === "Administrador" && (
                <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0 mt-0.5">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <Label htmlFor="radminKey" className="font-bold text-foreground flex items-center gap-1.5">
                        Clave de Autorización Maestra (Programador / Empresa)
                        <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Requerida para autorizar privilegios de administrador. Solo el programador y la empresa poseen esta clave.
                      </p>
                    </div>
                  </div>

                  <PassInput
                    id="radminKey"
                    value={reg.adminAuthKey}
                    onChange={(v) => {
                      setReg({ ...reg, adminAuthKey: v });
                      if (regErr.adminAuthKey) setRegErr({ ...regErr, adminAuthKey: undefined });
                    }}
                    placeholder="Introduce la clave autorizada..."
                  />

                  {reg.adminAuthKey === ADMIN_MASTER_PASSWORD && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      <Check className="h-3.5 w-3.5" /> Clave de autorización válida. Permisos de Administrador concedidos.
                    </div>
                  )}

                  <Err m={regErr.adminAuthKey} />
                </div>
              )}

              {/* CONTRASEÑA CON MEDIDOR DE FORTALEZA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rpass">Contraseña para tu cuenta</Label>
                  {reg.password && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      passStrength.level === "baja"
                        ? "bg-destructive/15 text-destructive"
                        : passStrength.level === "media"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {passStrength.label}
                    </span>
                  )}
                </div>

                <PassInput
                  id="rpass"
                  value={reg.password}
                  onChange={(v) => {
                    setReg({ ...reg, password: v });
                    if (regErr.password) setRegErr({ ...regErr, password: undefined });
                  }}
                  placeholder="Mínimo 6 caracteres combinando letras y números"
                />

                {/* Medidor visual de fortaleza (3 segmentos) */}
                {reg.password && (
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-3 gap-1.5 h-1.5">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        passStrength.score >= 1
                          ? passStrength.score === 1
                            ? "bg-destructive"
                            : passStrength.score === 2
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                          : "bg-muted"
                      }`} />
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        passStrength.score >= 2
                          ? passStrength.score === 2
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                          : "bg-muted"
                      }`} />
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        passStrength.score >= 3 ? "bg-emerald-500" : "bg-muted"
                      }`} />
                    </div>

                    {/* Feedback y validaciones */}
                    <div className="text-[11px] space-y-1 rounded-xl p-2.5 bg-muted/40 border border-border/60">
                      <div className="flex items-center justify-between font-semibold">
                        <span className={passStrength.isAllowed ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                          {passStrength.isAllowed
                            ? "✓ Nivel apto para crear cuenta"
                            : "✕ Nivel bajo: NO se puede crear la cuenta"}
                        </span>
                        <span className="text-muted-foreground text-[10px]">Requisito: Media o Fuerte</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground pt-1">
                        <span className={passStrength.checks.minChars ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                          {passStrength.checks.minChars ? "✓" : "○"} Mínimo 6 caracteres
                        </span>
                        <span className={passStrength.checks.hasNumber ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                          {passStrength.checks.hasNumber ? "✓" : "○"} Contiene números
                        </span>
                        <span className={passStrength.checks.hasMixedCaseOrSymbol ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                          {passStrength.checks.hasMixedCaseOrSymbol ? "✓" : "○"} Mayúsculas o símbolos
                        </span>
                        <span className={passStrength.checks.strongChars ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                          {passStrength.checks.strongChars ? "✓" : "○"} 8+ caracteres (Fuerte)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Err m={regErr.password} />
              </div>

              {/* Botón de creación con validación preventiva */}
              <Button
                type="submit"
                variant="success"
                size="lg"
                className="w-full"
                disabled={
                  regLoading ||
                  (reg.password.length > 0 && !passStrength.isAllowed) ||
                  (reg.rol === "Administrador" && !reg.adminAuthKey)
                }
              >
                {regLoading ? (
                  <><Loader2 className="animate-spin mr-2" /> Creando cuenta...</>
                ) : (
                  <>
                    {reg.rol === "Administrador" ? "👑 Crear Cuenta de Administrador" : "👤 Crear Cuenta de Empleado"}
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          FarmaciaDB · Versión de prototipo empresarial con seguridad y perfiles de usuario.
        </p>
      </div>
    </div>
  );
}
