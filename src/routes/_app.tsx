import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, ShoppingCart, Package, Truck, PackagePlus, FileBarChart,
  Moon, Sun, LogOut, UserCircle2, Bell, AlertTriangle, Clock, Users, Minimize2,
  ShieldAlert, ShieldCheck, Lock, Info, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { Chatbot } from "@/components/Chatbot";
import { InstallApp } from "@/components/InstallApp";
import { UsersModal } from "@/components/UsersModal";
import { supabase } from "@/integrations/supabase/client";
import { useData, useMe } from "@/lib/db";
import { diasParaVencer, useUI } from "@/lib/store";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const path = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, badge: "" },
    { title: "Punto de Venta", url: "/pos", icon: ShoppingCart, badge: !isAdmin ? "Ventas" : "" },
    { title: "Inventario", url: "/inventario", icon: Package, badge: !isAdmin ? "Consulta" : "" },
    { title: "Clientes", url: "/clientes", icon: Users, badge: "" },
    { title: "Proveedores", url: "/proveedores", icon: Truck, badge: !isAdmin ? "🔒 Admin" : "" },
    { title: "Compras", url: "/compras", icon: PackagePlus, badge: !isAdmin ? "🔒 Admin" : "" },
    { title: !isAdmin ? "Corte de Turno" : "Reportes", url: "/reportes", icon: FileBarChart, badge: !isAdmin ? "Turno" : "" },
  ];

  return (
    <Sidebar collapsible="icon" className="backdrop-blur-xl">
      <SidebarHeader className="p-3"><Logo compact={collapsed} /></SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-3 py-1.5">
            <SidebarGroupLabel className="p-0">Menú</SidebarGroupLabel>
            {!collapsed && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isAdmin
                  ? "bg-primary/20 text-primary"
                  : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              }`}>
                {isAdmin ? "👑 Admin" : "👤 Empleado"}
              </span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={path === it.url} tooltip={it.title}>
                    <Link to={it.url} onClick={() => setOpenMobile(false)} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <it.icon />
                        <span>{it.title}</span>
                      </div>
                      {!collapsed && it.badge && (
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          it.badge.includes("Admin")
                            ? "bg-muted text-muted-foreground border border-border"
                            : "bg-primary/10 text-primary font-bold"
                        }`}>
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2">
        {isAdmin && !collapsed && (
          <UsersModal
            trigger={
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                <Users className="h-4 w-4 text-primary" />
                <span>Gestión de Personal</span>
              </Button>
            }
          />
        )}
        <InstallApp compact={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function ConnectionPill() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); toast.success("Conexión restablecida"); };
    const off = () => { setOnline(false); toast.warning("Sin conexión", { description: "Los cambios no se guardarán" }); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return (
    <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold md:inline-flex ${online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
      <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-success" : "bg-muted-foreground"}`} />
      {online ? "Conectado a DB" : "Offline"}
    </span>
  );
}

function Notifications() {
  const { meds } = useData();
  const criticos = meds.filter((m) => m.stock < 10);
  const porVencer = meds.filter((m) => m.stock >= 10 && diasParaVencer(m.caducidad) <= 30);
  const total = criticos.length + porVencer.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in zoom-in">{total}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass w-80 p-0">
        <div className="border-b px-4 py-3 font-bold">Alertas ({total})</div>
        <div className="max-h-80 overflow-auto p-2">
          {!total && <p className="p-4 text-center text-sm text-muted-foreground">Sin alertas 🎉</p>}
          {criticos.map((m) => (
            <div key={m.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="text-sm"><p className="font-semibold">{m.nombre}</p><p className="text-xs text-muted-foreground">Stock crítico: {m.stock} unidades</p></div>
            </div>
          ))}
          {porVencer.map((m) => (
            <div key={m.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="text-sm"><p className="font-semibold">{m.nombre}</p><p className="text-xs text-muted-foreground">Vence en {diasParaVencer(m.caducidad)} días</p></div>
            </div>
          ))}
        </div>
        <div className="border-t p-2"><Button asChild variant="ghost" size="sm" className="w-full"><Link to="/inventario">Ver inventario</Link></Button></div>
      </PopoverContent>
    </Popover>
  );
}

function RoleBadgeModal({ me }: { me: any }) {
  const isAdmin = me?.isAdmin;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="cursor-pointer text-left focus:outline-none">
          {isAdmin ? (
            <Badge className="bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 font-bold text-xs gap-1.5 py-1 px-2.5 shadow-sm">
              👑 Administrador
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs gap-1.5 py-1 px-2.5">
              👤 Empleado (Caja)
            </Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="glass max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ${
              isAdmin ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            }`}>
              {isAdmin ? "👑" : "👤"}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isAdmin ? "Perfil: Administrador General" : "Perfil: Empleado de Farmacia"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">{me?.email}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Tus Facultades en el Sistema:
            </p>
            <ul className="space-y-1.5 text-muted-foreground">
              {isAdmin ? (
                <>
                  <li>• Control total del catálogo: añadir, editar precios de compra y venta, eliminar productos.</li>
                  <li>• Acceso a reportes financieros de ganancias, márgenes y exportación oficial a PDF/Excel.</li>
                  <li>• Emisión y recepción de órdenes de compra a proveedores.</li>
                  <li>• Panel de auditoría y creación de personal (Administradores y Empleados).</li>
                </>
              ) : (
                <>
                  <li>• Operación completa del Punto de Venta (POS): cobrar, escanear y generar tickets.</li>
                  <li>• Consulta en tiempo real de existencias, precios de venta y fechas de vencimiento.</li>
                  <li>• Búsqueda por voz rápida para atención ágil al cliente.</li>
                  <li>• Asistente de Inteligencia Artificial para recomendaciones sobre síntomas y fármacos.</li>
                  <li>• Registro y visualización de tu corte de caja y ventas de turno.</li>
                </>
              )}
            </ul>
          </div>

          {!isAdmin && (
            <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Restricciones de Cuenta Empleado:
              </p>
              <p className="text-[11px] leading-relaxed">
                Por políticas de auditoría, las altas o bajas de medicamentos, modificación de precios de lista y reportes financieros globales requieren autorización de un Administrador con clave maestra.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dark = useUI((s) => s.dark);
  const toggleDark = useUI((s) => s.toggleDark);
  const focus = useUI((s) => s.focus);
  const setFocus = useUI((s) => s.setFocus);
  const me = useMe();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (path !== "/pos" && focus) setFocus(false);
  }, [path, focus, setFocus]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && setFocus(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setFocus]);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((ev: any) => {
      if (ev === "SIGNED_OUT") navigate({ to: "/login", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const logout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/login", replace: true });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-app">
        {!focus && <AppSidebar isAdmin={!!me?.isAdmin} />}
        <div className="flex min-w-0 flex-1 flex-col">
          {!focus ? (
            <header className="glass sticky top-0 z-20 flex h-14 items-center gap-1.5 rounded-none border-x-0 border-t-0 px-3 sm:gap-2 sm:px-5">
              <SidebarTrigger />
              <ConnectionPill />
              <div className="flex-1" />

              {/* USER & ROLE BADGE */}
              <div className="mr-2 flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 leading-tight text-right">
                  <div>
                    <p className="text-sm font-semibold">{me?.nombre ?? "Usuario"}</p>
                    <p className="text-[11px] text-muted-foreground">{me?.email}</p>
                  </div>
                </div>
                <RoleBadgeModal me={me} />
              </div>

              {me?.isAdmin && (
                <div className="hidden md:block">
                  <UsersModal />
                </div>
              )}

              <Notifications />
              <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Cambiar tema">
                {dark ? <Sun /> : <Moon />}
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </header>
          ) : (
            <Button variant="outline" size="sm" className="glass fixed right-4 top-4 z-30" onClick={() => setFocus(false)}>
              <Minimize2 /> Salir del Modo Enfoque (Esc)
            </Button>
          )}
          <main className="mx-auto w-full max-w-[1800px] flex-1 p-4 sm:p-6 lg:p-8">
            <div key={path} className="animate-in fade-in slide-in-from-bottom-3 duration-500"><Outlet /></div>
          </main>
          {!focus && (
            <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
              FarmaciaDB · Sistema de Control Farmacéutico Empresarial con roles diferenciados.
            </footer>
          )}
        </div>
      </div>
      {!focus && <Chatbot />}
    </SidebarProvider>
  );
}
