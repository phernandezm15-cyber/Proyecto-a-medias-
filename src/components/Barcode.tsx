export function Barcode({ value, className = "" }: { value: string; className?: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of `9${value}9`) {
    const d = Number(ch) || 0;
    const w1 = (d % 3) + 1;
    bars.push({ x, w: w1 });
    x += w1 + ((d >> 1) % 2) + 1;
  }
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg viewBox={`0 0 ${x} 24`} className="h-7 w-24 text-foreground" preserveAspectRatio="none" aria-label={`Código ${value}`}>
        {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="currentColor" />)}
      </svg>
      <span className="font-mono text-[9px] tracking-wider text-muted-foreground">{value}</span>
    </div>
  );
}
