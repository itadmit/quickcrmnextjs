"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Save, X, FileText } from "lucide-react"

interface TaskTemplate {
  id: string
  name: string
  description: string | null
  tasks: string[]
  createdAt: string
  updatedAt: string
}

export function EditTaskTemplatesDialog() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTemplate, setNewTemplate] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tasks: [""],
  })

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/tasks/templates")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    }
  }

  const handleEdit = (template: TaskTemplate) => {
    setEditingId(template.id)
    setNewTemplate(false)
    setFormData({
      name: template.name,
      description: template.description || "",
      tasks: template.tasks.length > 0 ? [...template.tasks] : [""],
    })
  }

  const handleAddNew = () => {
    setEditingId(null)
    setNewTemplate(true)
    setFormData({
      name: "",
      description: "",
      tasks: [""],
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setNewTemplate(false)
    setFormData({
      name: "",
      description: "",
      tasks: [""],
    })
  }

  const handleAddTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, ""],
    })
  }

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...formData.tasks]
    newTasks[index] = value
    setFormData({ ...formData, tasks: newTasks })
  }

  const handleRemoveTask = (index: number) => {
    const newTasks = formData.tasks.filter((_, i) => i !== index)
    setFormData({ ...formData, tasks: newTasks.length > 0 ? newTasks : [""] })
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם התבנית הוא חובה",
        variant: "destructive",
      })
      return
    }

    const validTasks = formData.tasks.filter((t) => t.trim() !== "")
    if (validTasks.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש להוסיף לפחות משימה אחת",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (editingId) {
        // עדכון תבנית קיימת
        const response = await fetch(`/api/tasks/templates/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            tasks: validTasks,
          }),
        })

        if (response.ok) {
          toast({
            title: "התבנית עודכנה!",
            description: "התבנית עודכנה בהצלחה",
          })
          await fetchTemplates()
          handleCancel()
        } else {
          throw new Error("Failed to update template")
        }
      } else {
        // יצירת תבנית חדשה
        const response = await fetch("/api/tasks/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            tasks: validTasks,
          }),
        })

        if (response.ok) {
          toast({
            title: "התבנית נוצרה!",
            description: "התבנית נוצרה בהצלחה",
          })
          await fetchTemplates()
          handleCancel()
        } else {
          throw new Error("Failed to create template")
        }
      }
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת התבנית",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תבנית זו?")) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/templates/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "התבנית נמחקה!",
          description: "התבנית נמחקה בהצלחה",
        })
        await fetchTemplates()
        if (editingId === id) {
          handleCancel()
        }
      } else {
        throw new Error("Failed to delete template")
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התבנית",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="w-4 h-4 ml-2" />
          תבניות
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ניהול תבניות משימות</DialogTitle>
          <DialogDescription>
            צור, ערוך ומחק תבניות משימות לשימוש חוזר
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* רשימת תבניות קיימות */}
          {!newTemplate && !editingId && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">תבניות קיימות</h3>
                <Button onClick={handleAddNew} size="sm" className="prodify-gradient text-white">
                  <Plus className="w-4 h-4 ml-2" />
                  תבנית חדשה
                </Button>
              </div>
              <div className="space-y-3">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין תבניות עדיין. הוסף תבנית חדשה להתחיל.
                  </div>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {template.name}
                          </h4>
                          {template.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {template.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-500">
                            {template.tasks.length} משימות
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* טופס עריכה/הוספה */}
          {(newTemplate || editingId) && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">
                  {editingId ? "ערוך תבנית" : "תבנית חדשה"}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">שם התבנית *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="לדוגמה: Onboarding לקוח חדש"
                  />
                </div>
                <div>
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="תיאור קצר של התבנית"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>משימות *</Label>
                  <div className="space-y-2 mt-2">
                    {formData.tasks.map((task, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={task}
                          onChange={(e) =>
                            handleTaskChange(index, e.target.value)
                          }
                          placeholder={`משימה ${index + 1}`}
                        />
                        {formData.tasks.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTask(index)}
                            className="text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTask}
                    className="w-full mt-2"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף משימה נוספת
                  </Button>
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={handleCancel}>
                    ביטול
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="prodify-gradient text-white"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    {loading ? "שומר..." : "שמור"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

