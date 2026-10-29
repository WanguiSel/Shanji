import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Comment } from '../types';

export function useComments(projectId: string, relatedObjectType?: string, relatedObjectId?: string) {
  return useQuery({
    queryKey: ['comments', projectId, relatedObjectType, relatedObjectId],
    queryFn: async () => {
      let query = supabase.from('comments').select('*').eq('project_id', projectId);
      if (relatedObjectType) query = query.eq('related_object_type', relatedObjectType);
      if (relatedObjectId) query = query.eq('related_object_id', relatedObjectId);
      query = query.order('created_at', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Comment[];
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: Omit<Comment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('comments').insert(comment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.project_id] });
    },
  });
}