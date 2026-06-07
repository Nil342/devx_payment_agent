import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Building2,
  AlertTriangle,
  Brain,
  ShieldCheck,
  Settings,
  Cpu,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoice Inbox", icon: FileText },
  { href: "/vendors", label: "Vendor Intelligence", icon: Building2 },
  { href: "/exceptions", label: "Exception Log", icon: AlertTriangle },
  { href: "/memory", label: "Memory Explorer", icon: Brain },
  { href: "/decisions", label: "Decision Audit", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white/80 backdrop-blur-md border-r border-border/60 flex flex-col z-40 shadow-sm">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-border/60">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Cpu className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">AP Agent</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Accounts Payable AI</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer",
                active
                  ? "bg-primary text-white shadow-sm font-medium"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/60">
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">AI Agents Online</span>
        </div>
      </div>
    </aside>
  );
}
