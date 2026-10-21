import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ShoppingCart, Package, Truck, PackagePlus, FileBarChart, Moon, Sun, LogOut, UserCircle2, Bell, AlertTriangle, Clock, Users, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Logo } from "@/components/Logo";
import { Chatbot } from "@/components/Chatbot";
import { InstallApp } from "@/components/InstallApp";
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

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Punto de Venta", url: "/pos", icon: ShoppingCart },
  { title: "Inventario", url: "/inventario", icon: Package },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Proveedores", url: "/proveedores", icon: Truck },
  { title: "Compras", url: "/compras", icon: PackagePlus },
  { title: "Reportes", url: "/reportes", icon: FileBarChart },
] as const;

function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon" className="backdrop-blur-xl">
      <SidebarHeader className="p-3"><Logo compact={collapsed} /></SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={path === it.url} tooltip={it.title}>
                    <Link to={it.url} onClick={() => setOpenMobile(false)}>
                      <it.icon />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3"><InstallApp compact={collapsed} /></SidebarFooter>
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
        {!focus && <AppSidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          {!focus ? (
            <header className="glass sticky top-0 z-20 flex h-14 items-center gap-1.5 rounded-none border-x-0 border-t-0 px-3 sm:gap-2 sm:px-5">
              <SidebarTrigger />
              <ConnectionPill />
              <div className="flex-1" />
              <div className="mr-1 hidden items-center gap-2 sm:flex">
                <UserCircle2 className="h-7 w-7 text-primary" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{me?.nombre ?? "..."}</p>
                  <p className="text-[11px] text-muted-foreground">{me?.rol ?? ""}</p>
                </div>
              </div>
              <Notifications />
              <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Cambiar tema">{dark ? <Sun /> : <Moon />}</Button>
              <Button variant="outline" size="sm" onClick={logout}><LogOut /> <span className="hidden sm:inline">Cerrar Sesión</span></Button>
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
              Versión de prototipo. Los datos presentados son demostrativos. Las funciones de backend y seguridad requieren configuración adicional.
            </footer>
          )}
        </div>
      </div>
      {!focus && <Chatbot />}
    </SidebarProvider>
  );
}
