"use client";

import DataTable from "@/components/DataTable";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  createdAt: Date;
}

interface LeadsTableProps {
  leads: Lead[];
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();

  const columns = [
    {
      header: "שם",
      accessor: "name",
      type: "text" as const,
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
      header: "סטטוס",
      accessor: "status",
      type: "status" as const,
    },
    {
      header: "מקור",
      accessor: "source",
    },
    {
      header: "תאריך יצירה",
      accessor: "createdAt",
      type: "date" as const,
    },
  ];

  const handleView = (id: string) => {
    console.log("View lead:", id);
    // TODO: Navigate to lead view page when implemented
  };

  const handleEdit = (id: string) => {
    console.log("Edit lead:", id);
    // TODO: Open edit dialog when implemented
  };

  const handleDelete = async (id: string) => {
    try {
      // TODO: Implement delete API call
      console.log("Delete lead:", id);
      router.refresh();
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const handleConvertToClient = async (id: string) => {
    try {
      // TODO: Implement convert to client API call
      console.log("Convert to client:", id);
      router.refresh();
    } catch (error) {
      console.error("Error converting lead to client:", error);
    }
  };

  return (
    <DataTable
      data={leads}
      columns={columns}
      emptyMessage="אין לידים עדיין. לחצו על 'ליד חדש' כדי להתחיל"
      emptyIcon={<Mail className="w-16 h-16 text-[#a8ebea]" />}
      actionsType="lead"
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onConvertToClient={handleConvertToClient}
    />
  );
}

