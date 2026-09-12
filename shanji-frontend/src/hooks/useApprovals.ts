import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Approval } from '../types';

export function useApprovals(projectId: string) {
  return useQuery({
    queryKey: ['approvals', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('approvals').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Approval[];
    },
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase.from('approvals').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Approval[];
    },
  });
}

export function useCreateApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (approval: Omit<Approval, 'id' | 'requested_at' | 'created_at'>) => {
      const { data, error } = await supabase.from('approvals').insert(approval).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['approvals', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
    },
  });
}

export function useDecideApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ approvalId, status, comments, approverId }: { approvalId: string; status: string; comments?: string; approverId: string }) => {
      const { data, error } = await supabase.from('approvals').update({
        status,
        comments: comments || null,
        decided_at: new Date().toISOString(),
        approver_id: approverId,
      }).eq('id', approvalId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['approvals', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
    },
  });
}