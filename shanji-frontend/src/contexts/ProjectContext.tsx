import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, ProjectMember } from '../types';

interface ProjectContextType {
  currentProject: Project | null;
  projectMembers: ProjectMember[];
  setCurrentProject: (project: Project | null) => void;
  loadProjectMembers: (projectId: string) => Promise<void>;
  refreshProjectMembers: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const loadProjectMembers = useCallback(async (projectId: string) => {
    const { data } = await supabase.from('project_members').select('*').eq('project_id', projectId);
    if (data) setProjectMembers(data as ProjectMember[]);
  }, []);

  const refreshProjectMembers = useCallback(async (projectId: string) => {
    const { data } = await supabase.from('project_members').select('*').eq('project_id', projectId);
    if (data) setProjectMembers(data as ProjectMember[]);
  }, []);

  return (
    <ProjectContext.Provider value={{ currentProject, projectMembers, setCurrentProject, loadProjectMembers, refreshProjectMembers }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}