"use client";

import { useRouter } from "next/navigation";
import { Eye, Edit, Trash2, UserPlus } from "lucide-react";

interface Column {
  header: string;
  accessor: string;
  type?: "badge" | "link" | "date" | "text" | "status";
  linkPrefix?: string;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  actionsType?: "client" | "lead";
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConvertToClient?: (id: string) => void;
}

export default function DataTable({
  data,
  columns,
  emptyMessage = "אין נתונים להצגה",
  emptyIcon,
  actionsType,
  onView,
  onEdit,
  onDelete,
  onConvertToClient,
}: DataTableProps) {
  const router = useRouter();

  const formatValue = (value: any, column: Column) => {
    if (value === null || value === undefined) return "-";
    
    if (column.type === "date" && value instanceof Date) {
      return new Date(value).toLocaleDateString("he-IL");
    }
    
    if (column.type === "badge") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      );
    }
    
    if (column.type === "status") {
      const statusColors: Record<string, string> = {
        NEW: "bg-yellow-100 text-yellow-800",
        IN_PROGRESS: "bg-blue-100 text-blue-800",
        WON: "bg-green-100 text-green-800",
        LOST: "bg-red-100 text-red-800",
      };
      const statusLabels: Record<string, string> = {
        NEW: "חדש",
        IN_PROGRESS: "בתהליך",
        WON: "נרכש",
        LOST: "אבד",
      };
      const color = statusColors[value] || "bg-gray-100 text-gray-800";
      const label = statusLabels[value] || value;
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
          {label}
        </span>
      );
    }
    
    return value.toString();
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12">
        <div className="text-center">
          {emptyIcon && <div className="flex justify-center mb-4">{emptyIcon}</div>}
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const hasLinkColumn = columns.some((col) => col.type === "link");
  const linkColumn = columns.find((col) => col.type === "link");

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.accessor}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
              {actionsType && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  hasLinkColumn
                    ? "hover:bg-gray-50 cursor-pointer"
                    : "hover:bg-gray-50"
                }
                onClick={
                  linkColumn && linkColumn.linkPrefix
                    ? () => router.push(`${linkColumn.linkPrefix}${row.id}`)
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td
                    key={column.accessor}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {formatValue(row[column.accessor], column)}
                  </td>
                ))}
                {actionsType && (
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      {onView && (
                        <button
                          onClick={() => onView(row.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="צפייה"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row.id)}
                          className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                          title="עריכה"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onConvertToClient && actionsType === "lead" && (
                        <button
                          onClick={() => onConvertToClient(row.id)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="המר ללקוח"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="מחיקה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
