import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SiteReport } from '../types';

export function useSiteReports(projectId: string) {
  return useQuery({
    queryKey: ['site-reports', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_reports').select('*').eq('project_id', projectId).order('report_date', { ascending: false });
      if (error) throw error;
      return (data || []) as SiteReport[];
    },
  });
}

export function useCreateSiteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: Omit<SiteReport, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('site_reports').insert(report).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['site-reports', data.project_id] });
    },
  });
}