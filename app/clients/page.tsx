"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Upload, MoreVertical, Eye, Edit, Trash, Building } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { NewClientDialog } from "@/components/dialogs/NewClientDialog"
import { EditClientDialog } from "@/components/dialogs/EditClientDialog"
import { TableSkeleton } from "@/components/skeletons/TableSkeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  owner: { name: string } | null
  projects: Array<{ id: string; name: string; status: string }>
  _count: { projects: number; budgets: number }
  createdAt: string
}

export default function ClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את הלקוחות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הלקוחות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  )

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הלקוח "${clientName}"? פעולה זו תמחק גם את כל הפרויקטים והמשימות הקשורים.`)) {
      return
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "לקוח נמחק",
          description: `הלקוח ${clientName} נמחק בהצלחה`,
        })
        fetchClients()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את הלקוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הלקוח",
        variant: "destructive",
      })
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-800",
    PENDING: "bg-yellow-100 text-yellow-800",
  }

  const statusLabels: Record<string, string> = {
    ACTIVE: "פעיל",
    INACTIVE: "לא פעיל",
    PENDING: "בהמתנה",
  }

  const activeClients = clients.filter(c => c.status === 'ACTIVE').length
  const totalProjects = clients.reduce((sum, c) => sum + c._count.projects, 0)

  if (loading) {
    return (
      <AppLayout>
        <TableSkeleton rows={5} columns={7} />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">לקוחות</h1>
            <p className="text-gray-500 mt-1">נהל את כל הלקוחות שלך במקום אחד</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="w-4 h-4 ml-2" />
              ייבוא CSV
            </Button>
            <NewClientDialog onClientCreated={fetchClients} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה״כ לקוחות</CardTitle>
              <Building className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">לקוחות פעילים</CardTitle>
              <Building className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeClients}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה״כ פרויקטים</CardTitle>
              <Building className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חיפוש לפי שם, אימייל או טלפון..."
                  className="pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                סינון
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardContent className="pt-6">
            {filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "לא נמצאו לקוחות" : "אין לקוחות עדיין"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm
                    ? "נסה לחפש במונח אחר"
                    : "התחל על ידי יצירת לקוח חדש או המרת ליד ללקוח"}
                </p>
                {!searchTerm && <NewClientDialog onClientCreated={fetchClients} />}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-medium text-gray-700">שם הלקוח</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">אימייל</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">טלפון</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">סטטוס</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">פרויקטים</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">אחראי</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Building className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="font-medium">{client.name}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{client.email || "-"}</td>
                        <td className="py-3 px-4 text-gray-600">{client.phone || "-"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[client.status]}`}>
                            {statusLabels[client.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{client._count.projects}</td>
                        <td className="py-3 px-4 text-gray-600">{client.owner?.name || "-"}</td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" dir="rtl">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/clients/${client.id}`)
                              }} className="flex-row-reverse">
                                <Eye className="w-4 h-4 ml-2 flex-shrink-0" />
                                צפה בפרטים
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                setEditingClient(client)
                              }} className="flex-row-reverse">
                                <Edit className="w-4 h-4 ml-2 flex-shrink-0" />
                                ערוך
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 flex-row-reverse"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClient(client.id, client.name)
                                }}
                              >
                                <Trash className="w-4 h-4 ml-2 flex-shrink-0" />
                                מחק
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Client Dialog */}
      {editingClient && (
        <EditClientDialog
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
          onClientUpdated={fetchClients}
        />
      )}
    </AppLayout>
  )
}
