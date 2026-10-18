import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Risk } from '../types';

export function useRisks(projectId: string) {
  return useQuery({
    queryKey: ['risks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('risks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Risk[];
    },
  });
}

export function useCreateRisk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (risk: Omit<Risk, 'id' | 'risk_score' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('risks').insert(risk).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risks', data.project_id] });
    },
  });
}