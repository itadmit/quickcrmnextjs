"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Zap, Mail, UserPlus, Calendar, FileText, MoreVertical, Play, Pause, Edit, Trash2, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewAutomationDialog } from "@/components/dialogs/NewAutomationDialog"
import { EditAutomationDialog } from "@/components/dialogs/EditAutomationDialog"

interface Automation {
  id: string
  name: string
  description: string | null
  trigger: any
  conditions: any
  actions: any
  isActive: boolean
  createdAt: string
  createdBy: string
  updatedAt: string
}

export default function AutomationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)

  useEffect(() => {
    fetchAutomations()
  }, [])

  const fetchAutomations = async () => {
    try {
      const response = await fetch('/api/automations')
      if (response.ok) {
        const data = await response.json()
        setAutomations(data)
      }
    } catch (error) {
      console.error('Error fetching automations:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את האוטומציות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleAutomation = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setAutomations(prev =>
          prev.map(auto =>
            auto.id === id ? { ...auto, isActive: !currentStatus } : auto
          )
        )
        toast({
          title: currentStatus ? "אוטומציה הושהתה" : "אוטומציה הופעלה",
          description: currentStatus ? "האוטומציה הושהתה ולא תרוץ" : "האוטומציה הופעלה ותרוץ אוטומטית",
        })
      }
    } catch (error) {
      console.error('Error toggling automation:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לשנות את סטטוס האוטומציה",
        variant: "destructive",
      })
    }
  }

  const deleteAutomation = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק אוטומציה זו?')) {
      return
    }

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAutomations(prev => prev.filter(auto => auto.id !== id))
        toast({
          title: "אוטומציה נמחקה",
          description: "האוטומציה נמחקה בהצלחה",
        })
      }
    } catch (error) {
      console.error('Error deleting automation:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את האוטומציה",
        variant: "destructive",
      })
    }
  }

  const runAutomation = async (id: string, name: string) => {
    try {
      toast({
        title: "מריץ אוטומציה...",
        description: `מריץ את האוטומציה "${name}"`,
      })

      const response = await fetch(`/api/automations/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "אוטומציה הורצה בהצלחה",
          description: `האוטומציה "${name}" הורצה בהצלחה`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.details || "לא ניתן להריץ את האוטומציה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error running automation:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן להריץ את האוטומציה",
        variant: "destructive",
      })
    }
  }

  const getTriggerIcon = (trigger: any) => {
    if (!trigger) return Zap
    const triggerStr = typeof trigger === 'object' ? trigger.type || '' : String(trigger)
    const lowerTrigger = triggerStr.toLowerCase()
    if (lowerTrigger.includes('lead')) return UserPlus
    if (lowerTrigger.includes('task')) return FileText
    if (lowerTrigger.includes('meeting')) return Calendar
    return Zap
  }

  const getTriggerLabel = (trigger: any) => {
    const triggerStr = typeof trigger === 'object' ? trigger.type || trigger.event || 'לא ידוע' : String(trigger)
    const triggers: Record<string, string> = {
      'lead_created': 'ליד חדש נוצר',
      'lead_status_changed': 'סטטוס ליד השתנה',
      'task_created': 'משימה חדשה נוצרה',
      'task_completed': 'משימה הושלמה',
      'meeting_scheduled': 'פגישה נקבעה',
      'client_created': 'לקוח חדש נוצר',
    }
    return triggers[triggerStr] || triggerStr
  }

  const getActionLabel = (actions: any) => {
    if (!actions) return 'לא מוגדר'
    const actionStr = typeof actions === 'object' ? actions.type || actions[0]?.type || 'פעולה' : String(actions)
    const actionLabels: Record<string, string> = {
      'send_email': 'שלח אימייל',
      'create_task': 'צור משימה',
      'send_notification': 'שלח התראה',
      'update_field': 'עדכן שדה',
      'add_tag': 'הוסף תגית',
    }
    return actionLabels[actionStr] || actionStr
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">טוען אוטומציות...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">אוטומציות</h1>
            <p className="text-gray-500 mt-1">
              נהל תהליכים אוטומטיים וחסוך זמן יקר
            </p>
          </div>
          <Button
            onClick={() => setShowNewDialog(true)}
            className="prodify-gradient text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            אוטומציה חדשה
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">סה"כ אוטומציות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">פעילות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {automations.filter(a => a.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">מושהות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {automations.filter(a => !a.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">נוצרו לאחרונה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {automations.filter(a => {
                const createdDate = new Date(a.createdAt)
                const daysDiff = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                return daysDiff <= 30
              }).length}
            </div>
            <div className="text-xs text-gray-500 mt-1">ב-30 יום האחרונים</div>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      {automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Zap className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">אין אוטומציות עדיין</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              צור אוטומציות כדי לחסוך זמן ולהפוך תהליכים חוזרים לאוטומטיים
            </p>
            <Button
              onClick={() => setShowNewDialog(true)}
              className="prodify-gradient text-white"
            >
              <Plus className="w-4 h-4 ml-2" />
              צור אוטומציה ראשונה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {automations.map(automation => {
            const TriggerIcon = getTriggerIcon(automation.trigger)
            return (
              <Card key={automation.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${automation.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <TriggerIcon className={`w-5 h-5 ${automation.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg mb-1">{automation.name}</CardTitle>
                        {automation.description && (
                          <CardDescription className="text-sm">
                            {automation.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={automation.isActive ? "default" : "secondary"} className={automation.isActive ? "bg-green-500" : ""}>
                        {automation.isActive ? "פעיל" : "מושהה"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => runAutomation(automation.id, automation.name)}
                            disabled={!automation.isActive}
                          >
                            <Zap className="w-4 h-4 ml-2" />
                            הרץ עכשיו
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleAutomation(automation.id, automation.isActive)}>
                            {automation.isActive ? (
                              <>
                                <Pause className="w-4 h-4 ml-2" />
                                השהה
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 ml-2" />
                                הפעל
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedAutomation(automation)
                            setShowEditDialog(true)
                          }}>
                            <Edit className="w-4 h-4 ml-2" />
                            ערוך
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteAutomation(automation.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Trigger & Action */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">טריגר</div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <TriggerIcon className="w-4 h-4 text-purple-600" />
                          {getTriggerLabel(automation.trigger)}
                        </div>
                      </div>
                      <div className="text-gray-400">←</div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">פעולה</div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Mail className="w-4 h-4 text-blue-600" />
                          {getActionLabel(automation.actions)}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            נוצר {new Date(automation.createdAt).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <NewAutomationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onAutomationCreated={fetchAutomations}
      />

      {selectedAutomation && (
        <EditAutomationDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          automation={selectedAutomation}
          onSuccess={fetchAutomations}
        />
      )}
    </AppLayout>
  )
}

