"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  MoreVertical,
  Edit,
} from "lucide-react"
import { AppLayout } from "@/components/AppLayout"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { TableSkeleton } from "@/components/skeletons"
import { NewPaymentDialog } from "@/components/dialogs/NewPaymentDialog"
import { EditPaymentDialog } from "@/components/dialogs/EditPaymentDialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  method: string
  transactionId?: string | null
  paymentReference?: string | null
  description?: string | null
  paidAt?: Date | null
  createdAt: Date
  project?: {
    id: string
    name: string
  } | null
  quote?: {
    id: string
    quoteNumber: string
    title: string
    total?: number
  } | null
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  PENDING: { label: "ממתין", color: "bg-yellow-500", icon: Clock },
  PROCESSING: { label: "מעבד", color: "bg-blue-500", icon: Clock },
  COMPLETED: { label: "הושלם", color: "bg-green-500", icon: CheckCircle },
  FAILED: { label: "נכשל", color: "bg-red-500", icon: XCircle },
  REFUNDED: { label: "הוחזר", color: "bg-gray-500", icon: AlertCircle },
}

const methodConfig: Record<string, string> = {
  CREDIT_CARD: "כרטיס אשראי",
  BANK_TRANSFER: "העברה בנקאית",
  CASH: "מזומן",
  CHECK: "המחאה",
  OTHER: "אחר",
}

export default function PaymentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  const handlePaymentCreated = () => {
    fetchPayments()
  }

  const handleDeletePayment = async (paymentId: string) => {
    // אישור לפני מחיקה
    if (!confirm('האם אתה בטוח שברצונך למחוק את התשלום הזה?')) {
      return
    }

    try {
      setDeletingId(paymentId)
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: "התשלום נמחק בהצלחה",
        })
        fetchPayments()
      } else {
        const error = await res.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן למחוק את התשלום",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התשלום",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchPayments()
    } else if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router, filterStatus])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const url =
        filterStatus !== "all"
          ? `/api/payments?status=${filterStatus}`
          : "/api/payments"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <TableSkeleton />
      </AppLayout>
    )
  }

  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      payment.transactionId?.toLowerCase().includes(query) ||
      payment.paymentReference?.toLowerCase().includes(query) ||
      payment.project?.name.toLowerCase().includes(query) ||
      payment.quote?.quoteNumber.toLowerCase().includes(query) ||
      payment.description?.toLowerCase().includes(query)
    )
  })

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === "COMPLETED").length,
    pending: payments.filter((p) => p.status === "PENDING").length,
    totalAmount: payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0),
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">תשלומים</h1>
          <p className="text-gray-600">נהל את כל התשלומים של הפרויקטים שלך</p>
        </div>
        <NewPaymentDialog onPaymentCreated={handlePaymentCreated} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              סה״כ תשלומים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              הושלמו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              ממתינים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              סכום כולל
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₪{stats.totalAmount.toLocaleString("he-IL", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי מספר עסקה, פרויקט, הצעה..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התשלומים</SelectItem>
                <SelectItem value="PENDING">ממתינים</SelectItem>
                <SelectItem value="PROCESSING">מעבדים</SelectItem>
                <SelectItem value="COMPLETED">הושלמו</SelectItem>
                <SelectItem value="FAILED">נכשלו</SelectItem>
                <SelectItem value="REFUNDED">הוחזרו</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 ml-2" />
              סינון
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "לא נמצאו תשלומים" : "אין תשלומים עדיין"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "נסה לחפש במונח אחר"
                  : "התחל על ידי יצירת תשלום חדש"}
              </p>
              {!searchQuery && <NewPaymentDialog onPaymentCreated={handlePaymentCreated} />}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium text-gray-700">תאריך</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 w-64">מספר עסקה</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">פרויקט/הצעה</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">סכום</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">שיטת תשלום</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">סטטוס</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const statusInfo = statusConfig[payment.status]
                    const StatusIcon = statusInfo.icon
                    
                    // חישוב יתרה אם יש הצעה - נשתמש בכל התשלומים (לא רק מסוננים)
                    let quoteBalance: { quoteTotal: number; paidForQuote: number; balance: number } | null = null
                    if (payment.quote?.total) {
                      // מציאת כל התשלומים של ההצעה הזו מכל התשלומים (לא רק מסוננים)
                      const quotePayments = payments.filter(
                        p => p.quote?.id === payment.quote?.id && p.status === "COMPLETED"
                      )
                      const paidForQuote = quotePayments.reduce((sum, p) => sum + p.amount, 0)
                      const balance = payment.quote.total - paidForQuote
                      quoteBalance = {
                        quoteTotal: payment.quote.total,
                        paidForQuote,
                        balance
                      }
                    }
                    
                    return (
                      <tr
                        key={payment.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <span className="font-normal text-gray-900">
                            {new Date(payment.createdAt).toLocaleDateString("he-IL")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-normal text-gray-900">
                            {payment.transactionId || payment.paymentReference || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {payment.project ? (
                            <div>
                              <div className="font-normal text-gray-900">
                                {payment.project.name}
                              </div>
                              <div className="text-sm text-gray-600 font-light">פרויקט</div>
                            </div>
                          ) : payment.quote ? (
                            <div>
                              <div className="font-normal text-gray-900">
                                {payment.quote.quoteNumber}
                              </div>
                              <div className="text-sm text-gray-600 font-light">
                                {payment.quote.title}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">
                            ₪{payment.amount.toLocaleString("he-IL", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-normal text-gray-900">
                            {methodConfig[payment.method] || payment.method}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`${statusInfo.color} text-white px-3 py-1.5 flex items-center gap-1.5 min-w-fit`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === payment.id}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" dir="rtl">
                              <DropdownMenuItem
                                onClick={() => setEditingPayment(payment)}
                                className="flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4 flex-shrink-0" />
                                <span>ערוך</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeletePayment(payment.id)}
                                className="text-red-600 flex items-center gap-2"
                                disabled={deletingId === payment.id}
                              >
                                <Trash2 className="w-4 h-4 flex-shrink-0" />
                                <span>{deletingId === payment.id ? "מוחק..." : "מחק"}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      {editingPayment && (
        <EditPaymentDialog
          payment={editingPayment}
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
          onPaymentUpdated={fetchPayments}
        />
      )}
    </AppLayout>
  )
}

