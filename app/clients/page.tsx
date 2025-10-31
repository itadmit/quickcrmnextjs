import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/AppLayout";
import ClientsTable from "@/components/ClientsTable";
import NewClientDialog from "@/components/dialogs/NewClientDialog";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;
  const companyId = user.companyId;

  const clients = await prisma.client.findMany({
    where: { companyId },
    include: {
      projects: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Transform data to include projects count
  const clientsData = clients.map((client) => ({
    ...client,
    projectsCount: client.projects.length,
  }));

  return (
    <AppLayout user={user}>
      <>
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-[#323338] mb-2">לקוחות</h1>
            <p className="text-[#676879] text-sm">ניהול לקוחות ומעקב אחר פרויקטים</p>
          </div>
          <NewClientDialog companyId={companyId} />
        </div>

        <ClientsTable clients={clientsData} />
      </>
    </AppLayout>
  );
}

