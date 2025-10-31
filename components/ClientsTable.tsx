"use client";

import DataTable from "@/components/DataTable";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  projectsCount: number;
}

interface ClientsTableProps {
  clients: Client[];
}

export default function ClientsTable({ clients }: ClientsTableProps) {
  const router = useRouter();

  const columns = [
    {
      header: "שם",
      accessor: "name",
      type: "link" as const,
      linkPrefix: "/clients/",
    },
    {
      header: "אימייל",
      accessor: "email",
    },
    {
      header: "טלפון",
      accessor: "phone",
    },
    {
      header: "כתובת",
      accessor: "address",
    },
    {
      header: "פרויקטים",
      accessor: "projectsCount",
      type: "badge" as const,
    },
    {
      header: "תאריך יצירה",
      accessor: "createdAt",
      type: "date" as const,
    },
  ];

  const handleView = (id: string) => {
    console.log("View client:", id);
    router.push(`/clients/${id}`);
  };

  const handleEdit = (id: string) => {
    console.log("Edit client:", id);
    // TODO: Open edit dialog when implemented
  };

  const handleDelete = async (id: string) => {
    try {
      // TODO: Implement delete API call
      console.log("Delete client:", id);
      router.refresh();
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  return (
    <DataTable
      data={clients}
      columns={columns}
      emptyMessage="אין לקוחות עדיין. לחצו על 'לקוח חדש' כדי להתחיל"
      emptyIcon={<Users className="w-16 h-16 text-[#6961e0]" />}
      actionsType="client"
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}

