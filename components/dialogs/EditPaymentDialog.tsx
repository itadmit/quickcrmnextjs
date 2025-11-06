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

interface Payment {
  id: string
  amount: number
  currency: string
  method: string
  status: string
  transactionId?: string | null
  paymentReference?: string | null
  description?: string | null
  notes?: string | null
  paidAt?: Date | null
}

interface EditPaymentDialogProps {
  payment: Payment
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentUpdated?: () => void
}

const methodConfig: Record<string, string> = {
  CREDIT_CARD: "כרטיס אשראי",
  BANK_TRANSFER: "העברה בנקאית",
  CASH: "מזומן",
  CHECK: "המחאה",
  OTHER: "אחר",
}

const statusConfig: Record<string, string> = {
  PENDING: "ממתין",
  PROCESSING: "מעבד",
  COMPLETED: "הושלם",
  FAILED: "נכשל",
  REFUNDED: "הוחזר",
}

export function EditPaymentDialog({
  payment,
  open,
  onOpenChange,
  onPaymentUpdated,
}: EditPaymentDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    amount: payment.amount.toString(),
    currency: payment.currency || "ILS",
    method: payment.method,
    status: payment.status,
    transactionId: payment.transactionId || "",
    paymentReference: payment.paymentReference || "",
    description: payment.description || "",
    notes: payment.notes || "",
    paidAt: payment.paidAt
      ? new Date(payment.paidAt).toISOString().split("T")[0]
      : "",
  })

  useEffect(() => {
    if (open) {
      setFormData({
        amount: payment.amount.toString(),
        currency: payment.currency || "ILS",
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId || "",
        paymentReference: payment.paymentReference || "",
        description: payment.description || "",
        notes: payment.notes || "",
        paidAt: payment.paidAt
          ? new Date(payment.paidAt).toISOString().split("T")[0]
          : "",
      })
    }
  }, [open, payment])

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

      if (formData.transactionId) {
        payload.transactionId = formData.transactionId
      }

      if (formData.paymentReference) {
        payload.paymentReference = formData.paymentReference
      }

      if (formData.paidAt && formData.status === "COMPLETED") {
        payload.paidAt = new Date(formData.paidAt).toISOString()
      } else if (formData.status === "COMPLETED" && !formData.paidAt) {
        // אם הסטטוס הושלם אבל אין תאריך, נשתמש בתאריך הנוכחי
        payload.paidAt = new Date().toISOString()
      } else if (formData.status !== "COMPLETED") {
        // אם הסטטוס לא הושלם, נמחק את התאריך
        payload.paidAt = null
      }

      const response = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "תשלום עודכן בהצלחה!",
          description: `התשלום עודכן בהצלחה`,
        })
        onOpenChange(false)
        onPaymentUpdated?.()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את התשלום",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating payment:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון התשלום",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>עריכת תשלום</DialogTitle>
          <DialogDescription>
            עדכן את פרטי התשלום. שים לב ששינוי פרטים מסוימים עלול להשפיע על הדיווח.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
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

            <div>
              <Label htmlFor="currency">מטבע</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">₪ ILS</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
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

            <div>
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

            <div>
              <Label htmlFor="transactionId">מספר עסקה</Label>
              <Input
                id="transactionId"
                value={formData.transactionId}
                onChange={(e) =>
                  setFormData({ ...formData, transactionId: e.target.value })
                }
                placeholder="מספר עסקה"
              />
            </div>

            <div>
              <Label htmlFor="paymentReference">מספר אישור/קבלה</Label>
              <Input
                id="paymentReference"
                value={formData.paymentReference}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentReference: e.target.value,
                  })
                }
                placeholder="מספר אישור"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">תיאור</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="תיאור התשלום"
              />
            </div>

            {formData.status === "COMPLETED" && (
              <div>
                <Label htmlFor="paidAt">תאריך תשלום</Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={formData.paidAt}
                  onChange={(e) =>
                    setFormData({ ...formData, paidAt: e.target.value })
                  }
                />
              </div>
            )}

            <div className="col-span-2">
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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={loading} className="prodify-gradient text-white">
              {loading ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

