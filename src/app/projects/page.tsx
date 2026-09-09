import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { getProjects } from '@/server/queries/project-queries';
import { FolderKanban, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <AppShell title="项目列表" count={projects.length}>
      <div className="h-full overflow-y-auto bg-zinc-950 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: p.color || '#3b82f6' }}
                    />
                    <h3 className="font-semibold text-zinc-100 text-sm">
                      {p.name}
                    </h3>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500 opacity-0 transition group-hover:opacity-100" />
                </div>
                {p.description && (
                  <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
                    {p.description}
                  </p>
                )}
              </div>
              <div className="mt-4 border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-500">
                创建于 {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
