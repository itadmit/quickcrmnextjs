"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, BookOpen } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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

interface QuoteItem {
  id?: string
  description: string
  richDescription?: string | null
  quantity: number
  unitPrice: number
  discount: number
}

interface Lead {
  id: string
  name: string
  email?: string | null
}

interface Quote {
  id?: string
  quoteNumber?: string
  title: string
  description?: string | null
  templateType?: string
  status: string
  discount: number
  tax: number
  validUntil?: Date | null
  notes?: string | null
  terms?: string | null
  leadId?: string | null
  items: QuoteItem[]
}

interface EditQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | null
  onSuccess: () => void
  isDuplicate?: boolean
}

export function EditQuoteDialog({
  open,
  onOpenChange,
  quote,
  onSuccess,
  isDuplicate = false,
}: EditQuoteDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])

  if (!quote) return null

  const [formData, setFormData] = useState({
    leadId: quote.leadId || "",
    title: quote.title,
    description: quote.description || "",
    templateType: (quote.templateType || "simple") as "simple" | "professional",
    status: isDuplicate ? "DRAFT" : quote.status,
    validUntil: quote.validUntil
      ? new Date(quote.validUntil).toISOString().split("T")[0]
      : "",
    notes: quote.notes || "",
    terms: quote.terms || "",
    discount: quote.discount,
    tax: quote.tax,
  })

  const [items, setItems] = useState<QuoteItem[]>(
    quote.items.length > 0
      ? quote.items.map(item => ({ ...item, richDescription: item.richDescription || "" }))
      : [{ description: "", richDescription: "", quantity: 1, unitPrice: 0, discount: 0 }]
  )

  useEffect(() => {
    if (open && quote) {
      fetchLeads()
      // Reset form when quote changes
      setFormData({
        leadId: quote.leadId || "",
        title: quote.title,
        description: quote.description || "",
        templateType: (quote.templateType || "simple") as "simple" | "professional",
        status: isDuplicate ? "DRAFT" : quote.status,
        validUntil: quote.validUntil
          ? new Date(quote.validUntil).toISOString().split("T")[0]
          : "",
        notes: quote.notes || "",
        terms: quote.terms || "",
        discount: quote.discount,
        tax: quote.tax,
      })
      setItems(
        quote.items.length > 0
          ? quote.items.map(item => ({ ...item, richDescription: item.richDescription || "" }))
          : [{ description: "", richDescription: "", quantity: 1, unitPrice: 0, discount: 0 }]
      )
    }
  }, [open, quote, isDuplicate])

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads")
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch (error) {
      console.error("Error fetching leads:", error)
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      { description: "", richDescription: "", quantity: 1, unitPrice: 0, discount: 0 },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const itemTotal =
        item.quantity * item.unitPrice * (1 - item.discount / 100)
      return sum + itemTotal
    }, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const afterDiscount = subtotal * (1 - formData.discount / 100)
    const withTax = afterDiscount * (1 + formData.tax / 100)
    return withTax
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (!formData.title.trim()) {
        toast({
          title: "שגיאה",
          description: "יש להזין כותרת להצעת המחיר",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const validItems = items.filter(
        (item) => item.description.trim() && item.quantity > 0
      )

      if (validItems.length === 0) {
        toast({
          title: "שגיאה",
          description: "יש להוסיף לפחות פריט אחד",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Remove id from items for API
      const itemsForApi = validItems.map(({ id, ...item }) => item)

      let res
      if (isDuplicate || !quote.id) {
        // Create new quote (for duplicate)
        res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            items: itemsForApi,
          }),
        })
      } else {
        // Update existing quote
        res = await fetch(`/api/quotes/${quote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            items: itemsForApi,
          }),
        })
      }

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: isDuplicate || !quote.id 
            ? "הצעת המחיר נוצרה בהצלחה" 
            : "הצעת המחיר עודכנה בהצלחה",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save quote")
      }
    } catch (error) {
      console.error("Error updating quote:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את הצעת המחיר",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    // אימות לפני שמירה
    const validItems = items.filter(
      (item) => item.description.trim() && item.quantity > 0
    )

    if (validItems.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש להוסיף לפחות פריט אחד",
        variant: "destructive",
      })
      return
    }

    if (!formData.title.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין כותרת להצעת המחיר",
        variant: "destructive",
      })
      return
    }

    // אישור מהמשתמש
    if (!confirm(`האם לשמור את "${formData.title}" כתבנית?`)) {
      return
    }

    setLoading(true)
    try {
      const itemsForApi = validItems.map(({ id, ...item }) => item)

      const res = await fetch("/api/quotes/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          templateType: formData.templateType,
          items: itemsForApi,
          notes: formData.notes,
          terms: formData.terms,
          discount: formData.discount,
          tax: formData.tax,
        }),
      })

      if (res.ok) {
        const newTemplate = await res.json()
        toast({
          title: "הצלחה",
          description: `התבנית "${newTemplate.title}" נשמרה בהצלחה`,
        })
        // רענון רשימת התבניות אם יש callback
        onSuccess()
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to save template")
      }
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "לא הצלחנו לשמור את התבנית",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const subtotal = calculateSubtotal()
  const discountAmount = subtotal * (formData.discount / 100)
  const afterDiscount = subtotal - discountAmount
  const taxAmount = afterDiscount * (formData.tax / 100)
  const total = afterDiscount + taxAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isDuplicate || !quote.id 
              ? "יצירת הצעת מחיר חדשה" 
              : `עריכת הצעת מחיר${quote.quoteNumber ? ` - ${quote.quoteNumber}` : ''}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadId">לקוח / ליד</Label>
              <Select
                value={formData.leadId}
                onValueChange={(value) =>
                  setFormData({ ...formData, leadId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} {lead.email && `(${lead.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">סטטוס</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">טיוטה</SelectItem>
                  <SelectItem value="SENT">נשלח</SelectItem>
                  <SelectItem value="VIEWED">נצפה</SelectItem>
                  <SelectItem value="ACCEPTED">אושר</SelectItem>
                  <SelectItem value="REJECTED">נדחה</SelectItem>
                  <SelectItem value="EXPIRED">פג תוקף</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">תוקף עד</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">כותרת *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="למשל: הצעת מחיר לבניית אתר E-commerce"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateType">תבנית הצעת מחיר</Label>
            <Select
              value={formData.templateType}
              onValueChange={(value: "simple" | "professional") =>
                setFormData({ ...formData, templateType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">תבנית פשוטה (טבלה)</SelectItem>
                <SelectItem value="professional">תבנית מקצועית (כרטיסים)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {formData.templateType === "professional"
                ? "תבנית מקצועית עם כרטיסי פריטים מפורטים - מומלץ להצעות מחיר מורכבות"
                : "תבנית פשוטה עם טבלת פריטים - מומלץ להצעות מחיר בסיסיות"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="תיאור כללי של ההצעה..."
              rows={3}
            />
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">פריטים</Label>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                הוסף פריט
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-gray-50 space-y-3"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="תיאור הפריט *"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        required
                      />
                      {formData.templateType === "professional" && (
                        <Textarea
                          placeholder="תיאור מפורט של הפריט (תמיכה בעברית, אימוג'ים, רשימות...)"
                          value={item.richDescription || ""}
                          onChange={(e) =>
                            updateItem(index, "richDescription", e.target.value)
                          }
                          rows={4}
                          className="mt-2"
                        />
                      )}
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">כמות</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">מחיר יחידה (₪)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">הנחה (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "discount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">סה״כ</Label>
                      <div className="flex items-center h-10 px-3 bg-white border rounded-md font-semibold">
                        ₪
                        {(
                          item.quantity *
                          item.unitPrice *
                          (1 - item.discount / 100)
                        ).toLocaleString("he-IL", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="discount">הנחה כללית (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax">מע״מ (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">סכום ביניים:</span>
                <span className="font-medium">
                  ₪{subtotal.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {formData.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    הנחה ({formData.discount}%):
                  </span>
                  <span className="font-medium text-red-600">
                    -₪
                    {discountAmount.toLocaleString("he-IL", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">מע״מ ({formData.tax}%):</span>
                <span className="font-medium">
                  ₪{taxAmount.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>סה״כ לתשלום:</span>
                  <span className="text-purple-600">
                    ₪{total.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="הערות נוספות שיופיעו בהצעת המחיר..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">תנאים</Label>
              <Textarea
                id="terms"
                value={formData.terms}
                onChange={(e) =>
                  setFormData({ ...formData, terms: e.target.value })
                }
                placeholder="תנאי תשלום, אחריות וכו׳..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveTemplate}
              disabled={loading}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              שמור כתבנית
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {loading ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

