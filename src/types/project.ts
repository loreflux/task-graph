// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  /** Hex colour code used in the UI (e.g. "#6366f1"). */
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type CreateProjectInput = Pick<Project, 'name'> &
  Partial<Pick<Project, 'description' | 'color'>>;

export type UpdateProjectInput = Partial<
  Pick<Project, 'name' | 'description' | 'color'>
>;
