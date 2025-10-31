import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/AppLayout";
import { FolderKanban, Plus } from "lucide-react";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;
  const companyId = user.companyId;

  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      client: true,
      tasks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppLayout user={user}>
      <>
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-[#323338] mb-2">פרויקטים</h1>
            <p className="text-[#676879] text-sm">ניהול ומעקב אחר כל הפרויקטים שלכם</p>
          </div>
          <button className="prodify-button-primary gap-2 inline-flex items-center">
            <Plus className="w-5 h-5" />
            פרויקט חדש
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-[#e8e9f0]">
              <div className="text-center py-20">
                <FolderKanban className="w-20 h-20 text-[#f6cea5] mx-auto mb-6 opacity-40" />
                <p className="text-[#676879] font-medium text-lg">אין פרויקטים עדיין. לחצו על &apos;פרויקט חדש&apos; כדי להתחיל</p>
              </div>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="widget-card group cursor-pointer prodify-card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#323338] group-hover:text-[#6961e0] transition-colors">{project.name}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-gradient-to-r from-[#f7f9fe] to-white rounded-2xl border border-[#e8e9f0]">
                  <svg className="w-4 h-4 text-[#6961e0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-[#323338]">{project.client.name}</span>
                </div>
                {project.description && (
                  <p className="text-sm text-[#676879] mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#676879]">התקדמות</span>
                    <span className="text-xs font-bold text-[#4dd2c9]">{project.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-gradient-to-r from-[#f7f9fe] to-[#fafbff] rounded-full overflow-hidden border border-[#e8e9f0]">
                    <div 
                      className="h-full bg-gradient-to-r from-[#5be3c9] to-[#6a73bd] rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-[#e8e9f0]">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f3f0ff] text-[#6961e0] rounded-full text-xs font-semibold">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {project.tasks.length} משימות
                  </div>
                  {project.budget && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#676879]">תקציב:</span>
                      <span className="text-sm font-bold text-[#323338]">₪{project.budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PLANNING: "bg-[#f7f9fe] text-[#676879]",
    ACTIVE: "bg-[#4dd2c9] text-white",
    ON_HOLD: "bg-[#f6cea5] text-[#8b4513]",
    DONE: "bg-[#f3f0ff] text-[#6961e0]",
  };

  const labels: Record<string, string> = {
    PLANNING: "תכנון",
    ACTIVE: "פעיל",
    ON_HOLD: "מושהה",
    DONE: "הושלם",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

