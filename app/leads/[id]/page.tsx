"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowRight, 
  Mail, 
  Phone, 
  Calendar, 
  Tag,
  UserPlus,
  Edit,
  Trash,
  MoreVertical,
  Send,
  CheckCircle2,
  Clock,
  Paperclip,
  MessageSquare,
  FileText
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Invoice4UDialog } from "@/components/dialogs/Invoice4UDialog"

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string
  notes: string | null
  tags: string[]
  owner: { name: string; email: string } | null
  stage: { id: string; name: string; color: string | null } | null
  createdAt: string
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "budgets" | "files">("overview")

  useEffect(() => {
    fetchLead()
  }, [])

  const fetchLead = async () => {
    try {
      console.log('Fetching lead:', params.id)
      const response = await fetch(`/api/leads/${params.id}`)
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Lead data:', data)
        setLead(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch lead:', response.status, errorData)
        toast({
          title: "שגיאה",
          description: `לא ניתן לטעון את פרטי הליד (${response.status})`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching lead:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת פרטי הליד",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToClient = async () => {
    try {
      const response = await fetch(`/api/leads/${params.id}/convert`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "הליד הומר ללקוח!",
          description: "הליד הומר בהצלחה ללקוח חדש במערכת. עובר לעמוד הלקוח...",
        })
        
        setTimeout(() => {
          router.push(`/clients/${data.client.id}`)
        }, 1500)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן להמיר את הליד ללקוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error converting lead:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהמרת הליד",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען פרטי ליד...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!lead) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <UserPlus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">ליד לא נמצא</h3>
          <Link href="/leads">
            <Button variant="outline">חזרה ללידים</Button>
          </Link>
        </div>
      </AppLayout>
    )
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/leads" className="hover:text-gray-700">לידים</Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-gray-900">{lead.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-3 py-1 rounded-full ${statusColors[lead.status]}`}>
                {statusLabels[lead.status]}
              </span>
              {lead.tags && lead.tags.map((tag, index) => (
                <span key={index} className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Invoice4UDialog 
              clientId={lead.id} 
              clientName={lead.name}
              clientEmail={lead.email || undefined}
            />
            {lead.status !== 'WON' && lead.status !== 'LOST' && (
              <Button 
                className="prodify-gradient text-white"
                onClick={handleConvertToClient}
              >
                <CheckCircle2 className="w-4 h-4 ml-2" />
                המר ללקוח
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="w-4 h-4 ml-2" />
              ערוך
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700">
              <Trash className="w-4 h-4 ml-2" />
              מחק
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {[
              { key: "overview", label: "סקירה" },
              { key: "tasks", label: "משימות" },
              { key: "budgets", label: "תקציבים והצעות" },
              { key: "files", label: "קבצים" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-600 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* Contact Info */}
                <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>פרטי התקשרות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 text-sm">אימייל</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{lead.email || "-"}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">טלפון</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{lead.phone || "-"}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">מקור</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-900">{lead.source || "-"}</span>
                    </div>
                  </div>
                  {lead.stage && (
                    <div>
                      <Label className="text-gray-500 text-sm">שלב בפייפליין</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span 
                          className="text-xs px-3 py-1 rounded-full"
                          style={{ 
                            backgroundColor: lead.stage.color ? `${lead.stage.color}20` : '#e5e7eb',
                            color: lead.stage.color || '#374151'
                          }}
                        >
                          {lead.stage.name}
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500 text-sm">תאריך יצירה</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">
                        {new Date(lead.createdAt).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>הערות</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full min-h-[120px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                      defaultValue={lead.notes || ""}
                      placeholder="הוסף הערות..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="prodify-gradient text-white">שמור</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>ביטול</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {lead.notes || "אין הערות"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>היסטוריה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">ליד נוצר</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        הליד נוצר במערכת
                        {lead.source && ` דרך ${lead.source}`}
                      </p>
                      <span className="text-xs text-gray-500">
                        {lead.owner?.name || "מערכת"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            )}

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>משימות</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-center py-8">
                    אין משימות עדיין. צור משימות בדף המשימות וקשר אותן לליד זה.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Budgets Tab */}
            {activeTab === "budgets" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>תקציבים והצעות מחיר</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-center py-8">
                    אין תקציבים או הצעות מחיר. צור הצעת מחיר חדשה.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Files Tab */}
            {activeTab === "files" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>קבצים ומסמכים</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-center py-8">
                    אין קבצים. העלה קבצים הקשורים לליד זה.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lead Owner */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>אחראי</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-medium">
                      {lead.owner?.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {lead.owner?.name || "לא משוייך"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {lead.owner?.email || "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>פעולות מהירות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Send className="w-4 h-4 ml-2" />
                  שלח אימייל
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Phone className="w-4 h-4 ml-2" />
                  התקשר
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <MessageSquare className="w-4 h-4 ml-2" />
                  הוסף הערה
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Clock className="w-4 h-4 ml-2" />
                  קבע תזכורת
                </Button>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="shadow-sm bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">המר ללקוח</h4>
                    <p className="text-sm text-gray-600">
                      כשתסיים את התהליך עם הליד, תוכל להמיר אותו ללקוח ולהתחיל בפרויקט
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
