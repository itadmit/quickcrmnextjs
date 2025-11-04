"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Invoice4UDialogProps {
  clientId: string
  clientName: string
}

interface DocumentItem {
  name: string
  quantity: number
  price: number
}

export function Invoice4UDialog({ clientId, clientName }: Invoice4UDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [documentType, setDocumentType] = useState<string>("quote")
  const [subject, setSubject] = useState(`מסמך עבור ${clientName}`)
  const [items, setItems] = useState<DocumentItem[]>([
    { name: "", quantity: 1, price: 0 }
  ])
  const [customEmails, setCustomEmails] = useState<string>("")

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, price: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof DocumentItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  }

  const handleSubmit = async () => {
    // Validation
    if (items.some(item => !item.name || item.price <= 0)) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל פרטי הפריטים",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const emailList = customEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e)

      const res = await fetch('/api/integrations/invoice4u/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          documentType,
          subject,
          items,
          customEmails: emailList,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: "הצלחה!",
          description: `המסמך נוצר בהצלחה במס' ${data.document.documentNumber}`,
        })
        setOpen(false)
        
        // Reset form
        setSubject(`מסמך עבור ${clientName}`)
        setItems([{ name: "", quantity: 1, price: 0 }])
        setCustomEmails("")
      } else {
        toast({
          title: "שגיאה",
          description: data.error || "לא הצלחנו ליצור את המסמך",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת המסמך",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'quote': return 'הצעת מחיר'
      case 'proforma': return 'חשבון עסקה'
      case 'invoice': return 'חשבונית מס'
      case 'receipt': return 'חשבונית מס קבלה'
      default: return type
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          הוצא מסמך Invoice4U
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הוצאת מסמך ב-Invoice4U</DialogTitle>
          <DialogDescription>
            צור הצעת מחיר, חשבון עסקה או חשבונית מס עבור {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Document Type */}
          <div>
            <Label>סוג מסמך</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quote">הצעת מחיר</SelectItem>
                <SelectItem value="proforma">חשבון עסקה</SelectItem>
                <SelectItem value="invoice">חשבונית מס</SelectItem>
                <SelectItem value="receipt">חשבונית מס קבלה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <Label>נושא המסמך</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="תיאור המסמך"
              className="mt-2"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>פריטים</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 ml-1" />
                הוסף פריט
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg">
                  <div className="col-span-5">
                    <Label className="text-xs">שם הפריט</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder="תיאור הפריט"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">כמות</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">מחיר ליחידה</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="text-sm font-medium">
                      ₪{(item.quantity * item.price).toFixed(2)}
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
              <span className="font-medium">סה"כ:</span>
              <span className="text-lg font-bold">₪{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Custom Emails */}
          <div>
            <Label>אימיילים נוספים (מופרדים בפסיק)</Label>
            <Input
              value={customEmails}
              onChange={(e) => setCustomEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="mt-2"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">
              המסמך יישלח גם ללקוח ולמשתמש הנוכחי
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 prodify-gradient text-white"
            >
              {loading ? "יוצר מסמך..." : `צור ${getDocumentTypeLabel(documentType)}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

