"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Zap, UserPlus, CheckSquare, Calendar, Users, Mail, Bell, FileText, Tag, ArrowLeft } from "lucide-react"

interface NewAutomationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAutomationCreated: () => void
}

const triggers = [
  { value: 'lead_created', label: 'ליד חדש נוצר', icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'lead_status_changed', label: 'סטטוס ליד השתנה', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'task_created', label: 'משימה חדשה נוצרה', icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'task_completed', label: 'משימה הושלמה', icon: CheckSquare, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  { value: 'meeting_scheduled', label: 'פגישה נקבעה', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100' },
  { value: 'client_created', label: 'לקוח חדש נוצר', icon: Users, color: 'text-pink-600', bg: 'bg-pink-100' },
]

const actions = [
  { value: 'send_email', label: 'שלח אימייל', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'create_task', label: 'צור משימה', icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'send_notification', label: 'שלח התראה', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-100' },
  { value: 'add_tag', label: 'הוסף תגית', icon: Tag, color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'update_field', label: 'עדכן שדה', icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-100' },
]

export function NewAutomationDialog({ open, onOpenChange, onAutomationCreated }: NewAutomationDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: '',
    action: '',
    emailTemplate: '',
    taskTitle: '',
    notificationMessage: '',
    tagName: '',
  })

  const selectedTrigger = triggers.find(t => t.value === formData.trigger)
  const selectedAction = actions.find(a => a.value === formData.action)

  const handleSubmit = async () => {
    if (!formData.name || !formData.trigger || !formData.action) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          trigger: { type: formData.trigger },
          actions: { type: formData.action, config: getActionConfig() },
          isActive: true,
        }),
      })

      if (response.ok) {
        toast({
          title: "אוטומציה נוצרה",
          description: "האוטומציה נוצרה בהצלחה ופעילה",
        })
        onAutomationCreated()
        onOpenChange(false)
        resetForm()
      } else {
        throw new Error('Failed to create automation')
      }
    } catch (error) {
      console.error('Error creating automation:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור את האוטומציה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getActionConfig = () => {
    switch (formData.action) {
      case 'send_email':
        return { template: formData.emailTemplate }
      case 'create_task':
        return { title: formData.taskTitle }
      case 'send_notification':
        return { message: formData.notificationMessage }
      case 'add_tag':
        return { tag: formData.tagName }
      default:
        return {}
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger: '',
      action: '',
      emailTemplate: '',
      taskTitle: '',
      notificationMessage: '',
      tagName: '',
    })
    setStep(1)
  }

  const canProceedToStep2 = formData.name
  const canProceedFromStep2 = formData.trigger
  const canProceedToStep3 = formData.trigger && formData.action

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-600" />
            צור אוטומציה חדשה
          </DialogTitle>
          <DialogDescription>
            הגדר תהליך אוטומטי שירוץ כאשר אירוע מסוים מתרחש במערכת
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="text-sm font-medium">פרטים בסיסיים</span>
          </div>
          <ArrowLeft className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="text-sm font-medium">טריגר</span>
          </div>
          <ArrowLeft className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="text-sm font-medium">פעולה</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">שם האוטומציה *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="לדוגמה: שליחת אימייל לליד חדש"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תאר מה האוטומציה עושה"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Select Trigger */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold mb-3 block">מתי האוטומציה תרוץ?</Label>
                <p className="text-sm text-gray-500 mb-4">בחר את האירוע שיפעיל את האוטומציה</p>
                
                <div className="grid grid-cols-2 gap-3">
                  {triggers.map((trigger) => {
                    const Icon = trigger.icon
                    const isSelected = formData.trigger === trigger.value
                    return (
                      <button
                        key={trigger.value}
                        onClick={() => setFormData({ ...formData, trigger: trigger.value })}
                        className={`p-4 rounded-lg border-2 transition-all text-right hover:shadow-md ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${trigger.bg}`}>
                            <Icon className={`w-5 h-5 ${trigger.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{trigger.label}</div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                              <CheckSquare className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Action */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold mb-3 block">מה יקרה אז?</Label>
                <p className="text-sm text-gray-500 mb-4">בחר את הפעולה שתתבצע</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {actions.map((action) => {
                    const Icon = action.icon
                    const isSelected = formData.action === action.value
                    return (
                      <button
                        key={action.value}
                        onClick={() => setFormData({ ...formData, action: action.value })}
                        className={`p-4 rounded-lg border-2 transition-all text-right hover:shadow-md ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${action.bg}`}>
                            <Icon className={`w-5 h-5 ${action.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{action.label}</div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                              <CheckSquare className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Action Configuration */}
                {formData.action === 'send_email' && (
                  <div>
                    <Label htmlFor="emailTemplate">תבנית אימייל</Label>
                    <Textarea
                      id="emailTemplate"
                      value={formData.emailTemplate}
                      onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                      placeholder="שלום {name}, תודה שנרשמת..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                )}

                {formData.action === 'create_task' && (
                  <div>
                    <Label htmlFor="taskTitle">כותרת המשימה</Label>
                    <Input
                      id="taskTitle"
                      value={formData.taskTitle}
                      onChange={(e) => setFormData({ ...formData, taskTitle: e.target.value })}
                      placeholder="לדוגמה: צור קשר עם {name}"
                      className="mt-1"
                    />
                  </div>
                )}

                {formData.action === 'send_notification' && (
                  <div>
                    <Label htmlFor="notificationMessage">הודעת ההתראה</Label>
                    <Input
                      id="notificationMessage"
                      value={formData.notificationMessage}
                      onChange={(e) => setFormData({ ...formData, notificationMessage: e.target.value })}
                      placeholder="לדוגמה: ליד חדש: {name}"
                      className="mt-1"
                    />
                  </div>
                )}

                {formData.action === 'add_tag' && (
                  <div>
                    <Label htmlFor="tagName">שם התגית</Label>
                    <Input
                      id="tagName"
                      value={formData.tagName}
                      onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                      placeholder="לדוגמה: חם, מעניין, וכו'"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              {selectedTrigger && selectedAction && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="text-sm font-medium text-gray-700 mb-2">תצוגה מקדימה:</div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border">
                      {React.createElement(selectedTrigger.icon, { className: `w-4 h-4 ${selectedTrigger.color}` })}
                      <span>{selectedTrigger.label}</span>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border">
                      {React.createElement(selectedAction.icon, { className: `w-4 h-4 ${selectedAction.color}` })}
                      <span>{selectedAction.label}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                חזור
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
              disabled={loading}
            >
              ביטול
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !canProceedToStep2 : step === 2 ? !canProceedFromStep2 : false}
                className="prodify-gradient text-white"
              >
                המשך
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !canProceedToStep3}
                className="prodify-gradient text-white"
              >
                {loading ? "יוצר..." : "צור אוטומציה"}
                <Zap className="w-4 h-4 mr-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}