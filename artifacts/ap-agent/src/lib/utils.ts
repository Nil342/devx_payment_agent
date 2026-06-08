import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function riskBg(level: string): string {
  switch (level?.toLowerCase()) {
    case "high": return "bg-red-50 text-red-700 border-red-200";
    case "medium": return "bg-amber-50 text-amber-700 border-amber-200";
    case "low": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function statusBg(status: string): string {
  switch (status?.toLowerCase()) {
    case "approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending": return "bg-blue-50 text-blue-700 border-blue-200";
    case "processing": return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "flagged": return "bg-amber-50 text-amber-700 border-amber-200";
    case "manager_review": return "bg-sky-50 text-sky-700 border-sky-200";
    case "cfo_review": return "bg-violet-50 text-violet-700 border-violet-200";
    case "rejected": return "bg-red-50 text-red-700 border-red-200";
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "review": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function severityBg(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "high": return "bg-red-50 text-red-700 border-red-200";
    case "medium": return "bg-amber-50 text-amber-700 border-amber-200";
    case "low": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function actionBg(action: string): string {
  switch (action?.toLowerCase()) {
    case "approve": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "reject": return "bg-red-50 text-red-700 border-red-200";
    case "flag": return "bg-amber-50 text-amber-700 border-amber-200";
    case "cfo_review": return "bg-purple-50 text-purple-700 border-purple-200";
    case "manager_review": return "bg-blue-50 text-blue-700 border-blue-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
