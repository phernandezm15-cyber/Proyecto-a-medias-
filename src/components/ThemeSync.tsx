import { useEffect } from "react";
import { useUI } from "@/lib/store";

export function ThemeSync() {
  const dark = useUI((s) => s.dark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return null;
}
