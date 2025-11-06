"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus } from "lucide-react"

interface Project {
  id: string
  name: string
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  total?: number
}

interface NewPaymentDialogProps {
  onPaymentCreated?: () => void
  triggerButton?: React.ReactNode
  projectId?: string
  quoteId?: string
  clientId?: string // אם יש clientId, נסתיר את האופציה של פרויקט
}

export function NewPaymentDialog({
  onPaymentCreated,
  triggerButton,
  projectId,
  quoteId,
  clientId,
}: NewPaymentDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [quoteBalance, setQuoteBalance] = useState<number | null>(null)
  const [exceedsBalance, setExceedsBalance] = useState(false)
  const [confirmExceed, setConfirmExceed] = useState(false)
  // ברירת מחדל: PayPlus אם יש הצעה, אחרת תשלום ידני
  const [paymentProvider, setPaymentProvider] = useState<"payplus" | "invoice4u" | "manual">(
    quoteId ? "payplus" : "manual"
  )
  // אם יש clientId, לא נציג את האופציה של פרויקט (כי הוא נגזר מההצעה)
  const [linkType, setLinkType] = useState<"project" | "quote" | "none">(
    projectId && !clientId ? "project" : quoteId ? "quote" : "none"
  )

  const [formData, setFormData] = useState({
    projectId: projectId || "",
    quoteId: quoteId || "",
    amount: "",
    currency: "ILS",
    method: "CREDIT_CARD",
    status: "PENDING",
    transactionId: "",
    paymentReference: "",
    description: "",
    notes: "",
    paidAt: "",
  })

  useEffect(() => {
    if (open) {
      fetchProjects()
      fetchQuotes()
    }
  }, [open])

  useEffect(() => {
    if (projectId) {
      setFormData((prev) => ({ ...prev, projectId }))
      setLinkType("project")
      setPaymentProvider("manual") // תשלום ידני לפרויקט
    }
    if (quoteId) {
      setFormData((prev) => ({ ...prev, quoteId }))
      setLinkType("quote")
      setPaymentProvider("payplus") // ברירת מחדל: PayPlus להצעות
      // טעינת יתרה אם יש quoteId
      if (open) {
        fetchQuoteBalance(quoteId)
      }
    }
  }, [projectId, quoteId, open])

  // בדיקת יתרה כאשר משתנה הסכום או ההצעה
  useEffect(() => {
    if (linkType === "quote" && formData.quoteId && formData.amount) {
      const amount = parseFloat(formData.amount)
      if (quoteBalance !== null && amount > quoteBalance) {
        setExceedsBalance(true)
      } else {
        setExceedsBalance(false)
        setConfirmExceed(false)
      }
    } else {
      setExceedsBalance(false)
      setConfirmExceed(false)
    }
  }, [formData.amount, formData.quoteId, quoteBalance, linkType])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const fetchQuotes = async () => {
    try {
      const response = await fetch("/api/quotes")
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
        // אם יש quoteId, מצא את ההצעה והצג את היתרה
        if (quoteId) {
          const quote = data.find((q: Quote) => q.id === quoteId)
          if (quote) {
            setSelectedQuote(quote)
            fetchQuoteBalance(quote.id)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching quotes:", error)
    }
  }

  const fetchQuoteBalance = async (qId: string) => {
    try {
      // קבלת פרטי ההצעה
      const quoteRes = await fetch(`/api/quotes/${qId}`)
      if (!quoteRes.ok) return
      
      const quote = await quoteRes.json()
      if (!quote || !quote.total) return
      
      // קבלת התשלומים הקיימים עבור ההצעה
      const paymentsRes = await fetch(`/api/payments?quoteId=${qId}`)
      if (paymentsRes.ok) {
        const payments = await paymentsRes.json()
        const paidAmount = payments
          .filter((p: any) => p.status === "COMPLETED")
          .reduce((sum: number, p: any) => sum + p.amount, 0)
        const balance = quote.total - paidAmount
        setQuoteBalance(Math.max(0, balance))
      }
    } catch (error) {
      console.error("Error fetching quote balance:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "שגיאה",
        description: "יש להזין סכום תקין",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // בדיקת יתרה אם יש הצעה
    if (linkType === "quote" && formData.quoteId && quoteBalance !== null) {
      const amount = parseFloat(formData.amount)
      if (amount > quoteBalance && !confirmExceed) {
        toast({
          title: "שגיאה",
          description: "הסכום עולה על היתרה. יש לאשר שאתה יודע שאתה חורג",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
    }

    // אם יש הצעה, יש לוודא שנבחרה מערכת תשלום (לא רק תשלום ידני)
    if (linkType === "quote" && formData.quoteId && paymentProvider === "manual") {
      const confirmed = confirm("תשלום ידני רק יוצר רשומה במערכת ולא מעביר לדף סליקה.\n\nהאם אתה בטוח שברצונך להמשיך?")
      if (!confirmed) {
        setLoading(false)
        return
      }
    }

    try {
      // אם נבחרה מערכת תשלום אוטומטית, נפעיל אותה
      if (paymentProvider === "payplus" && linkType === "quote" && formData.quoteId) {
        const paymentLinkRes = await fetch(`/api/quotes/${formData.quoteId}/generate-payment-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currency: formData.currency,
            amount: parseFloat(formData.amount),
          }),
        })
        
        if (paymentLinkRes.ok) {
          const data = await paymentLinkRes.json()
          if (data.paymentLink) {
            window.location.href = data.paymentLink
            return
          }
        }
      } else if (paymentProvider === "invoice4u" && linkType === "quote" && formData.quoteId) {
        // יצירת תשלום דרך Invoice4U Clearing
        const clearingRes = await fetch(`/api/integrations/invoice4u/clearing/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteId: formData.quoteId,
            amount: formData.amount,
            description: formData.description || `תשלום עבור הצעה ${selectedQuote?.quoteNumber || ''}`,
            paymentType: "regular",
          }),
        })
        
        if (clearingRes.ok) {
          const data = await clearingRes.json()
          if (data.clearingUrl) {
            window.location.href = data.clearingUrl
            return
          }
        }
      }

      // תשלום ידני - יצירת תשלום רגיל
      const payload: any = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        method: formData.method,
        status: formData.status,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      }

      // אם יש clientId, נוסיף אותו ל-payload
      if (clientId) {
        payload.clientId = clientId
      }

      // אם יש clientId, לא נשלח projectId (כי הוא נגזר מההצעה)
      if (!clientId && linkType === "project" && formData.projectId) {
        payload.projectId = formData.projectId
      } else if (linkType === "quote" && formData.quoteId) {
        payload.quoteId = formData.quoteId
      }

      if (formData.transactionId) {
        payload.transactionId = formData.transactionId
      }

      if (formData.paymentReference) {
        payload.paymentReference = formData.paymentReference
      }

      if (formData.paidAt && formData.status === "COMPLETED") {
        payload.paidAt = new Date(formData.paidAt).toISOString()
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "תשלום נוצר בהצלחה!",
          description: `התשלום בסך ₪${formData.amount} נוסף למערכת`,
        })
        setOpen(false)
        setFormData({
          projectId: "",
          quoteId: "",
          amount: "",
          currency: "ILS",
          method: "CREDIT_CARD",
          status: "PENDING",
          transactionId: "",
          paymentReference: "",
          description: "",
          notes: "",
          paidAt: "",
        })
        setLinkType("none")
        onPaymentCreated?.()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן ליצור את התשלום",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת התשלום",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
            <Plus className="w-4 h-4 ml-2" />
            תשלום חדש
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>תשלום חדש</DialogTitle>
            <DialogDescription>
              הוסף תשלום חדש למערכת. מלא את הפרטים הבאים.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* סוג קשר - אם יש clientId, לא נציג את האופציה של פרויקט */}
            {!clientId && (
              <div className="grid gap-2">
                <Label htmlFor="linkType">קשור ל-</Label>
                <Select
                  value={linkType}
                  onValueChange={(value: "project" | "quote" | "none") => {
                    setLinkType(value)
                    if (value === "none") {
                      setFormData((prev) => ({
                        ...prev,
                        projectId: "",
                        quoteId: "",
                      }))
                    } else if (value === "project") {
                      setFormData((prev) => ({ ...prev, quoteId: "" }))
                    } else {
                      setFormData((prev) => ({ ...prev, projectId: "" }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא קשר</SelectItem>
                    <SelectItem value="project">פרויקט</SelectItem>
                    <SelectItem value="quote">הצעה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* אם יש clientId, נציג רק אפשרות של הצעה או ללא קשר */}
            {clientId && (
              <div className="grid gap-2">
                <Label htmlFor="linkType">קשור ל-</Label>
                <Select
                  value={linkType === "project" ? "none" : linkType}
                  onValueChange={(value: "quote" | "none") => {
                    const newLinkType = value as "project" | "quote" | "none"
                    setLinkType(newLinkType)
                    if (value === "none") {
                      setFormData((prev) => ({
                        ...prev,
                        projectId: "",
                        quoteId: "",
                      }))
                    } else {
                      setFormData((prev) => ({ ...prev, projectId: "", quoteId: prev.quoteId || "" }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא קשר</SelectItem>
                    <SelectItem value="quote">הצעה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* פרויקט - רק אם אין clientId */}
            {!clientId && linkType === "project" && (
              <div className="grid gap-2">
                <Label htmlFor="projectId">פרויקט *</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פרויקט" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* הצעה */}
            {linkType === "quote" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="quoteId">הצעה *</Label>
                  <Select
                    value={formData.quoteId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, quoteId: value })
                      const quote = quotes.find(q => q.id === value)
                      setSelectedQuote(quote || null)
                      if (value) {
                        fetchQuoteBalance(value)
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר הצעה" />
                    </SelectTrigger>
                    <SelectContent>
                      {quotes.map((quote) => (
                        <SelectItem key={quote.id} value={quote.id}>
                          {quote.quoteNumber} - {quote.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* הצגת יתרה */}
                {quoteBalance !== null && selectedQuote && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">סכום הצעה:</span>
                      <span className="font-medium">₪{selectedQuote.total?.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-600">יתרה לתשלום:</span>
                      <span className={`font-bold ${quoteBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        ₪{quoteBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* סכום */}
            <div className="grid gap-2">
              <Label htmlFor="amount">סכום (₪) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className={exceedsBalance ? "border-red-500" : ""}
              />
              {exceedsBalance && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-red-900 font-medium">
                      ⚠️ הסכום עולה על היתרה
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="confirmExceed"
                      checked={confirmExceed}
                      onChange={(e) => setConfirmExceed(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="confirmExceed" className="text-sm text-red-700 cursor-pointer">
                      אני יודע שאני חורג מהיתרה
                    </Label>
                  </div>
                </div>
              )}
            </div>

            {/* בחירת מערכת תשלום */}
            {linkType === "quote" && formData.quoteId && (
              <div className="grid gap-2">
                <Label htmlFor="paymentProvider">מערכת תשלום *</Label>
                <Select
                  value={paymentProvider}
                  onValueChange={(value: "payplus" | "invoice4u" | "manual") => {
                    setPaymentProvider(value)
                    // אם בוחרים תשלום ידני, נשנה את שיטת התשלום ל-OTHER (כי זה לא דרך מערכת סליקה)
                    if (value === "manual" && formData.method === "CREDIT_CARD") {
                      setFormData({ ...formData, method: "OTHER" })
                    }
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payplus">💳 PayPlus - תשלום אונליין</SelectItem>
                    <SelectItem value="invoice4u">💳 Invoice4U Clearing - תשלום אונליין</SelectItem>
                    <SelectItem value="manual">✏️ תשלום ידני (ללא דף סליקה)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {paymentProvider === "manual" ? (
                    <span className="text-orange-600">
                      ⚠️ תשלום ידני רק יוצר רשומה במערכת. לא תועבר לדף סליקה. בחר את שיטת התשלום למטה.
                    </span>
                  ) : (
                    <span className="text-green-600">
                      ✓ לאחר לחיצה על "שמור" תועבר לדף הסליקה של {paymentProvider === "payplus" ? "PayPlus" : "Invoice4U"}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* שיטת תשלום */}
            <div className="grid gap-2">
              <Label htmlFor="method">שיטת תשלום *</Label>
              <Select
                value={formData.method}
                onValueChange={(value) =>
                  setFormData({ ...formData, method: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT_CARD">כרטיס אשראי</SelectItem>
                  <SelectItem value="BANK_TRANSFER">העברה בנקאית</SelectItem>
                  <SelectItem value="CASH">מזומן</SelectItem>
                  <SelectItem value="CHECK">המחאה</SelectItem>
                  <SelectItem value="OTHER">אחר</SelectItem>
                </SelectContent>
              </Select>
              {paymentProvider === "manual" && formData.method === "CREDIT_CARD" && (
                <p className="text-xs text-orange-600">
                  ⚠️ תשלום ידני בדרך כלל לא דרך כרטיס אשראי. בחר שיטת תשלום אחרת.
                </p>
              )}
            </div>

            {/* סטטוס */}
            <div className="grid gap-2">
              <Label htmlFor="status">סטטוס *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">ממתין</SelectItem>
                  <SelectItem value="PROCESSING">מעבד</SelectItem>
                  <SelectItem value="COMPLETED">הושלם</SelectItem>
                  <SelectItem value="FAILED">נכשל</SelectItem>
                  <SelectItem value="REFUNDED">הוחזר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* מספר עסקה */}
            <div className="grid gap-2">
              <Label htmlFor="transactionId">מספר עסקה</Label>
              <Input
                id="transactionId"
                value={formData.transactionId}
                onChange={(e) =>
                  setFormData({ ...formData, transactionId: e.target.value })
                }
                placeholder="מספר עסקה ממערכת התשלום"
              />
            </div>

            {/* מספר הפניה */}
            <div className="grid gap-2">
              <Label htmlFor="paymentReference">מספר הפניה/קבלה</Label>
              <Input
                id="paymentReference"
                value={formData.paymentReference}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentReference: e.target.value,
                  })
                }
                placeholder="מספר הפניה או מספר קבלה"
              />
            </div>

            {/* תאריך תשלום - רק אם הושלם */}
            {formData.status === "COMPLETED" && (
              <div className="grid gap-2">
                <Label htmlFor="paidAt">תאריך תשלום</Label>
                <Input
                  id="paidAt"
                  type="datetime-local"
                  value={formData.paidAt}
                  onChange={(e) =>
                    setFormData({ ...formData, paidAt: e.target.value })
                  }
                />
              </div>
            )}

            {/* תיאור */}
            <div className="grid gap-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="תיאור התשלום"
                rows={2}
              />
            </div>

            {/* הערות */}
            <div className="grid gap-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="הערות נוספות..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

