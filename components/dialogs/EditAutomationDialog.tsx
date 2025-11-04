"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Zap, ArrowLeft, UserPlus, CheckSquare, Calendar, User, Mail, FileText, Bell, Tag, Edit3 } from "lucide-react"

interface EditAutomationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  automation: any
  onSuccess: () => void
}

export function EditAutomationDialog({ open, onOpenChange, automation, onSuccess }: EditAutomationDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: '',
    action: '',
    // Action-specific params
    emailTemplateId: '',
    taskTitle: '',
    taskDescription: '',
    taskPriority: 'medium',
    notificationMessage: '',
    statusValue: '',
    tagName: '',
  })

  // Load automation data when dialog opens
  useEffect(() => {
    if (open && automation) {
      const trigger = automation.trigger as any
      const actions = automation.actions as any[]
      const firstAction = actions && actions.length > 0 ? actions[0] : null

      setFormData({
        name: automation.name || '',
        description: automation.description || '',
        trigger: typeof trigger === 'object' ? trigger.type : trigger,
        action: firstAction?.type || '',
        emailTemplateId: firstAction?.params?.emailTemplateId || '',
        taskTitle: firstAction?.params?.taskTitle || '',
        taskDescription: firstAction?.params?.taskDescription || '',
        taskPriority: firstAction?.params?.taskPriority || 'medium',
        notificationMessage: firstAction?.params?.notificationMessage || '',
        statusValue: firstAction?.params?.statusValue || '',
        tagName: firstAction?.params?.tagName || '',
      })
      setStep(1)
    }
  }, [open, automation])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Build action params based on action type
      let actionParams: any = {}
      
      switch (formData.action) {
        case 'send_email':
          actionParams = { emailTemplateId: formData.emailTemplateId }
          break
        case 'create_task':
          actionParams = {
            taskTitle: formData.taskTitle,
            taskDescription: formData.taskDescription,
            taskPriority: formData.taskPriority,
          }
          break
        case 'send_notification':
          actionParams = { notificationMessage: formData.notificationMessage }
          break
        case 'update_status':
          actionParams = { statusValue: formData.statusValue }
          break
        case 'add_tag':
          actionParams = { tagName: formData.tagName }
          break
      }

      const response = await fetch(`/api/automations/${automation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          trigger: { type: formData.trigger },
          action: {
            type: formData.action,
            params: actionParams,
          },
        }),
      })

      if (response.ok) {
        toast({
          title: "אוטומציה עודכנה",
          description: "האוטומציה עודכנה בהצלחה",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error('Failed to update automation')
      }
    } catch (error) {
      console.error('Error updating automation:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את האוטומציה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
            ערוך אוטומציה
          </DialogTitle>
          <DialogDescription>
            ערוך תהליך אוטומטי שירוץ כאשר אירוע מסוים מתרחש במערכת
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 my-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className={step >= 1 ? 'font-semibold' : 'text-gray-500'}>פרטים בסיסיים</span>
          </div>
          
          <div className="w-12 h-0.5 bg-gray-300" />
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className={step >= 2 ? 'font-semibold' : 'text-gray-500'}>טריגר</span>
          </div>
          
          <div className="w-12 h-0.5 bg-gray-300" />
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className={step >= 3 ? 'font-semibold' : 'text-gray-500'}>פעולה</span>
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
                  placeholder="למשל: ברוכים הבאים ללידים חדשים"
                />
              </div>

              <div>
                <Label htmlFor="description">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תאר מה האוטומציה עושה..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Trigger */}
          {step === 2 && (
            <div className="space-y-4">
              <Label>מתי האוטומציה תרוץ? בחר את האירוע שמפעיל אותה</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'lead_created', label: 'ליד חדש נוצר', icon: UserPlus, desc: 'כאשר ליד חדש נוסף למערכת' },
                  { value: 'lead_status_changed', label: 'סטטוס ליד השתנה', icon: Edit3, desc: 'כאשר הליד עבר לשלב אחר' },
                  { value: 'task_completed', label: 'משימה הושלמה', icon: CheckSquare, desc: 'כאשר משימה סומנה כבוצעה' },
                  { value: 'task_created', label: 'משימה חדשה נוצרה', icon: FileText, desc: 'כאשר נוצרה משימה חדשה' },
                  { value: 'meeting_scheduled', label: 'פגישה נקבעה', icon: Calendar, desc: 'כאשר נקבעה פגישה חדשה' },
                  { value: 'client_added', label: 'לקוח חדש נוסף', icon: User, desc: 'כאשר נוסף לקוח חדש' },
                ].map((trigger) => {
                  const Icon = trigger.icon
                  const isSelected = formData.trigger === trigger.value
                  return (
                    <button
                      key={trigger.value}
                      onClick={() => setFormData({ ...formData, trigger: trigger.value })}
                      className={`p-4 border-2 rounded-lg text-right transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="font-semibold">{trigger.label}</div>
                          <div className="text-sm text-gray-600">{trigger.desc}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Action */}
          {step === 3 && (
            <div className="space-y-4">
              <Label>מה האוטומציה תעשה? בחר את הפעולה</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'send_email', label: 'שלח אימייל', icon: Mail, desc: 'שלח אימייל אוטומטי' },
                  { value: 'create_task', label: 'צור משימה', icon: CheckSquare, desc: 'צור משימה חדשה' },
                  { value: 'send_notification', label: 'שלח התראה', icon: Bell, desc: 'שלח התראה למשתמש' },
                  { value: 'update_status', label: 'עדכן סטטוס', icon: Edit3, desc: 'עדכן סטטוס של הישות' },
                  { value: 'add_tag', label: 'הוסף תג', icon: Tag, desc: 'הוסף תג לליד' },
                ].map((action) => {
                  const Icon = action.icon
                  const isSelected = formData.action === action.value
                  return (
                    <button
                      key={action.value}
                      onClick={() => setFormData({ ...formData, action: action.value })}
                      className={`p-4 border-2 rounded-lg text-right transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="font-semibold">{action.label}</div>
                          <div className="text-sm text-gray-600">{action.desc}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Action-specific fields */}
              {formData.action === 'send_email' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <Label htmlFor="emailTemplateId">תבנית אימייל</Label>
                  <Input
                    id="emailTemplateId"
                    value={formData.emailTemplateId}
                    onChange={(e) => setFormData({ ...formData, emailTemplateId: e.target.value })}
                    placeholder="ID של תבנית האימייל"
                  />
                </div>
              )}

              {formData.action === 'create_task' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <Label htmlFor="taskTitle">כותרת המשימה</Label>
                    <Input
                      id="taskTitle"
                      value={formData.taskTitle}
                      onChange={(e) => setFormData({ ...formData, taskTitle: e.target.value })}
                      placeholder="למשל: עקוב אחרי {{name}}"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ניתן להשתמש במשתנים: {`{{name}}, {{email}}, {{phone}}`}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="taskDescription">תיאור המשימה</Label>
                    <Textarea
                      id="taskDescription"
                      value={formData.taskDescription}
                      onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                      placeholder="תיאור המשימה..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="taskPriority">עדיפות</Label>
                    <select
                      id="taskPriority"
                      value={formData.taskPriority}
                      onChange={(e) => setFormData({ ...formData, taskPriority: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="low">נמוכה</option>
                      <option value="medium">בינונית</option>
                      <option value="high">גבוהה</option>
                    </select>
                  </div>
                </div>
              )}

              {formData.action === 'send_notification' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <Label htmlFor="notificationMessage">הודעת ההתראה</Label>
                  <Textarea
                    id="notificationMessage"
                    value={formData.notificationMessage}
                    onChange={(e) => setFormData({ ...formData, notificationMessage: e.target.value })}
                    placeholder="למשל: ליד חדש נוצר: {{name}}"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ניתן להשתמש במשתנים: {`{{name}}, {{email}}, {{phone}}`}
                  </p>
                </div>
              )}

              {formData.action === 'update_status' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <Label htmlFor="statusValue">סטטוס חדש</Label>
                  <Input
                    id="statusValue"
                    value={formData.statusValue}
                    onChange={(e) => setFormData({ ...formData, statusValue: e.target.value })}
                    placeholder="למשל: CONTACTED"
                  />
                </div>
              )}

              {formData.action === 'add_tag' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <Label htmlFor="tagName">שם התג</Label>
                  <Input
                    id="tagName"
                    value={formData.tagName}
                    onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                    placeholder="למשל: VIP"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
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
                {loading ? "שומר..." : "שמור שינויים"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

