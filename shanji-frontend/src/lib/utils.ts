import type { Project, WorkplanItem } from '../types';

export function calculateProgress(items: WorkplanItem[]) {
  if (!items.length) return 0;
  const total = items.length;
  const completed = items.filter((i) => i.status === 'completed' || i.status === 'approved').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const verified = items.filter((i) => i.status === 'verified').length;
  return Math.round(((completed + inProgress * 0.5 + verified * 0.75) / total) * 100);
}

export function getTaskTransitionMatrix(status: string): string[] {
  const transitions: Record<string, string[]> = {
    not_started: ['planned', 'in_progress'],
    planned: ['in_progress', 'blocked', 'not_started'],
    in_progress: ['submitted_for_verification', 'blocked', 'needs_correction'],
    blocked: ['in_progress', 'needs_correction'],
    submitted_for_verification: ['verified', 'needs_correction'],
    needs_correction: ['in_progress', 'submitted_for_verification'],
    verified: ['approved', 'needs_correction'],
    approved: ['completed'],
    completed: [],
  };
  return transitions[status] || [];
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}