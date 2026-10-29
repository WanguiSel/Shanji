import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Expense, Budget, Payment } from '../types';

export function useExpenses(projectId: string) {
  return useQuery({
    queryKey: ['expenses', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('expenses').insert(expense).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', data.project_id] });
    },
  });
}

export function useBudgets(projectId: string) {
  return useQuery({
    queryKey: ['budgets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*').eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as Budget[];
    },
  });
}

export function usePayments(projectId: string) {
  return useQuery({
    queryKey: ['payments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Payment[];
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('payments').insert(payment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments', data.project_id] });
    },
  });
}