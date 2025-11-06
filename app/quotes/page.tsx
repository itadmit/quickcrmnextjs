"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  Settings,
  Copy,
  BookOpen,
  CheckSquare,
  Square,
  MoreVertical,
} from "lucide-react"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { NewQuoteDialog } from "@/components/dialogs/NewQuoteDialog"
import { EditQuoteDialog } from "@/components/dialogs/EditQuoteDialog"
import { PDFLoadingDialog } from "@/components/dialogs/PDFLoadingDialog"
import { QuotePreviewDialog } from "@/components/dialogs/QuotePreviewDialog"
import { QuoteSettingsDialog } from "@/components/dialogs/QuoteSettingsDialog"
import { TableSkeleton } from "@/components/skeletons"

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface Lead {
  id: string
  name: string
  email?: string | null
  phone?: string | null
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description?: string | null
  templateType?: string
  status: string
  total: number
  validUntil?: Date | null
  createdAt: Date
  lead?: Lead | null
  items: QuoteItem[]
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  DRAFT: { label: "טיוטה", color: "bg-gray-500", icon: FileText },
  SENT: { label: "נשלח", color: "bg-blue-500", icon: Send },
  VIEWED: { label: "נצפה", color: "bg-purple-500", icon: Eye },
  ACCEPTED: { label: "אושר", color: "bg-green-500", icon: CheckCircle },
  REJECTED: { label: "נדחה", color: "bg-red-500", icon: XCircle },
  EXPIRED: { label: "פג תוקף", color: "bg-orange-500", icon: Clock },
}

export default function QuotesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [newQuoteOpen, setNewQuoteOpen] = useState(false)
  const [editQuoteOpen, setEditQuoteOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [pdfLoadingOpen, setPdfLoadingOpen] = useState(false)
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null)
  const [previewQuoteNumber, setPreviewQuoteNumber] = useState<string>("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchQuotes()
    }
  }, [status, router])

  useEffect(() => {
    // איפוס הבחירה כשמשנים את הפילטר או החיפוש
    setSelectedQuotes(new Set())
  }, [filterStatus, searchTerm])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const url =
        filterStatus !== "all"
          ? `/api/quotes?status=${filterStatus}`
          : "/api/quotes"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setQuotes(data)
      }
    } catch (error) {
      console.error("Error fetching quotes:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הצעות המחיר",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק הצעת מחיר זו?")) {
      return
    }

    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: "הצעת המחיר נמחקה בהצלחה",
        })
        fetchQuotes()
      } else {
        throw new Error("Failed to delete quote")
      }
    } catch (error) {
      console.error("Error deleting quote:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו למחוק את הצעת המחיר",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedQuotes.size === 0) {
      toast({
        title: "אין בחירה",
        description: "אנא בחר הצעות מחיר למחיקה",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedQuotes.size} הצעות מחיר?`)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedQuotes).map((id) =>
        fetch(`/api/quotes/${id}`, {
          method: "DELETE",
        })
      )

      const results = await Promise.all(deletePromises)
      const failed = results.filter((r) => !r.ok).length

      if (failed === 0) {
        toast({
          title: "הצלחה",
          description: `${selectedQuotes.size} הצעות מחיר נמחקו בהצלחה`,
        })
        setSelectedQuotes(new Set())
        fetchQuotes()
      } else {
        throw new Error(`${failed} הצעות מחיר לא נמחקו`)
      }
    } catch (error) {
      console.error("Error deleting quotes:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו למחוק את כל הצעות המחיר",
        variant: "destructive",
      })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotes(new Set(filteredQuotes.map((q) => q.id)))
    } else {
      setSelectedQuotes(new Set())
    }
  }

  const handleSelectQuote = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedQuotes)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedQuotes(newSelected)
  }

  const handlePreviewPDF = (id: string, quoteNumber: string) => {
    setPreviewQuoteId(id)
    setPreviewQuoteNumber(quoteNumber)
    setPreviewOpen(true)
  }

  const handleDownloadPDF = async (id: string, quoteNumber: string) => {
    try {
      // פתיחת modal הטעינה
      setPdfLoadingOpen(true)

      const res = await fetch(`/api/quotes/${id}/pdf`)
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `quote-${quoteNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        // סגירת modal אחרי שההורדה הסתיימה
        setTimeout(() => {
          setPdfLoadingOpen(false)
          toast({
            title: "הצלחה",
            description: "ה-PDF הורד בהצלחה",
          })
        }, 500)
      } else {
        throw new Error("Failed to download PDF")
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      setPdfLoadingOpen(false)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להוריד את ה-PDF",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote)
    setEditQuoteOpen(true)
  }

  const handleDuplicate = async (quote: Quote) => {
    try {
      // טעינת הצעה מלאה עם כל הפריטים
      const res = await fetch(`/api/quotes/${quote.id}`)
      if (res.ok) {
        const fullQuote = await res.json()
        // יצירת העתק של ההצעה ללא ID ומספר חדש
        const duplicatedQuote: Quote = {
          ...fullQuote,
          id: "", // יוסר בעריכה
          quoteNumber: "", // יוחלף במספר חדש
          status: "DRAFT",
          leadId: fullQuote.leadId || null,
          createdAt: new Date(),
        }
        setSelectedQuote(duplicatedQuote)
        setEditQuoteOpen(true)
      } else {
        throw new Error("Failed to fetch quote")
      }
    } catch (error) {
      console.error("Error duplicating quote:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לשכפל את הצעת המחיר",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: "הסטטוס עודכן בהצלחה",
        })
        fetchQuotes()
      } else {
        throw new Error("Failed to update status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את הסטטוס",
        variant: "destructive",
      })
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <TableSkeleton />
      </AppLayout>
    )
  }

  const stats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "DRAFT").length,
    sent: quotes.filter((q) => q.status === "SENT" || q.status === "VIEWED")
      .length,
    accepted: quotes.filter((q) => q.status === "ACCEPTED").length,
    totalValue: quotes
      .filter((q) => q.status === "ACCEPTED")
      .reduce((sum, q) => sum + q.total, 0),
  }

  const filteredQuotes = quotes.filter((quote) => {
    // סינון לפי סטטוס
    if (filterStatus !== "all" && quote.status !== filterStatus) {
      return false
    }
    
    // סינון לפי חיפוש
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        quote.quoteNumber.toLowerCase().includes(term) ||
        quote.title.toLowerCase().includes(term) ||
        quote.lead?.name?.toLowerCase().includes(term) ||
        quote.lead?.email?.toLowerCase().includes(term) ||
        quote.lead?.phone?.toLowerCase().includes(term) ||
        quote.total.toString().includes(term)
      )
    }
    
    return true
  })

  const isAllSelected = filteredQuotes.length > 0 && selectedQuotes.size === filteredQuotes.length
  const isIndeterminate = selectedQuotes.size > 0 && selectedQuotes.size < filteredQuotes.length

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            הצעות מחיר
          </h1>
          <p className="text-gray-600">נהל את כל הצעות המחיר שלך במקום אחד</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            הגדרות
          </Button>
          <Button
            onClick={() => setNewQuoteOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            הצעת מחיר חדשה
          </Button>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                סה״כ הצעות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                טיוטות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                נשלחו
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                אושרו
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                ערך מאושר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₪{stats.totalValue.toLocaleString()}
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
                  placeholder="חיפוש לפי מספר הצעה, כותרת, לקוח, סכום..."
                  className="pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל ההצעות</SelectItem>
                  <SelectItem value="DRAFT">טיוטות</SelectItem>
                  <SelectItem value="SENT">נשלחו</SelectItem>
                  <SelectItem value="VIEWED">נצפו</SelectItem>
                  <SelectItem value="ACCEPTED">אושרו</SelectItem>
                  <SelectItem value="REJECTED">נדחו</SelectItem>
                  <SelectItem value="EXPIRED">פג תוקף</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                סינון
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selection Actions */}
        {selectedQuotes.size > 0 && (
          <div className="flex items-center justify-end gap-2 mb-6">
            <span className="text-sm text-gray-600">
              נבחרו {selectedQuotes.size} הצעות
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              מחק נבחרים
            </Button>
          </div>
        )}

        {/* Quotes Table */}
        <Card>
          <CardContent className="pt-6">
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filterStatus !== "all" ? "לא נמצאו הצעות מחיר" : "אין הצעות מחיר להצגה"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filterStatus !== "all"
                    ? "נסה לחפש במונח אחר או שנה את הפילטר"
                    : "התחל על ידי יצירת הצעת מחיר חדשה"}
                </p>
                {!searchTerm && filterStatus === "all" && (
                  <Button
                    onClick={() => setNewQuoteOpen(true)}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    צור הצעת מחיר ראשונה
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 font-medium text-gray-700 w-12">
                        <button
                          onClick={() => handleSelectAll(!isAllSelected)}
                          className="flex items-center justify-center"
                          title={isAllSelected ? "בטל בחירה" : "בחר הכל"}
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-5 h-5 text-purple-600" />
                          ) : isIndeterminate ? (
                            <div className="w-5 h-5 border-2 border-purple-600 rounded bg-purple-600/20" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700 w-32">מספר הצעה</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">כותרת</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">לקוח</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">סכום</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">סטטוס</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">תאריך יצירה</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map((quote) => {
                      const statusInfo = statusConfig[quote.status]
                      const StatusIcon = statusInfo.icon
                      const isSelected = selectedQuotes.has(quote.id)
                      return (
                        <tr 
                          key={quote.id} 
                          className={`border-b hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-purple-50' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectQuote(quote.id, !isSelected)
                              }}
                              className="flex items-center justify-center"
                              title={isSelected ? "בטל בחירה" : "בחר"}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-purple-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 w-32">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="font-normal text-gray-900 truncate">
                                {quote.quoteNumber}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-normal text-gray-900">
                              {quote.title}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {quote.lead ? (
                              <div>
                                <div className="font-normal text-gray-900">
                                  {quote.lead.name}
                                </div>
                                {quote.lead.email && (
                                  <div className="text-sm text-gray-600 font-light">
                                    {quote.lead.email}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">
                              ₪{quote.total.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={quote.status}
                              onValueChange={(value) =>
                                handleStatusChange(quote.id, value)
                              }
                            >
                              <SelectTrigger 
                                className="w-auto h-auto py-1 px-2 border-0 bg-transparent shadow-none hover:bg-transparent focus:ring-0 inline-flex items-center gap-1.5 [&>svg]:ml-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Badge
                                  className={`${statusInfo.color} text-white px-3 py-1.5 flex items-center gap-1.5 min-w-fit`}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {statusInfo.label}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {Object.entries(statusConfig).map(
                                  ([key, config]) => (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center justify-end gap-2 w-full">
                                        <span className="text-right">{config.label}</span>
                                        <config.icon className="w-3 h-3 flex-shrink-0" />
                                      </div>
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-normal">
                            {new Date(quote.createdAt).toLocaleDateString(
                              "he-IL"
                            )}
                          </td>
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
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePreviewPDF(quote.id, quote.quoteNumber)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4 flex-shrink-0" />
                                  <span>תצוגה מקדימה</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadPDF(quote.id, quote.quoteNumber)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4 flex-shrink-0" />
                                  <span>הורד PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDuplicate(quote)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Copy className="w-4 h-4 flex-shrink-0" />
                                  <span>שכפל</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(quote)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4 flex-shrink-0" />
                                  <span>ערוך</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600 flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(quote.id)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                                  <span>מחק</span>
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

        {/* Dialogs */}
        <NewQuoteDialog
          open={newQuoteOpen}
          onOpenChange={setNewQuoteOpen}
          onSuccess={fetchQuotes}
        />

      {selectedQuote && (
        <EditQuoteDialog
          open={editQuoteOpen}
          onOpenChange={setEditQuoteOpen}
          quote={selectedQuote}
          onSuccess={fetchQuotes}
          isDuplicate={!selectedQuote.id || selectedQuote.quoteNumber === ""}
        />
      )}

        <PDFLoadingDialog
          open={pdfLoadingOpen}
          onOpenChange={setPdfLoadingOpen}
        />

        {previewQuoteId && (
          <QuotePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            quoteId={previewQuoteId}
            quoteNumber={previewQuoteNumber}
          />
        )}

        <QuoteSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </AppLayout>
  )
}

