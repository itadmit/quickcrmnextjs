import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/AppLayout";
import LeadsTable from "@/components/LeadsTable";
import NewLeadDialog from "@/components/dialogs/NewLeadDialog";

export default async function LeadsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;
  const companyId = user.companyId;

  const leads = await prisma.lead.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppLayout user={user}>
      <>
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-[#323338] mb-2">לידים</h1>
            <p className="text-[#676879] text-sm">ניהול ומעקב אחר כל הלידים שלכם</p>
          </div>
          <NewLeadDialog companyId={companyId} />
        </div>

        <LeadsTable leads={leads} />
      </>
    </AppLayout>
  );
}

