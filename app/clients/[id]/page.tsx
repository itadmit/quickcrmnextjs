import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import NewProjectDialog from "@/components/dialogs/NewProjectDialog";
import { FolderKanban, Mail, Phone, MapPin, Calendar } from "lucide-react";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;
  const companyId = user.companyId;
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id, companyId },
    include: {
      projects: {
        include: {
          tasks: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    redirect("/clients");
  }

  return (
    <div className="min-h-screen">
      <Header user={user} />

      <main className="container mx-auto px-6 py-10">
        {/* Client Header */}
        <div className="mb-10 animate-fade-in">
          <div className="card-soft p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-neutral-900 mb-2">{client.name}</h1>
                <div className="flex flex-wrap gap-4 mt-4">
                  {client.email && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-50 border border-neutral-200">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-600">
                  הצטרף {new Date(client.createdAt).toLocaleDateString("he-IL")}
                </span>
              </div>
            </div>

            {client.notes && (
              <div className="pt-6 border-t border-neutral-200/50">
                <p className="text-neutral-700 leading-relaxed">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-neutral-900">פרויקטים ({client.projects.length})</h2>
            <NewProjectDialog companyId={companyId} clientId={client.id} />
          </div>

          {client.projects.length === 0 ? (
            <div className="card-soft card-hover">
              <div className="text-center py-16">
                <FolderKanban className="w-20 h-20 text-primary-300 mx-auto mb-4" />
                <p className="text-neutral-500 font-medium mb-4">אין פרויקטים ללקוח זה</p>
                <NewProjectDialog 
                  companyId={companyId} 
                  clientId={client.id}
                  trigger={
                    <button className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl font-semibold bg-gradient-primary text-white shadow-soft hover:shadow-medium hover:opacity-90 transition-all">
                      <FolderKanban className="w-4 h-4" />
                      צור פרויקט ראשון
                    </button>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {client.projects.map((project) => (
                <div
                  key={project.id}
                  className="relative card-soft card-hover p-6 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-info-50/0 group-hover:from-primary-50/40 group-hover:to-info-50/20 transition-all duration-500 rounded-3xl" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">
                        {project.name}
                      </h3>
                      <StatusBadge status={project.status} />
                    </div>

                    {project.description && (
                      <p className="text-sm text-neutral-600 mb-4 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-neutral-600">התקדמות</span>
                        <span className="text-xs font-bold text-success-600">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-success rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-200/50">
                      <div className="badge-soft bg-info-100 text-info-600 border border-info-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {project.tasks.length} משימות
                      </div>
                      {project.budget && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-neutral-500">תקציב:</span>
                          <span className="text-sm font-bold text-neutral-900">₪{project.budget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {(project.startDate || project.endDate) && (
                      <div className="mt-3 pt-3 border-t border-neutral-200/50 flex items-center justify-between text-xs text-neutral-500">
                        {project.startDate && (
                          <span>התחלה: {new Date(project.startDate).toLocaleDateString("he-IL")}</span>
                        )}
                        {project.endDate && (
                          <span>סיום: {new Date(project.endDate).toLocaleDateString("he-IL")}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PLANNING: "bg-neutral-100 text-neutral-600 border border-neutral-200",
    ACTIVE: "bg-success-100 text-success-600 border border-success-200",
    ON_HOLD: "bg-warning-100 text-warning-600 border border-warning-200",
    DONE: "bg-info-100 text-info-600 border border-info-200",
  };

  const labels: Record<string, string> = {
    PLANNING: "תכנון",
    ACTIVE: "פעיל",
    ON_HOLD: "מושהה",
    DONE: "הושלם",
  };

  return (
    <span className={`badge-soft ${colors[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

