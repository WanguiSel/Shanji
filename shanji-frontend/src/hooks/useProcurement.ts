import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProcurementRequest } from '../types';

export function useProcurement(projectId: string) {
  return useQuery({
    queryKey: ['procurement', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('procurement_requests').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProcurementRequest[];
    },
  });
}

export function useCreateProcurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: Omit<ProcurementRequest, 'id' | 'created_at' | 'updated_at' | 'delay_days'>) => {
      const { data, error } = await supabase.from('procurement_requests').insert(req).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement', data.project_id] });
    },
  });
}