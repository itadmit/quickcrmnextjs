"use client"

import { useState, useEffect } from "react"
import { Plus, X, Trash2, BookOpen, Mail } from "lucide-react"
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

interface Lead {
  id: string
  name: string
  email?: string | null
}

interface QuoteItem {
  description: string
  richDescription?: string
  quantity: number
  unitPrice: number
  discount: number
}

interface NewQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  leadId?: string
}

export function NewQuoteDialog({
  open,
  onOpenChange,
  onSuccess,
  leadId,
}: NewQuoteDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])

  const [formData, setFormData] = useState({
    leadId: leadId || "",
    title: "",
    description: "",
    templateType: "simple" as "simple" | "professional",
    validUntil: "",
    notes: "",
    terms: "",
    discount: 0,
    tax: 18,
  })

  const [items, setItems] = useState<QuoteItem[]>([
    { description: "", richDescription: "", quantity: 1, unitPrice: 0, discount: 0 },
  ])
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)

  useEffect(() => {
    if (open) {
      fetchLeads()
      fetchTemplates()
      if (leadId) {
        setFormData((prev) => ({ ...prev, leadId }))
      }
    }
  }, [open, leadId])

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch("/api/quotes/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleLoadTemplate = (template: any) => {
    setFormData({
      leadId: leadId || "",
      title: template.title,
      description: template.description || "",
      templateType: (template.templateType || "simple") as "simple" | "professional",
      validUntil: "",
      notes: template.notes || "",
      terms: template.terms || "",
      discount: template.discount || 0,
      tax: template.tax || 18,
    })
    setItems(
      template.items.map((item: any) => ({
        description: item.description,
        richDescription: item.richDescription || "",
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        discount: item.discount || 0,
      }))
    )
    setShowTemplateSelector(false)
    toast({
      title: "הצלחה",
      description: "התבנית נטענה בהצלחה",
    })
  }

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

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין כותרת להצעת המחיר",
        variant: "destructive",
      })
      return false
    }

    if (!formData.leadId) {
      toast({
        title: "שגיאה",
        description: "יש לבחור ליד",
        variant: "destructive",
      })
      return false
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
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)

    try {
      const validItems = items.filter(
        (item) => item.description.trim() && item.quantity > 0
      )

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: validItems,
        }),
      })

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: "הצעת המחיר נוצרה בהצלחה",
        })
        onSuccess()
        onOpenChange(false)
        resetForm()
      } else {
        const error = await res.json()
        throw new Error(error.error || "Failed to create quote")
      }
    } catch (error) {
      console.error("Error creating quote:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור את הצעת המחיר",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAndSend = async () => {
    if (!validateForm()) return

    // בדיקה שיש אימייל ללקוח
    const selectedLead = leads.find((l) => l.id === formData.leadId)
    if (!selectedLead?.email) {
      toast({
        title: "שגיאה",
        description: "ללקוח הנבחר אין כתובת אימייל. נא להוסיף אימייל ללקוח.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const validItems = items.filter(
        (item) => item.description.trim() && item.quantity > 0
      )

      const res = await fetch("/api/quotes/create-and-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: validItems,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast({
          title: "הצלחה",
          description: `הצעת המחיר נוצרה ונשלחה בהצלחה למייל ${selectedLead.email}`,
        })
        onSuccess()
        onOpenChange(false)
        resetForm()
      } else {
        const error = await res.json()
        throw new Error(error.error || error.details || "Failed to create and send quote")
      }
    } catch (error) {
      console.error("Error creating and sending quote:", error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "לא הצלחנו ליצור ולשלוח את הצעת המחיר",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      leadId: "",
      title: "",
      description: "",
      templateType: "simple",
      validUntil: "",
      notes: "",
      terms: "",
      discount: 0,
      tax: 18,
    })
    setItems([{ description: "", richDescription: "", quantity: 1, unitPrice: 0, discount: 0 }])
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
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl font-bold">
              הצעת מחיר חדשה
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (templates.length > 0) {
                  setShowTemplateSelector(true)
                } else if (!loadingTemplates) {
                  setLoadingTemplates(true)
                  try {
                    const res = await fetch("/api/quotes/templates")
                    if (res.ok) {
                      const data = await res.json()
                      setTemplates(data)
                      if (data.length > 0) {
                        setShowTemplateSelector(true)
                      } else {
                        toast({
                          title: "אין תבניות זמינות",
                          description: "לא נמצאו תבניות שמורות. נא ליצור תבנית תחילה.",
                          variant: "destructive",
                        })
                      }
                    }
                  } catch (error) {
                    console.error("Error fetching templates:", error)
                    toast({
                      title: "שגיאה",
                      description: "לא הצלחנו לטעון את התבניות",
                      variant: "destructive",
                    })
                  } finally {
                    setLoadingTemplates(false)
                  }
                }
              }}
              disabled={loadingTemplates}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {loadingTemplates ? "טוען..." : "טען מתבנית"}
            </Button>
          </div>
        </DialogHeader>

        {showTemplateSelector && (
          <div className="mb-4 p-4 border rounded-lg bg-gray-50" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">בחר תבנית</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateSelector(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  className="justify-start text-right h-auto py-3"
                  onClick={() => handleLoadTemplate(template)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium break-words">{template.title}</div>
                    {template.description && (
                      <div className="text-xs text-gray-500 break-words whitespace-pre-wrap">
                        {template.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {template.items.length} פריטים
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadId">לקוח / ליד *</Label>
              <Select
                value={formData.leadId}
                onValueChange={(value) =>
                  setFormData({ ...formData, leadId: value })
                }
                disabled={!!leadId}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="templateType">תבנית הצעת מחיר</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (templates.length > 0) {
                    setShowTemplateSelector(true)
                  } else if (!loadingTemplates) {
                    setLoadingTemplates(true)
                    try {
                      const res = await fetch("/api/quotes/templates")
                      if (res.ok) {
                        const data = await res.json()
                        setTemplates(data)
                        if (data.length > 0) {
                          setShowTemplateSelector(true)
                        } else {
                          toast({
                            title: "אין תבניות זמינות",
                            description: "לא נמצאו תבניות שמורות. נא ליצור תבנית תחילה.",
                            variant: "destructive",
                          })
                        }
                      }
                    } catch (error) {
                      console.error("Error fetching templates:", error)
                      toast({
                        title: "שגיאה",
                        description: "לא הצלחנו לטעון את התבניות",
                        variant: "destructive",
                      })
                    } finally {
                      setLoadingTemplates(false)
                    }
                  }
                }}
                disabled={loadingTemplates}
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {loadingTemplates ? "טוען..." : "טען הצעה מתבנית"}
              </Button>
            </div>
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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                {loading ? "יוצר..." : "צור הצעת מחיר"}
              </Button>
              <Button
                type="button"
                onClick={handleCreateAndSend}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white gap-2"
              >
                <Mail className="w-4 h-4" />
                {loading ? "שולח..." : "צור ושלח במייל"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

