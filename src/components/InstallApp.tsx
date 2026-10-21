import { useEffect, useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";

type BIP = Event & { prompt: () => Promise<void> };

export function InstallApp({ compact }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BIP | null>(null);
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setDeferred(e as BIP); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
      return;
    }
    setOpen(true);
    setPct(0);
    let p = 0;
    const t = setInterval(() => {
      p += 8 + Math.random() * 14;
      setPct(Math.min(100, p));
      if (p >= 100) {
        clearInterval(t);
        toast.success("FarmaciaDB instalada", { description: "Acceso directo creado en tu escritorio (simulado)" });
      }
    }, 220);
  };

  return (
    <>
      <Button variant="hero" size={compact ? "icon" : "default"} className="glow w-full" onClick={install} aria-label="Instalar App">
        <Download /> {!compact && "Instalar App"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader><DialogTitle>Instalando FarmaciaDB</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className={pct >= 100 ? "" : "animate-bounce"}><Logo /></div>
            <Progress value={pct} className="w-full" />
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {pct >= 100 ? <><CheckCircle2 className="h-4 w-4 text-success" /> ¡Lista para usar!</> : `Descargando recursos... ${Math.round(pct)}%`}
            </p>
            {pct >= 100 && <Button onClick={() => setOpen(false)}>Abrir</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
