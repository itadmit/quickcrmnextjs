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
}

interface NewPaymentDialogProps {
  onPaymentCreated?: () => void
  triggerButton?: React.ReactNode
  projectId?: string
  quoteId?: string
}

export function NewPaymentDialog({
  onPaymentCreated,
  triggerButton,
  projectId,
  quoteId,
}: NewPaymentDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [linkType, setLinkType] = useState<"project" | "quote" | "none">(
    projectId ? "project" : quoteId ? "quote" : "none"
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
    }
    if (quoteId) {
      setFormData((prev) => ({ ...prev, quoteId }))
      setLinkType("quote")
    }
  }, [projectId, quoteId])

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
      }
    } catch (error) {
      console.error("Error fetching quotes:", error)
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

    try {
      const payload: any = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        method: formData.method,
        status: formData.status,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      }

      if (linkType === "project" && formData.projectId) {
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
            {/* סוג קשר */}
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

            {/* פרויקט */}
            {linkType === "project" && (
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
              <div className="grid gap-2">
                <Label htmlFor="quoteId">הצעה *</Label>
                <Select
                  value={formData.quoteId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, quoteId: value })
                  }
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
              />
            </div>

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

