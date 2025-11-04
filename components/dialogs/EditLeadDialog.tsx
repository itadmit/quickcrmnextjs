"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  email: string | null
  phone: string | null
  source: string | null
  status: string
  notes: string | null
}

interface EditLeadDialogProps {
  lead: Lead
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated?: () => void
}

export function EditLeadDialog({ lead, open, onOpenChange, onLeadUpdated }: EditLeadDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email || "",
    phone: lead.phone || "",
    source: lead.source || "",
    status: lead.status,
    notes: lead.notes || "",
  })

  useEffect(() => {
    if (open) {
      setFormData({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        source: lead.source || "",
        status: lead.status,
        notes: lead.notes || "",
      })
    }
  }, [open, lead])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: formData.email || null,
          phone: formData.phone || null,
          source: formData.source || null,
          notes: formData.notes || null,
        }),
      })

      if (response.ok) {
        toast({
          title: "ליד עודכן!",
          description: "פרטי הליד עודכנו בהצלחה",
        })
        onOpenChange(false)
        onLeadUpdated?.()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לעדכן את הליד",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הליד",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const statusLabels: Record<string, string> = {
    NEW: "חדש",
    CONTACTED: "יצירת קשר",
    QUALIFIED: "מתאים",
    PROPOSAL: "הצעה",
    NEGOTIATION: "משא ומתן",
    WON: "נסגר",
    LOST: "אבד",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>עריכת ליד</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">שם מלא *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="שם הליד"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="050-1234567"
              />
            </div>

            <div>
              <Label htmlFor="source">מקור</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מקור" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="אתר">אתר</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="המלצה">המלצה</SelectItem>
                  <SelectItem value="טלפון">טלפון</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">סטטוס *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">הערות</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות נוספות על הליד"
                className="w-full min-h-[100px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
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
              className="prodify-gradient text-white"
              disabled={loading}
            >
              {loading ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

