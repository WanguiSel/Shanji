import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface DataSyncContextType {
  refreshAll: () => void;
}

const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [, tick] = useState(0);

  const refreshAll = () => {
    queryClient.invalidateQueries();
    tick((t) => t + 1);
  };

  useEffect(() => {
    const channel = supabase.channel('global-changes').on('postgres_changes', { event: '*', schema: 'public' }, () => {
      refreshAll();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <DataSyncContext.Provider value={{ refreshAll }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync() {
  const ctx = useContext(DataSyncContext);
  if (!ctx) throw new Error('useDataSync must be used within DataSyncProvider');
  return ctx;
}
