import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

interface RecordFilters {
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useFinancialRecords(filters: RecordFilters = {}) {
  return useQuery({
    queryKey: ["financial_records", filters],
    queryFn: async () => {
      let query = supabase
        .from("financial_records")
        .select("*", { count: "exact" })
        .eq("is_deleted", false)
        .order("date", { ascending: false });

      if (filters.type) query = query.eq("type", filters.type);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
      if (filters.dateTo) query = query.lte("date", filters.dateTo);
      if (filters.search) query = query.ilike("description", `%${filters.search}%`);

      const page = filters.page ?? 0;
      const pageSize = filters.pageSize ?? 20;
      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard_summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("amount, type, category, date")
        .eq("is_deleted", false);

      if (error) throw error;

      const records = data ?? [];
      const totalIncome = records.filter(r => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
      const totalExpenses = records.filter(r => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
      const netBalance = totalIncome - totalExpenses;

      const categoryTotals: Record<string, { income: number; expense: number }> = {};
      records.forEach(r => {
        if (!categoryTotals[r.category]) categoryTotals[r.category] = { income: 0, expense: 0 };
        categoryTotals[r.category][r.type as "income" | "expense"] += Number(r.amount);
      });

      const monthlyTrends: Record<string, { income: number; expense: number }> = {};
      records.forEach(r => {
        const month = r.date.substring(0, 7);
        if (!monthlyTrends[month]) monthlyTrends[month] = { income: 0, expense: 0 };
        monthlyTrends[month][r.type as "income" | "expense"] += Number(r.amount);
      });

      const recentRecords = records
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

      return { totalIncome, totalExpenses, netBalance, categoryTotals, monthlyTrends, recentRecords };
    },
  });
}

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<TablesInsert<"financial_records">, "user_id"> & { user_id: string }) => {
      const { error } = await supabase.from("financial_records").insert(record);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_records"] });
      qc.invalidateQueries({ queryKey: ["dashboard_summary"] });
    },
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"financial_records"> & { id: string }) => {
      const { error } = await supabase.from("financial_records").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_records"] });
      qc.invalidateQueries({ queryKey: ["dashboard_summary"] });
    },
  });
}

export function useSoftDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_records").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_records"] });
      qc.invalidateQueries({ queryKey: ["dashboard_summary"] });
    },
  });
}
