import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { EvidenceRecord } from '../types';

export function useEvidence(projectId: string, taskId?: string) {
  return useQuery({
    queryKey: ['evidence', projectId, taskId],
    queryFn: async () => {
      let query = supabase.from('evidence_records').select('*').eq('project_id', projectId);
      if (taskId) query = query.eq('task_id', taskId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EvidenceRecord[];
    },
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evidence: Omit<EvidenceRecord, 'id' | 'created_at' | 'updated_at' | 'verified_at'>) => {
      const { data, error } = await supabase.from('evidence_records').insert(evidence).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', data.project_id] });
      if (data.task_id) {
        queryClient.invalidateQueries({ queryKey: ['evidence', data.project_id, data.task_id] });
      }
    },
  });
}

export function useVerifyEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evidenceId, status, comment, verifiedBy }: { evidenceId: string; status: string; comment?: string; verifiedBy: string }) => {
      const { data, error } = await supabase
        .from('evidence_records')
        .update({ verification_status: status, verified_by: verifiedBy, verified_at: new Date().toISOString(), verification_comment: comment || null })
        .eq('id', evidenceId)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', data.project_id] });
      if (data.task_id) {
        queryClient.invalidateQueries({ queryKey: ['evidence', data.project_id, data.task_id] });
      }
    },
  });
}