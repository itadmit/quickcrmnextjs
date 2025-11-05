"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Upload, MoreVertical, Eye, Edit, Trash, UserPlus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { NewLeadDialog } from "@/components/dialogs/NewLeadDialog"
import { EditLeadDialog } from "@/components/dialogs/EditLeadDialog"
import { TableSkeleton } from "@/components/skeletons/TableSkeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string
  owner: { name: string } | null
  stage: { name: string; order: number } | null
  createdAt: string
}

export default function LeadsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table")
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads')
      if (response.ok) {
        const data = await response.json()
        setLeads(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את הלידים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הלידים",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm)
  )

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הליד "${leadName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "ליד נמחק",
          description: `הליד ${leadName} נמחק בהצלחה`,
        })
        fetchLeads()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את הליד",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הליד",
        variant: "destructive",
      })
    }
  }

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-800",
    CONTACTED: "bg-yellow-100 text-yellow-800",
    QUALIFIED: "bg-purple-100 text-purple-800",
    PROPOSAL: "bg-orange-100 text-orange-800",
    WON: "bg-green-100 text-green-800",
    LOST: "bg-red-100 text-red-800",
  }

  const statusLabels: Record<string, string> = {
    NEW: "חדש",
    CONTACTED: "יצירת קשר",
    QUALIFIED: "מתאים",
    PROPOSAL: "הצעה",
    WON: "נסגר",
    LOST: "אבד",
  }

  // Group leads by status for pipeline view
  const leadsPerStatus = Object.keys(statusLabels).reduce((acc, status) => {
    acc[status] = filteredLeads.filter(lead => lead.status === status)
    return acc
  }, {} as Record<string, Lead[]>)

  const newLeads = leads.filter(l => l.status === 'NEW').length
  const qualifiedLeads = leads.filter(l => l.status === 'QUALIFIED').length

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
            <h1 className="text-3xl font-bold text-gray-900">לידים</h1>
            <p className="text-gray-500 mt-1">נהל את כל הלידים שלך במקום אחד</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="w-4 h-4 ml-2" />
              ייבוא CSV
            </Button>
            <NewLeadDialog onLeadCreated={fetchLeads} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה״כ לידים</CardTitle>
              <UserPlus className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">לידים חדשים</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">לידים מתאימים</CardTitle>
              <UserPlus className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{qualifiedLeads}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
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
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={viewMode === "table" ? "prodify-gradient text-white" : ""}
                >
                  טבלה
                </Button>
                <Button
                  variant={viewMode === "pipeline" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("pipeline")}
                  className={viewMode === "pipeline" ? "prodify-gradient text-white" : ""}
                >
                  צינור
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table View */}
        {viewMode === "table" && (
          <Card>
            <CardContent className="pt-6">
            {filteredLeads.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "לא נמצאו לידים" : "אין לידים עדיין"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "נסה לחפש במונח אחר"
                      : "התחל על ידי יצירת ליד חדש או הוספה דרך ה-Webhook"}
                  </p>
                  {!searchTerm && <NewLeadDialog onLeadCreated={fetchLeads} />}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-3 px-4 font-medium text-gray-700">שם</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">אימייל</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">טלפון</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">מקור</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">סטטוס</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">אחראי</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="font-medium">{lead.name}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{lead.email || "-"}</td>
                          <td className="py-3 px-4 text-gray-600">{lead.phone || "-"}</td>
                          <td className="py-3 px-4 text-gray-600">{lead.source || "-"}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                              {statusLabels[lead.status]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{lead.owner?.name || "-"}</td>
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
                                  router.push(`/leads/${lead.id}`)
                                }} className="flex-row-reverse">
                                  <Eye className="w-4 h-4 ml-2 flex-shrink-0" />
                                  צפה בפרטים
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingLead(lead)
                                }} className="flex-row-reverse">
                                  <Edit className="w-4 h-4 ml-2 flex-shrink-0" />
                                  ערוך
                                </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 flex-row-reverse"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteLead(lead.id, lead.name)
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
        )}

        {/* Pipeline View */}
        {viewMode === "pipeline" && (
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {Object.keys(statusLabels).map((status) => (
                <Card key={status} className="w-80 flex-shrink-0">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${statusColors[status].split(' ')[0].replace('bg-', 'bg-')}`}></span>
                        {statusLabels[status]}
                      </span>
                      <span className="text-sm font-normal text-gray-500">
                        {leadsPerStatus[status]?.length || 0}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leadsPerStatus[status]?.map((lead) => (
                        <Card
                          key={lead.id}
                          className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <div className="font-medium text-gray-900 mb-2">{lead.name}</div>
                          <div className="text-sm text-gray-600 mb-1">{lead.email || "-"}</div>
                          <div className="text-sm text-gray-600 mb-2">{lead.phone || "-"}</div>
                          {lead.source && (
                            <div className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">
                              {lead.source}
                            </div>
                          )}
                        </Card>
                      ))}
                      {(!leadsPerStatus[status] || leadsPerStatus[status].length === 0) && (
                        <div className="text-center text-gray-400 text-sm py-8">
                          אין לידים בשלב זה
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Lead Dialog */}
      {editingLead && (
        <EditLeadDialog
          lead={editingLead}
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
          onLeadUpdated={fetchLeads}
        />
      )}
    </AppLayout>
  )
}
