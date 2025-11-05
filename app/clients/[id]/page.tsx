"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TaskKitDialog } from "@/components/dialogs/TaskKitDialog"
import { Invoice4UDialog } from "@/components/dialogs/Invoice4UDialog"
import { useToast } from "@/components/ui/use-toast"
import { 
  ArrowRight, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building,
  Edit,
  Trash,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Paperclip,
  MessageSquare,
  FolderKanban,
  Coins,
  TrendingUp,
  FileText
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  notes: string | null
  signature: string | null
  owner: { name: string } | null
  projects: Array<{
    id: string
    name: string
    status: string
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate: string | null
    }>
    payments: Array<{
      id: string
      amount: number
      status: string
      method: string
      transactionId: string | null
      paymentReference: string | null
      description: string | null
      paidAt: string | null
      createdAt: string
      quote: {
        id: string
        quoteNumber: string
        title: string
        total: number
      } | null
    }>
  }>
  directPayments?: Array<{
    id: string
    amount: number
    status: string
    method: string
    transactionId: string | null
    paymentReference: string | null
    description: string | null
    paidAt: string | null
    createdAt: string
    project: {
      id: string | null
      name: string
    }
    quote: {
      id: string
      quoteNumber: string
      title: string
    } | null
  }>
  budgets: Array<{
    id: string
    name: string
    amount: number
    status: string
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    project: { name: string } | null
  }>
  files?: Array<{
    id: string
    name: string
    path: string
    size: number
    mimeType: string | null
    createdAt: string
    entityType: string
    entityId: string
  }>
  createdAt: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "tasks" | "payments" | "files" | "timeline">("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchClient()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("entityType", "client")
        formData.append("entityId", params.id as string)
        formData.append("clientId", params.id as string)

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to upload file")
        }
      }

      toast({
        title: "הקובץ הועלה בהצלחה",
        description: "הקובץ נוסף לקבצים",
      })

      // רענון נתוני הלקוח
      await fetchClient()
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "שגיאה בהעלאת קובץ",
        description: "לא הצלחנו להעלות את הקובץ",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      // איפוס ה-input
      e.target.value = ""
    }
  }

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setClient(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את פרטי הלקוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching client:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת פרטי הלקוח",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTasksCreated = (tasks: string[]) => {
    toast({
      title: "המשימות נוצרו בהצלחה!",
      description: `${tasks.length} משימות חדשות נוספו לפרויקט`,
    })
    // Refresh client data
    fetchClient()
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען פרטי לקוח...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">לקוח לא נמצא</h3>
          <Link href="/clients">
            <Button variant="outline">חזרה ללקוחות</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const projects = client.projects.map(project => ({
    ...project,
    progress: project.tasks.length > 0 
      ? Math.round((project.tasks.filter(t => t.status === 'DONE').length / project.tasks.length) * 100)
      : 0,
    tasksCount: project.tasks.length,
    completedTasks: project.tasks.filter(t => t.status === 'DONE').length,
  }))

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">לקוח לא נמצא</h3>
          <Link href="/clients">
            <Button variant="outline">חזרה ללקוחות</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const budgets = client.budgets
  const tasks = client.tasks
  
  // איסוף כל התשלומים מכל הפרויקטים + תשלומים ישירים
  const projectPayments = client.projects.flatMap(project => 
    (project.payments || []).map(payment => ({
      ...payment,
      project: {
        id: project.id,
        name: project.name,
      },
    }))
  )
  
  const directPayments = (client.directPayments || []).map(payment => ({
    ...payment,
    project: payment.project || { id: null, name: "תשלום ישיר" },
  }))
  
  const allPayments = [...projectPayments, ...directPayments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  const completedPayments = allPayments.filter(p => p.status === "COMPLETED")
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  
  // חישוב יתרה לכל הצעה
  // קיבוץ תשלומים לפי הצעה
  const paymentsByQuote = new Map<string, { quote: any, payments: typeof allPayments }>()
  
  allPayments.forEach(payment => {
    if (payment.quote) {
      const quoteId = payment.quote.id
      if (!paymentsByQuote.has(quoteId)) {
        paymentsByQuote.set(quoteId, {
          quote: payment.quote,
          payments: []
        })
      }
      paymentsByQuote.get(quoteId)!.payments.push(payment)
    }
  })
  
  // חישוב יתרה לכל הצעה
  const quoteBalances = Array.from(paymentsByQuote.values()).map(({ quote, payments }) => {
    const quoteTotal = quote.total || 0
    const paidForQuote = payments
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0)
    const balance = quoteTotal - paidForQuote
    
    return {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      quoteTotal,
      paidForQuote,
      balance
    }
  })
  
  // חישוב יתרה כוללת (רק עבור הצעות שיש להן תשלומים)
  // אם יש כמה הצעות, נחשב את היתרה רק עבור הצעות שיש להן תשלומים
  const totalQuoteAmount = quoteBalances.length > 0 
    ? quoteBalances.reduce((sum, q) => sum + q.quoteTotal, 0)
    : 0
  const totalPaidForQuotes = quoteBalances.length > 0
    ? quoteBalances.reduce((sum, q) => sum + q.paidForQuote, 0)
    : totalPaid
  const totalBalance = totalQuoteAmount > 0 ? totalQuoteAmount - totalPaidForQuotes : 0
  
  // יצירת ציר זמן מתאריכים אמיתיים
  const timeline = [
    ...(client.createdAt ? [{
      id: 'client-created',
      type: 'created' as const,
      title: 'לקוח נוצר',
      description: 'הלקוח נוסף למערכת',
      date: new Date(client.createdAt).toLocaleDateString('he-IL'),
      user: 'מערכת'
    }] : []),
    ...allPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      type: 'payment' as const,
      title: `תשלום ${payment.status === 'COMPLETED' ? 'הושלם' : payment.status === 'PENDING' ? 'ממתין' : payment.status}`,
      description: payment.description || `תשלום בסך ₪${payment.amount.toLocaleString('he-IL')}${payment.quote ? ` עבור הצעה ${payment.quote.quoteNumber}` : ''}`,
      date: new Date(payment.createdAt).toLocaleDateString('he-IL'),
      user: 'מערכת',
      payment: payment,
    })),
  ].sort((a, b) => {
    const dateA = a.type === 'created' ? new Date(client.createdAt || 0) : new Date(a.payment?.createdAt || 0)
    const dateB = b.type === 'created' ? new Date(client.createdAt || 0) : new Date(b.payment?.createdAt || 0)
    return dateB.getTime() - dateA.getTime()
  })

  const statusColors: Record<string, string> = {
    PLANNING: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const statusLabels: Record<string, string> = {
    PLANNING: "תכנון",
    IN_PROGRESS: "בביצוע",
    ON_HOLD: "בהמתנה",
    COMPLETED: "הושלם",
    CANCELLED: "בוטל",
  }

  const taskStatusColors: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
  }

  const budgetStatusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-green-100 text-green-800",
    OVERDUE: "bg-red-100 text-red-800",
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/clients" className="hover:text-gray-700">לקוחות</Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-gray-900">{client.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {client.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Invoice4UDialog clientId={client.id} clientName={client.name} />
            <Button variant="outline">
              <Send className="w-4 h-4 ml-2" />
              שלח מייל
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="w-4 h-4 ml-2" />
              ערוך
            </Button>
            <Link href={`/projects/new?clientId=${client.id}`}>
              <Button className="prodify-gradient text-white">
                <Plus className="w-4 h-4 ml-2" />
                פרויקט חדש
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">פרויקטים פעילים</div>
                  <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
                </div>
                <FolderKanban className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">משימות פתוחות</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {tasks.filter(t => t.status !== "DONE").length}
                  </div>
                </div>
                <CheckCircle2 className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">תשלומים</div>
                  <div className="text-2xl font-bold text-green-600">
                    ₪{totalPaid.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {completedPayments.length} תשלומים הושלמו
                  </div>
                </div>
                <Coins className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">התקדמות ממוצעת</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)}%
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {[
              { key: "overview", label: "סקירה" },
              { key: "projects", label: "פרויקטים" },
              { key: "tasks", label: "משימות" },
              { key: "payments", label: "תשלומים" },
              { key: "files", label: "קבצים" },
              { key: "timeline", label: "ציר זמן" },
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
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>פרטי לקוח</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>שם החברה</Label>
                        <Input value={client.name || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div>
                        <Label>אימייל</Label>
                        <Input value={client.email || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div>
                        <Label>טלפון</Label>
                        <Input value={client.phone || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div className="col-span-2">
                        <Label>כתובת</Label>
                        <Input value={client.address || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div className="col-span-2">
                        <Label>הערות</Label>
                        <textarea 
                          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={client.notes || ""}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Button>שמור שינויים</Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>ביטול</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>סיכום פרויקטים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {projects.slice(0, 2).map((project) => (
                        <div key={project.id} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{project.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                              {statusLabels[project.status]}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">התקדמות</span>
                              <span className="font-medium">{project.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all" 
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>{project.completedTasks}/{project.tasks} משימות</span>
                              <span>{(project.budget / 1000).toFixed(0)}K ₪</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>פרויקטים ({projects.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "פרויקט נוצר!",
                            description: "פרויקט חדש נוצר בהצלחה. עכשיו תוכל להוסיף משימות",
                          })
                          setActiveTab("tasks")
                        }}
                      >
                        + פרויקט מהיר
                      </Button>
                      <Button size="sm" className="prodify-gradient text-white">
                        + פרויקט מלא
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div key={project.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-gray-900">{project.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                            {statusLabels[project.status]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">תאריך התחלה:</span>
                            <span className="mr-2 font-medium">{project.startDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">תאריך סיום:</span>
                            <span className="mr-2 font-medium">{project.endDate}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">התקדמות</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{project.completedTasks}/{project.tasks} משימות הושלמו</span>
                            <span className="font-medium text-green-600">{(project.budget / 1000).toFixed(0)}K ₪</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks Tab - Kanban Style */}
            {activeTab === "tasks" && (
              <>
                <div className="mb-4 flex justify-end">
                  <TaskKitDialog 
                    clientId={client.id} 
                    onTasksCreated={handleTasksCreated}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {["TODO", "IN_PROGRESS", "DONE"].map((status) => (
                    <Card key={status} className="shadow-sm bg-gray-50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {status === "TODO" && "לביצוע"}
                            {status === "IN_PROGRESS" && "בתהליך"}
                            {status === "DONE" && "הושלם"}
                          </CardTitle>
                          <span className="text-sm text-gray-500">
                            {tasks.filter(t => t.status === status).length}
                          </span>
                        </div>
                      </CardHeader>
                    <CardContent className="space-y-3">
                      {tasks
                        .filter(t => t.status === status)
                        .map((task) => (
                          <Card key={task.id} className="shadow-sm bg-white">
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm text-gray-900 mb-2">{task.title}</h4>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div>פרויקט: {task.project}</div>
                                <div>אחראי: {task.assignee}</div>
                                <div>יעד: {task.dueDate}</div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </CardContent>
                  </Card>
                ))}
                </div>
              </>
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <>
                {/* סיכום תשלומים */}
                {quoteBalances.length > 0 && (
                  <Card className="shadow-sm mb-6">
                    <CardHeader>
                      <CardTitle>סיכום תשלומים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">סכום כל הפרויקט</div>
                          <div className="text-2xl font-bold text-blue-600">
                            ₪{totalQuoteAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">שולם מקדמה</div>
                          <div className="text-2xl font-bold text-green-600">
                            ₪{totalPaidForQuotes.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">יתרה לתשלום</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {totalBalance > 0 ? (
                              `₪${totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-green-600">שולם במלואו</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>תשלומים ({allPayments.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                  {allPayments.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>אין תשלומים להצגה</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allPayments.map((payment) => {
                        // מציאת היתרה להצעה הזו (אם יש)
                        const quoteBalance = payment.quote 
                          ? quoteBalances.find(b => b.quoteId === payment.quote.id)
                          : null
                        
                        return (
                        <div key={payment.id} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {payment.description || `תשלום #${payment.transactionId || payment.id.slice(-6)}`}
                              </h4>
                              <div className="text-sm text-gray-600 mt-1">
                                {payment.project.name}
                                {payment.quote && ` • הצעה ${payment.quote.quoteNumber}`}
                              </div>
                              {quoteBalance && (
                                <div className="text-xs text-gray-500 mt-1">
                                  סכום הצעה: ₪{quoteBalance.quoteTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })} • 
                                  שולם: ₪{quoteBalance.paidForQuote.toLocaleString('he-IL', { minimumFractionDigits: 2 })} • 
                                  {quoteBalance.balance > 0 ? (
                                    <span className="text-orange-600 font-semibold">
                                      יתרה: ₪{quoteBalance.balance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-green-600 font-semibold">
                                      שולם במלואו
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(payment.createdAt).toLocaleDateString('he-IL', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {payment.paidAt && (
                                  <span> • שולם ב-{new Date(payment.paidAt).toLocaleDateString('he-IL')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-lg font-bold text-green-600">
                                ₪{payment.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                payment.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {payment.status === 'COMPLETED' ? 'הושלם' :
                                 payment.status === 'PENDING' ? 'ממתין' :
                                 payment.status === 'PROCESSING' ? 'מעבד' :
                                 payment.status}
                              </span>
                              {payment.paymentReference && (
                                <span className="text-xs text-gray-500">
                                  אישור: {payment.paymentReference}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              </>
            )}

            {/* Files Tab */}
            {activeTab === "files" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>קבצים ({client?.files?.length || 0})</CardTitle>
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        multiple
                      />
                      <Button size="sm" className="prodify-gradient text-white" disabled={uploading}>
                        <Paperclip className="w-4 h-4 ml-2" />
                        {uploading ? "מעלה..." : "העלה קובץ"}
                      </Button>
                    </label>
                  </div>
                </CardHeader>
                <CardContent>
                  {!client?.files || client.files.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>אין קבצים מצורפים</p>
                      <p className="text-sm mt-1">גרור קבצים לכאן או לחץ להעלאה</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {client.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3 flex-1">
                            <Paperclip className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{file.name}</h4>
                              <div className="text-xs text-gray-500 mt-1">
                                {(file.size / 1024).toFixed(2)} KB • {new Date(file.createdAt).toLocaleDateString('he-IL')}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/files/${file.id}/download`, {
                                  credentials: 'include',
                                })
                                if (res.ok) {
                                  const blob = await res.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement("a")
                                  a.href = url
                                  a.download = file.name
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  window.URL.revokeObjectURL(url)
                                } else {
                                  const error = await res.json()
                                  console.error("Error downloading file:", error)
                                  alert("שגיאה בהורדת הקובץ: " + (error.error || "שגיאה לא ידועה"))
                                }
                              } catch (error) {
                                console.error("Error downloading file:", error)
                                alert("שגיאה בהורדת הקובץ")
                              }
                            }}
                          >
                            הורד
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline Tab */}
            {activeTab === "timeline" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>ציר זמן</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timeline.map((event) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            {event.type === "created" && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                            {event.type === "project" && <FolderKanban className="w-4 h-4 text-purple-600" />}
                            {event.type === "note" && <MessageSquare className="w-4 h-4 text-purple-600" />}
                            {event.type === "budget" && <Coins className="w-4 h-4 text-purple-600" />}
                            {event.type === "payment" && <Coins className="w-4 h-4 text-green-600" />}
                          </div>
                          {event.id !== timeline[timeline.length - 1].id && (
                            <div className="w-0.5 h-12 bg-gray-200"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{event.description}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            {event.date} • {event.user}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>פעולות מהירות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Send className="w-4 h-4 ml-2" />
                  שלח מייל
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Phone className="w-4 h-4 ml-2" />
                  התקשר
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 ml-2" />
                  קבע פגישה
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 ml-2" />
                  צור משימה
                </Button>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>מידע נוסף</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">בעלים</span>
                  <span className="font-medium">{client.owner?.name || 'לא משויך'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">סטטוס</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">פעיל</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">תאריך יצירה</span>
                </div>
              </CardContent>
            </Card>

            {/* Signature */}
            {client.signature && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>חתימה דיגיטלית</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                    <img 
                      src={client.signature} 
                      alt="חתימת הלקוח" 
                      className="max-w-full h-auto"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    חתימה זו נשמרה בעת אישור הצעת המחיר
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}


