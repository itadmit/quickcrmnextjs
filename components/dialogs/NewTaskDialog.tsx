"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react"

interface NewTaskDialogProps {
  onTaskCreated?: () => void
}

export function NewTaskDialog({ onTaskCreated }: NewTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "NORMAL",
    dueDate: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
          status: 'TODO',
        }),
      })

      if (response.ok) {
        toast({
          title: "משימה נוצרה!",
          description: "המשימה נוספה בהצלחה",
        })
        setOpen(false)
        setFormData({
          title: "",
          description: "",
          priority: "NORMAL",
          dueDate: "",
        })
        onTaskCreated?.()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן ליצור את המשימה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת המשימה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const priorityLabels: Record<string, string> = {
    LOW: "נמוכה",
    NORMAL: "רגילה",
    HIGH: "גבוהה",
    URGENT: "דחוף",
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="prodify-gradient text-white">
          <Plus className="w-4 h-4 ml-2" />
          משימה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>יצירת משימה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">כותרת *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="למשל: לצלצל ללקוח"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">תיאור</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="תיאור קצר של המשימה"
                className="w-full min-h-[100px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">עדיפות</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">תאריך יעד</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
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
              className="prodify-gradient text-white"
              disabled={loading}
            >
              {loading ? "יוצר משימה..." : "צור משימה"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

