import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useFinancialRecords,
  useCreateRecord,
  useUpdateRecord,
  useSoftDeleteRecord,
} from "@/hooks/useFinancialRecords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";

const CATEGORIES = ["Salary", "Freelance", "Investment", "Food", "Transport", "Housing", "Utilities", "Entertainment", "Healthcare", "Other"];

function RecordForm({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: any;
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    amount: initial?.amount?.toString() ?? "",
    type: initial?.type ?? "expense",
    category: initial?.category ?? "Other",
    description: initial?.description ?? "",
    date: initial?.date ?? new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ ...form, amount });
      toast.success(initial ? "Record updated" : "Record created");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          maxLength={500}
          placeholder="Optional description..."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}

export default function Records() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [filters, setFilters] = useState({ type: "", category: "", search: "", page: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useFinancialRecords({
    type: filters.type || undefined,
    category: filters.category || undefined,
    search: filters.search || undefined,
    page: filters.page,
    pageSize: 15,
  });

  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();
  const softDelete = useSoftDeleteRecord();

  const totalPages = Math.ceil((data?.count ?? 0) / 15);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const exportCsv = async () => {
    const { data: all, error } = await supabase
      .from("financial_records")
      .select("*")
      .eq("is_deleted", false)
      .order("date", { ascending: false });
    if (error) { toast.error("Export failed"); return; }
    if (!all?.length) { toast.error("No records to export"); return; }
    const header = "Date,Type,Category,Amount,Description\n";
    const rows = all.map(r =>
      `${r.date},${r.type},${r.category},${r.amount},"${(r.description ?? "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "financial_records.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Financial Records</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditingRecord(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Record</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRecord ? "Edit Record" : "New Record"}</DialogTitle>
              </DialogHeader>
              <RecordForm
                initial={editingRecord}
                onSubmit={async data => {
                  if (editingRecord) {
                    await updateRecord.mutateAsync({ id: editingRecord.id, ...data });
                  } else {
                    await createRecord.mutateAsync({ ...data, user_id: user!.id });
                  }
                }}
                onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
              />
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                className="pl-9"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 0 }))}
              />
            </div>
            <Select value={filters.type} onValueChange={v => setFilters(f => ({ ...f, type: v === "all" ? "" : v, page: 0 }))}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={v => setFilters(f => ({ ...f, category: v === "all" ? "" : v, page: 0 }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">{record.date}</TableCell>
                      <TableCell>
                        <Badge variant={record.type === "income" ? "default" : "destructive"} className={record.type === "income" ? "bg-income text-income-foreground" : ""}>
                          {record.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{record.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {record.description || "—"}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${record.type === "income" ? "text-income" : "text-expense"}`}>
                        {fmt(Number(record.amount))}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingRecord(record); setDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Soft delete this record?")) {
                                  softDelete.mutate(record.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{data?.count} total records</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page === 0}
                      onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {filters.page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= totalPages - 1}
                      onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
