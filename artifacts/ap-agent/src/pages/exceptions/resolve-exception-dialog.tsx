import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateException, getListExceptionsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  notes: z.string().min(5, "Please provide a brief note on how this was resolved."),
});

type FormValues = z.infer<typeof formSchema>;

export function ResolveExceptionDialog({ exceptionId, onResolved }: { exceptionId: number, onResolved?: () => void }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  });

  const { mutate: updateException, isPending } = useUpdateException({
    mutation: {
      onSuccess: () => {
        toast.success("Exception marked as resolved");
        queryClient.invalidateQueries({ queryKey: getListExceptionsQueryKey() });
        setOpen(false);
        form.reset();
        onResolved?.();
      },
      onError: (error) => {
        toast.error("Failed to resolve exception");
        console.error("Resolve exception error:", error);
      },
    },
  });

  function onSubmit(data: FormValues) {
    updateException({
      id: exceptionId,
      data: {
        resolved: true,
        notes: data.notes,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 bg-white/70">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resolve Exception</DialogTitle>
          <DialogDescription>
            Provide resolution notes. The AI agent will learn from this to handle future invoices automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Vendor agreed to adjust tax amount. Proceed with payment."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Resolving..." : "Mark as Resolved"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
