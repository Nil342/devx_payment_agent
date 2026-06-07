import { Sidebar } from "./Sidebar";

interface ShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Shell({ children, title, subtitle, actions }: ShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <div>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
