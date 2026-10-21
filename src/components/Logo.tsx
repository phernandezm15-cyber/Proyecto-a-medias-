import { Cross } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-md">
        <Cross className="h-5 w-5" strokeWidth={2.5} />
      </div>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          Farmacia<span className="text-success">DB</span>
        </span>
      )}
    </div>
  );
}
