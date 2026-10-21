import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function useFakeLoading(ms = 1000) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

/** Shows a short loading state whenever `dep` changes (skips first render). */
export function useDebouncedLoading(dep: unknown, ms = 500) {
  const [loading, setLoading] = useState(false);
  const first = useRef(true);
  const key = JSON.stringify(dep);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return loading;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
    </div>
  );
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <TableSkeleton rows={5} />
    </div>
  );
}
