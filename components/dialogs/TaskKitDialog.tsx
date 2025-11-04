"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Check } from "lucide-react"

const taskKits = [
  {
    id: "onboarding",
    name: "Onboarding לקוח חדש",
    description: "משימות סטנדרטיות להטמעת לקוח",
    tasks: [
      "שיחת היכרות ראשונית",
      "איסוף דרישות ומפרט",
      "הצגת המוצר/שירות",
      "הכנת הצעת מחיר",
      "חתימה על חוזה",
      "תכנון לוח זמנים",
    ]
  },
  {
    id: "website",
    name: "פרויקט בניית אתר",
    description: "כל השלבים לבניית אתר אינטרנט",
    tasks: [
      "מפגש ברי פינג וגיבוש קונספט",
      "עיצוב ממשק משתמש (UI/UX)",
      "פיתוח Frontend",
      "פיתוח Backend",
      "אינטגרציה ובדיקות",
      "העלאה לאוויר והדרכה",
    ]
  },
  {
    id: "marketing",
    name: "קמפיין שיווקי",
    description: "תכנון וביצוע קמפיין דיגיטלי",
    tasks: [
      "הגדרת מטרות וקהל יעד",
      "תכנון אסטרטגיה",
      "הכנת תוכן יצירתי",
      "הפעלת פרסום",
      "מעקב וניתוח ביצועים",
      "אופטימיזציה",
    ]
  },
  {
    id: "crm",
    name: "יישום מערכת CRM",
    description: "התקנה והטמעת מערכת CRM",
    tasks: [
      "סקר צרכים ארגוני",
      "התקנה והגדרות",
      "העברת נתונים קיימים",
      "הדרכת משתמשים",
      "בניית תהליכי עבודה",
      "מעקב ותמיכה",
    ]
  },
]

interface TaskKitDialogProps {
  projectId?: string
  clientId?: string
  onTasksCreated?: (tasks: string[]) => void
}

export function TaskKitDialog({ projectId, clientId, onTasksCreated }: TaskKitDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedKit, setSelectedKit] = useState<string | null>(null)
  const [customTasks, setCustomTasks] = useState<string[]>([""])

  const handleSelectKit = (kitId: string) => {
    setSelectedKit(kitId)
  }

  const handleAddCustomTask = () => {
    setCustomTasks([...customTasks, ""])
  }

  const handleCustomTaskChange = (index: number, value: string) => {
    const newTasks = [...customTasks]
    newTasks[index] = value
    setCustomTasks(newTasks)
  }

  const handleCreateTasks = () => {
    if (selectedKit) {
      const kit = taskKits.find(k => k.id === selectedKit)
      if (kit && onTasksCreated) {
        onTasksCreated(kit.tasks)
      }
    } else {
      const tasks = customTasks.filter(t => t.trim() !== "")
      if (onTasksCreated) {
        onTasksCreated(tasks)
      }
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="prodify-gradient text-white">
          <Plus className="w-4 h-4 ml-2" />
          הוסף משימות
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הוסף משימות לפרויקט</DialogTitle>
          <DialogDescription>
            בחר קיט משימות מוכן או הוסף משימות ידנית
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Task Kits */}
          <div>
            <h3 className="font-medium mb-3">קיטים מוכנים</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {taskKits.map((kit) => (
                <div
                  key={kit.id}
                  onClick={() => handleSelectKit(kit.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedKit === kit.id
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{kit.name}</h4>
                    {selectedKit === kit.id && (
                      <Check className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{kit.description}</p>
                  <div className="text-xs text-gray-500">
                    {kit.tasks.length} משימות
                  </div>
                </div>
              ))}
            </div>

            {/* Show selected kit tasks */}
            {selectedKit && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">משימות בקיט:</h4>
                <ul className="space-y-2">
                  {taskKits.find(k => k.id === selectedKit)?.tasks.map((task, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">או</span>
            </div>
          </div>

          {/* Custom Tasks */}
          <div>
            <h3 className="font-medium mb-3">הוסף משימות ידנית</h3>
            <div className="space-y-2">
              {customTasks.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`משימה ${index + 1}`}
                    value={task}
                    onChange={(e) => handleCustomTaskChange(index, e.target.value)}
                    onFocus={() => setSelectedKit(null)}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomTask}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף משימה נוספת
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateTasks} className="prodify-gradient text-white">
              צור משימות
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

