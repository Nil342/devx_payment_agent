import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  const [form, setForm] = useState({
    approvalMode: "hybrid",
    autoApproveThreshold: 50000,
    cfoReviewThreshold: 200000,
    managerReviewThreshold: 100000,
    highRiskThreshold: 70,
    notificationsEnabled: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        approvalMode: settings.approvalMode ?? "hybrid",
        autoApproveThreshold: settings.autoApproveThreshold ?? 50000,
        cfoReviewThreshold: settings.cfoReviewThreshold ?? 200000,
        managerReviewThreshold: settings.managerReviewThreshold ?? 100000,
        highRiskThreshold: settings.highRiskThreshold ?? 70,
        notificationsEnabled: settings.notificationsEnabled ?? true,
      });
    }
  }, [settings]);

  const update = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved", description: "AP Agent configuration updated." });
      },
      onError: () => toast({ title: "Save failed", variant: "destructive" }),
    }
  });

  const handleSave = () => {
    update.mutate({ data: form });
  };

  return (
    <Shell
      title="Settings"
      subtitle="Configure AP Agent approval thresholds and behavior"
      actions={
        <Button data-testid="button-save-settings" onClick={handleSave} disabled={update.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          {update.isPending ? "Saving..." : "Save Settings"}
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Approval Mode */}
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <SettingsIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Approval Configuration</h2>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Approval Mode</Label>
                <Select
                  value={form.approvalMode}
                  onValueChange={(v) => setForm((f) => ({ ...f, approvalMode: v }))}
                >
                  <SelectTrigger data-testid="select-approval-mode" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Fully Automatic</SelectItem>
                    <SelectItem value="hybrid">Hybrid (AI + Human review)</SelectItem>
                    <SelectItem value="manual">Full Manual Review</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Hybrid mode uses AI to auto-approve low-risk invoices and escalate high-risk ones.
                </p>
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-5">Approval Thresholds</h2>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Auto-Approve Threshold (₹)</Label>
                <Input
                  data-testid="input-auto-approve"
                  type="number"
                  value={form.autoApproveThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, autoApproveThreshold: Number(e.target.value) }))}
                  className="bg-white"
                />
                <p className="text-xs text-muted-foreground">Invoices below this amount are auto-approved if low risk.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Manager Review Threshold (₹)</Label>
                <Input
                  data-testid="input-manager-review"
                  type="number"
                  value={form.managerReviewThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, managerReviewThreshold: Number(e.target.value) }))}
                  className="bg-white"
                />
                <p className="text-xs text-muted-foreground">Amounts above this require manager sign-off.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">CFO Review Threshold (₹)</Label>
                <Input
                  data-testid="input-cfo-review"
                  type="number"
                  value={form.cfoReviewThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, cfoReviewThreshold: Number(e.target.value) }))}
                  className="bg-white"
                />
                <p className="text-xs text-muted-foreground">Large invoices escalated to CFO for final approval.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">High Risk Score Threshold (%)</Label>
                <Input
                  data-testid="input-high-risk"
                  type="number"
                  min="0"
                  max="100"
                  value={form.highRiskThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, highRiskThreshold: Number(e.target.value) }))}
                  className="bg-white"
                />
                <p className="text-xs text-muted-foreground">Invoices with risk score above this are flagged high risk.</p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-5">Notifications</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Enable Notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">Receive alerts for high-risk invoices and exceptions</p>
              </div>
              <Switch
                data-testid="switch-notifications"
                checked={form.notificationsEnabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, notificationsEnabled: v }))}
              />
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
