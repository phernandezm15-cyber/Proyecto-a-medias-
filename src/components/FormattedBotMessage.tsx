/**
 * FormattedBotMessage Component
 * Transforms raw markdown / structured AI messages from FarmaciaDB into
 * beautiful, highly readable cards, badges, and alerts.
 * Eliminates unparsed raw asterisks (**) and bullet clutter.
 */

import React from "react";
import {
  Pill,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Info,
  Package,
  Sparkles,
  TrendingUp,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FormattedBotMessageProps {
  text: string;
}

// Clean raw markdown bold/italic tags into React elements
export function renderInlineMarkdown(str: string): React.ReactNode {
  if (!str) return null;

  // Split by **bold** tokens
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-foreground">
          {inner}
        </strong>
      );
    }
    // Also handle *italic*
    const subParts = part.split(/(\*.*?\*)/g);
    return subParts.map((sub, sIdx) => {
      if (sub.startsWith("*") && sub.endsWith("*") && sub.length >= 3) {
        return (
          <em key={`${idx}-${sIdx}`} className="italic text-muted-foreground">
            {sub.slice(1, -1)}
          </em>
        );
      }
      return sub;
    });
  });
}

// Clean string from markdown asterisks for plain string extraction
function stripMarkdown(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

export function FormattedBotMessage({ text }: FormattedBotMessageProps) {
  if (!text) return null;

  const rawLines = text.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Alert / Warning Callout Box (⚠️, 🛑, 💡)
    if (
      line.startsWith("⚠️") ||
      line.startsWith("🛑") ||
      line.startsWith("💡") ||
      line.toLowerCase().includes("aviso de salud") ||
      line.toLowerCase().includes("atención farmacéutica")
    ) {
      const isRed = line.startsWith("🛑") || line.toLowerCase().includes("atención farmacéutica");
      const isBlue = line.startsWith("💡");

      const alertText = line
        .replace(/^[⚠️🛑💡]\s*/, "")
        .replace(/^(\*\*Aviso.*?\*\*|\*\*Atención.*?\*\*|\*\*Advertencia.*?\*\*):?\s*/i, "");

      const title = isRed
        ? "Atención Farmacéutica / Receta Médica"
        : isBlue
        ? "Consejo de Farmacia"
        : "Aviso de Salud Importante";

      renderedElements.push(
        <div
          key={`alert-${i}`}
          className={`rounded-xl border p-3 my-2 flex items-start gap-2.5 text-xs ${
            isRed
              ? "border-destructive/40 bg-destructive/10 text-destructive-foreground dark:text-red-200"
              : isBlue
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          }`}
        >
          {isRed ? (
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
          ) : isBlue ? (
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          )}
          <div className="space-y-0.5 leading-relaxed">
            <p className="font-bold text-[11px] uppercase tracking-wide opacity-90">{title}</p>
            <p>{renderInlineMarkdown(alertText)}</p>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 2. Main Section Header (e.g. 📅 **Medicamentos con vencimiento próximo...**)
    const isHeaderEmoji = /^(📅|🩺|💊|📊|🏆|📦|👥|⚠️)/.test(line);
    const isBoldHeader = line.startsWith("**") && line.endsWith("**") && line.length < 90;
    const isColonHeader = (line.startsWith("**") || isHeaderEmoji) && line.endsWith(":");

    if (isHeaderEmoji || isBoldHeader || isColonHeader) {
      const cleanHeader = stripMarkdown(line).replace(/:$/, "");
      renderedElements.push(
        <div
          key={`header-${i}`}
          className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 my-2 shadow-2xs"
        >
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="leading-snug">{cleanHeader}</span>
        </div>
      );
      i++;
      continue;
    }

    // 3. Medicine / Product Item Line (e.g. • **Voltaren** (Diclofenaco 50mg): vence el ...)
    // Or numbered item: 1. **Gaviscon** (Alginato de sodio):
    const medMatch = line.match(/^([•\-\*]|\d+\.)\s*\*\*(.*?)\*\*(?:\s*\((.*?)\))?:\s*(.*)/);
    if (medMatch) {
      const medName = stripMarkdown(medMatch[2]);
      const principle = medMatch[3] ? stripMarkdown(medMatch[3]) : "";
      const rest = medMatch[4];

      // Parse nested detail lines that belong to this medicine (e.g. "   • **Ideal para:** ...")
      const subDetails: string[] = [];
      let j = i + 1;
      while (j < rawLines.length) {
        const nextLine = rawLines[j].trim();
        if (
          nextLine.startsWith("•") ||
          nextLine.startsWith("-") ||
          nextLine.startsWith("1.") ||
          nextLine.startsWith("2.") ||
          nextLine.startsWith("3.")
        ) {
          // If it's a new main item, break
          if (nextLine.match(/^([•\-\*]|\d+\.)\s*\*\*/)) {
            break;
          }
        }
        if (nextLine.startsWith("   •") || nextLine.startsWith("  -") || nextLine.startsWith("•")) {
          subDetails.push(nextLine);
          j++;
        } else {
          break;
        }
      }
      i = j;

      // Extract details from rest
      let stockText = "";
      let expiryText = "";
      let priceText = "";
      let generalDesc = rest;

      // Extract stock if present: e.g. "Stock: 40 uds." or "solo quedan 6 uds."
      const stockMatch = rest.match(/(?:Stock:?\s*|solo quedan\s*|stock actual:?\s*)([\d]+(?:\s*uds\.?)?)/i);
      if (stockMatch) {
        stockText = stockMatch[1];
        if (!stockText.includes("uds")) stockText += " uds";
      }

      // Extract expiry if present: e.g. "vence el 2026-11-02 (en 13 días)"
      const expiryMatch = rest.match(/(?:vence\s+(?:el\s+)?)([\d\-]+(?:\s*\([^)]+\))?)/i);
      if (expiryMatch) {
        expiryText = expiryMatch[1];
      }

      // Extract price if present: e.g. "Precio: Q 45.00" or "Q 45.00"
      const priceMatch = rest.match(/(?:Precio:?\s*)?(Q\s*[\d]+(?:\.[\d]{2})?)/i);
      if (priceMatch) {
        priceText = priceMatch[1];
      }

      // Clean generalDesc by removing the extracted badges parts
      generalDesc = generalDesc
        .replace(/(?:vence\s+(?:el\s+)?)([\d\-]+(?:\s*\([^)]+\))?)/gi, "")
        .replace(/—\s*Stock:?\s*[\d]+\s*uds\.?/gi, "")
        .replace(/\|\s*Precio:?\s*Q\s*[\d\.]+/gi, "")
        .replace(/^,\s*|\s*,\s*$/g, "")
        .trim();

      renderedElements.push(
        <div
          key={`med-card-${i}-${medName}`}
          className="rounded-xl border border-border/80 bg-card p-3 my-2 shadow-2xs hover:border-primary/50 transition-all space-y-2"
        >
          {/* Card Top: Name and Stock */}
          <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2">
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
                <Pill className="h-4 w-4 text-primary shrink-0" />
                <span>{medName}</span>
              </h4>
              {principle && (
                <p className="text-[11px] text-muted-foreground font-medium pl-5">{principle}</p>
              )}
            </div>

            {stockText && (
              <Badge
                variant={
                  parseInt(stockText) < 10
                    ? "danger"
                    : parseInt(stockText) < 20
                    ? "warning"
                    : "success"
                }
                className="shrink-0 text-[10px] font-bold gap-1"
              >
                <Package className="h-3 w-3" />
                Stock: {stockText}
              </Badge>
            )}
          </div>

          {/* Badges: Expiry & Price */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {expiryText && (
              <Badge
                variant={
                  expiryText.includes("¡Vencido!") || expiryText.includes("en 1") || expiryText.includes("en 0")
                    ? "danger"
                    : "warning"
                }
                className="text-[10px] gap-1 py-0.5"
              >
                <Calendar className="h-3 w-3" />
                Vence: {stripMarkdown(expiryText)}
              </Badge>
            )}

            {priceText && (
              <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/40 gap-1 bg-primary/5">
                <Tag className="h-3 w-3 text-primary" />
                Precio: {priceText}
              </Badge>
            )}
          </div>

          {/* General description if present */}
          {generalDesc && generalDesc.replace(/^[.,:—\s]+|[.,:—\s]+$/g, "") && (
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              {renderInlineMarkdown(generalDesc)}
            </p>
          )}

          {/* Sub-details (Ideal para, Dosis, etc.) */}
          {subDetails.length > 0 && (
            <div className="mt-2 space-y-1 bg-muted/40 rounded-lg p-2 text-xs">
              {subDetails.map((sub, sIdx) => (
                <div key={sIdx} className="leading-snug">
                  {renderInlineMarkdown(sub.replace(/^[•\-\s]+/, "• "))}
                </div>
              ))}
            </div>
          )}
        </div>
      );
      continue;
    }

    // 4. Regular Bullet Point Line (e.g. • Total histórico...)
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      const cleanBullet = line.replace(/^[•\-\*]\s*/, "");
      renderedElements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 py-0.5 text-xs sm:text-sm">
          <span className="text-primary font-bold mt-1 text-xs">•</span>
          <span className="leading-relaxed">{renderInlineMarkdown(cleanBullet)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 5. Standard paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed my-1">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{renderedElements}</div>;
}
