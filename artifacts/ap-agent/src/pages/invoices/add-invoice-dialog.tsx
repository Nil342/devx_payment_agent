import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateInvoice, useListVendors, useUploadInvoice, getListInvoicesQueryKey, getListVendorsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  vendorId: z.string().min(1, "Please select a vendor"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  amount: z.string().min(1, "Amount is required"),
  taxAmount: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  description: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export function AddInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendors = [] } = useListVendors({
    query: { queryKey: getListVendorsQueryKey() }
  });

  const [isUploading, setIsUploading] = useState(false);
  const { mutateAsync: uploadInvoiceFile } = useUploadInvoice();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: "",
      invoiceNumber: "",
      amount: "",
      taxAmount: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentTerms: "Net 30",
      description: "",
    },
  });

  const { mutate: createInvoice, isPending } = useCreateInvoice({
    mutation: {
      onSuccess: (data) => {
        toast.success("Invoice created successfully");
        // Update the main list cache directly to show the new invoice instantly
        queryClient.setQueryData(
          getListInvoicesQueryKey({ status: undefined, riskLevel: undefined }),
          (oldData: any) => {
            if (Array.isArray(oldData)) {
              return [data, ...oldData];
            }
            return oldData;
          }
        );
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast.error("Failed to create invoice");
        console.error("Create invoice error:", error);
      },
    },
  });

  function onSubmit(data: FormValues) {
    createInvoice({
      data: {
        vendorId: parseInt(data.vendorId, 10),
        invoiceNumber: data.invoiceNumber,
        amount: parseFloat(data.amount),
        description: data.description || "",
        invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        taxAmount: data.taxAmount ? parseFloat(data.taxAmount) : 0,
        paymentTerms: data.paymentTerms || "Net 30",
      },
    });
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.info("Uploading and analyzing document...");
    try {
      const ocrResult = await uploadInvoiceFile({ data: { file: file as any } });
      
      if (ocrResult.invoiceNumber) form.setValue("invoiceNumber", ocrResult.invoiceNumber);
      if (ocrResult.amount) form.setValue("amount", ocrResult.amount.toString());
      if (ocrResult.taxAmount) form.setValue("taxAmount", ocrResult.taxAmount.toString());
      if (ocrResult.invoiceDate) form.setValue("invoiceDate", ocrResult.invoiceDate.split('T')[0]);
      if (ocrResult.dueDate) form.setValue("dueDate", ocrResult.dueDate.split('T')[0]);
      if (ocrResult.paymentTerms) form.setValue("paymentTerms", ocrResult.paymentTerms);
      if (ocrResult.vendorName) {
        const matchedVendor = vendors.find(v => v.name.toLowerCase().includes(ocrResult.vendorName!.toLowerCase()));
        if (matchedVendor) {
          form.setValue("vendorId", matchedVendor.id.toString());
        } else {
          const currentDesc = form.getValues("description");
          form.setValue("description", `${currentDesc ? currentDesc + '\\n' : ''}Vendor Extracted: ${ocrResult.vendorName}`);
        }
      }
      toast.success("Document analyzed successfully!");
    } catch (error) {
      toast.error("Failed to extract data from document.");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Invoice</DialogTitle>
          <DialogDescription>
            Submit an invoice for the AI agent to review.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors min-h-[300px]">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center mb-4">
                Upload PDF or Image to autofill
              </p>
              <Button variant="secondary" className="relative cursor-pointer" disabled={isUploading}>
                {isUploading ? "Analyzing..." : "Choose File"}
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  onChange={handleFileUpload} 
                  accept="application/pdf,image/*" 
                  disabled={isUploading}
                />
              </Button>
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div className="mb-4 relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or fill manually
                </span>
              </div>
            </div>
            
            <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="5000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input placeholder="Net 30, Net 60, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Consulting services, software licenses, etc."
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
                {isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
