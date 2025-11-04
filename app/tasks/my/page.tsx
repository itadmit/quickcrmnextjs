"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, CheckSquare, Clock, AlertCircle, CheckCircle2, Circle, CalendarDays, FolderKanban } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { NewTaskDialog } from "@/components/dialogs/NewTaskDialog"
import { CardSkeleton } from "@/components/skeletons/CardSkeleton"

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  assignee: { name: string } | null
  project: { name: string } | null
}

export default function MyTasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks?my=true')
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את המשימות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המשימות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      })

      if (response.ok) {
        toast({
          title: "משימה עודכנה",
          description: "סטטוס המשימה עודכן בהצלחה",
        })
        fetchTasks()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לעדכן את המשימה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון המשימה",
        variant: "destructive",
      })
    }
  }

  const priorityConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    URGENT: { label: "דחוף מאוד", color: "text-red-700", icon: AlertCircle, bg: "bg-red-50 border-red-200" },
    HIGH: { label: "גבוהה", color: "text-orange-700", icon: AlertCircle, bg: "bg-orange-50 border-orange-200" },
    NORMAL: { label: "רגילה", color: "text-blue-700", icon: Circle, bg: "bg-blue-50 border-blue-200" },
    LOW: { label: "נמוכה", color: "text-gray-700", icon: Circle, bg: "bg-gray-50 border-gray-200" },
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'ללא תאריך'
    const date = new Date(dueDate)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'היום'
    if (diffDays === 1) return 'מחר'
    if (diffDays < 0) return 'באיחור'
    return `בעוד ${diffDays} ימים`
  }

  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
  const todoTasks = tasks.filter(t => t.status === 'TODO')
  const doneTasks = tasks.filter(t => t.status === 'DONE')

  if (loading) {
    return (
      <AppLayout>
        <CardSkeleton />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">המשימות שלי</h1>
            <p className="text-gray-500 mt-1">ניהול המשימות האישיות שלך</p>
          </div>
          <NewTaskDialog onTaskCreated={fetchTasks} />
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין משימות עדיין</h3>
            <p className="text-gray-500 mb-4">התחל על ידי יצירת משימה חדשה</p>
            <NewTaskDialog onTaskCreated={fetchTasks} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* In Progress */}
            <Card className="shadow-sm">
              <CardHeader className="bg-cyan-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">בתהליך</CardTitle>
                  <span className="text-sm text-gray-600">{inProgressTasks.length} משימות</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {inProgressTasks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    אין משימות בתהליך
                  </div>
                ) : (
                  inProgressTasks.map((task) => {
                    const priority = priorityConfig[task.priority] || priorityConfig.NORMAL
                    const PriorityIcon = priority.icon
                    return (
                      <div 
                        key={task.id} 
                        className={`p-4 bg-white border-2 ${priority.bg} rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleTaskStatusChange(task.id, 'DONE')}
                            className="mt-0.5 w-5 h-5 rounded-full border-2 border-cyan-400 hover:bg-cyan-50 transition-colors flex items-center justify-center group-hover:border-cyan-600"
                          >
                            <CheckCircle2 className="w-3 h-3 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-2 leading-tight">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${priority.bg} ${priority.color}`}>
                                <PriorityIcon className="w-3 h-3" />
                                {priority.label}
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  {formatDueDate(task.dueDate)}
                                </div>
                              )}
                              {task.project && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <FolderKanban className="w-3 h-3" />
                                  {task.project.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* To Do */}
            <Card className="shadow-sm">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">לביצוע</CardTitle>
                  <span className="text-sm text-gray-600">{todoTasks.length} משימות</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {todoTasks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    אין משימות לביצוע
                  </div>
                ) : (
                  todoTasks.map((task) => {
                    const priority = priorityConfig[task.priority] || priorityConfig.NORMAL
                    const PriorityIcon = priority.icon
                    return (
                      <div 
                        key={task.id} 
                        className={`p-4 bg-white border-2 ${priority.bg} rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleTaskStatusChange(task.id, 'IN_PROGRESS')}
                            className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-2 leading-tight">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${priority.bg} ${priority.color}`}>
                                <PriorityIcon className="w-3 h-3" />
                                {priority.label}
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  {formatDueDate(task.dueDate)}
                                </div>
                              )}
                              {task.project && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <FolderKanban className="w-3 h-3" />
                                  {task.project.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Done */}
            <Card className="shadow-sm">
              <CardHeader className="bg-green-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">הושלם</CardTitle>
                  <span className="text-sm text-gray-600">{doneTasks.length} משימות</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {doneTasks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    אין משימות שהושלמו
                  </div>
                ) : (
                  doneTasks.map((task) => {
                    const priority = priorityConfig[task.priority] || priorityConfig.NORMAL
                    const PriorityIcon = priority.icon
                    return (
                      <div 
                        key={task.id} 
                        className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer group opacity-75"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleTaskStatusChange(task.id, 'IN_PROGRESS')}
                            className="mt-0.5 w-5 h-5 rounded-full bg-green-500 border-2 border-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-500 mb-2 line-through leading-tight">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-400 mb-3 line-clamp-2 line-through">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-gray-50 border-gray-200 text-gray-600`}>
                                <PriorityIcon className="w-3 h-3" />
                                {priority.label}
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {formatDueDate(task.dueDate)}
                                </div>
                              )}
                              {task.project && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <FolderKanban className="w-3 h-3" />
                                  {task.project.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
