import { AppShell } from '@/components/layout/app-shell';
import { getProjects } from '@/server/queries/project-queries';
import { ProjectListView } from '@/components/project/project-list-view';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <AppShell title="项目列表" count={projects.length}>
      <ProjectListView initialProjects={projects} />
    </AppShell>
  );
}
