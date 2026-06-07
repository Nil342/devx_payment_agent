import { Switch, Route, Router as WouterRouter, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices/index";
import InvoiceDetailPage from "@/pages/invoices/detail";
import VendorsPage from "@/pages/vendors/index";
import VendorDetailPage from "@/pages/vendors/detail";
import ExceptionsPage from "@/pages/exceptions";
import MemoryPage from "@/pages/memory";
import DecisionsPage from "@/pages/decisions";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function InvoiceDetailRoute() {
  const params = useParams<{ id: string }>();
  return <InvoiceDetailPage id={Number(params.id)} />;
}

function VendorDetailRoute() {
  const params = useParams<{ id: string }>();
  return <VendorDetailPage id={Number(params.id)} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/invoices/:id" component={InvoiceDetailRoute} />
      <Route path="/vendors" component={VendorsPage} />
      <Route path="/vendors/:id" component={VendorDetailRoute} />
      <Route path="/exceptions" component={ExceptionsPage} />
      <Route path="/memory" component={MemoryPage} />
      <Route path="/decisions" component={DecisionsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
