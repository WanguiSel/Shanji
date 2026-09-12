import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { WorkplanItem, TaskAssignment } from '../types';

export function useWorkplanItems(workplanId: string) {
  return useQuery({
    queryKey: ['workplan-items', workplanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplan_items')
        .select('*')
        .eq('workplan_id', workplanId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as WorkplanItem[];
    },
    enabled: !!workplanId,
  });
}

export function useTaskById(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from('workplan_items').select('*').eq('id', taskId).single();
      if (error) throw error;
      return data as WorkplanItem;
    },
    enabled: !!taskId,
  });
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<WorkplanItem>) => {
      const { data, error } = await supabase.from('workplan_items').update(updates).eq('id', taskId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      if ((variables as any).workplan_id) {
        queryClient.invalidateQueries({ queryKey: ['workplan-items', (variables as any).workplan_id] });
      }
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: Omit<TaskAssignment, 'id' | 'assigned_at'>) => {
      const { data, error } = await supabase.from('task_assignments').insert(assignment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
    },
  });
}

export function useTaskAssignments(taskId: string) {
  return useQuery({
    queryKey: ['task-assignments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_assignments').select('*').eq('task_id', taskId);
      if (error) throw error;
      return (data || []) as TaskAssignment[];
    },
    enabled: !!taskId,
  });
}