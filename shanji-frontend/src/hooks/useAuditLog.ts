import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, action, entity, entity_id, previous_value, new_value, metadata }: {
      user_id: string;
      action: string;
      entity: string;
      entity_id?: string;
      previous_value?: Record<string, unknown>;
      new_value?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from('audit_logs').insert({
        user_id,
        action,
        entity,
        entity_id: entity_id || null,
        previous_value: previous_value || null,
        new_value: new_value || null,
        metadata: metadata || {},
      });
      if (error) throw error;
    },
  });
}

export function logAction(
  user_id: string,
  action: string,
  entity: string,
  entity_id?: string,
  previous_value?: Record<string, unknown>,
  new_value?: Record<string, unknown>
) {
  supabase.from('audit_logs').insert({
    user_id,
    action,
    entity,
    entity_id: entity_id || null,
    previous_value: previous_value || null,
    new_value: new_value || null,
  }).then(({ error }) => {
    if (error) console.error('Audit log failed:', error);
  });
}