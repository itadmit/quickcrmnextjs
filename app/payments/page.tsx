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
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const handlePaymentCreated = () => {
    fetchPayments()
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

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Filter className="w-5 h-5 text-gray-600" />
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

        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="חיפוש לפי מספר עסקה, פרויקט, הצעה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    תאריך
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    מספר עסקה
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    פרויקט/הצעה
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    סכום
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    שיטת תשלום
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    סטטוס
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">אין תשלומים להצגה</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => {
                    const statusInfo = statusConfig[payment.status]
                    const StatusIcon = statusInfo.icon
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString(
                            "he-IL"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 break-words">
                            {payment.transactionId || payment.paymentReference || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="break-words">
                            {payment.project ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {payment.project.name}
                                </div>
                                <div className="text-xs text-gray-500">פרויקט</div>
                              </div>
                            ) : payment.quote ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {payment.quote.quoteNumber}
                                </div>
                                <div className="text-xs text-gray-500 break-words">
                                  {payment.quote.title}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900">
                            ₪{payment.amount.toLocaleString("he-IL", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {methodConfig[payment.method] || payment.method}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={`${statusInfo.color} text-white`}
                          >
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}

