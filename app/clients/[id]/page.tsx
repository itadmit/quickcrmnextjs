"use client"

import { useState, useEffect, useRef } from "react"
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd"
import { HTML5Backend, getEmptyImage } from "react-dnd-html5-backend"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TaskKitDialog } from "@/components/dialogs/TaskKitDialog"
import { Invoice4UDialog } from "@/components/dialogs/Invoice4UDialog"
import { NewPaymentDialog } from "@/components/dialogs/NewPaymentDialog"
import { AssignTaskDialog } from "@/components/dialogs/AssignTaskDialog"
import { useToast } from "@/components/ui/use-toast"
import { 
  ArrowRight, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building,
  Edit,
  Trash,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Paperclip,
  MessageSquare,
  FolderKanban,
  Coins,
  TrendingUp,
  FileText,
  GripVertical,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  notes: string | null
  signature: string | null
  owner: { name: string } | null
  projects: Array<{
    id: string
    name: string
    status: string
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate: string | null
    }>
    payments: Array<{
      id: string
      amount: number
      status: string
      method: string
      transactionId: string | null
      paymentReference: string | null
      description: string | null
      paidAt: string | null
      createdAt: string
      quote: {
        id: string
        quoteNumber: string
        title: string
        total: number
      } | null
    }>
  }>
  directPayments?: Array<{
    id: string
    amount: number
    status: string
    method: string
    transactionId: string | null
    paymentReference: string | null
    description: string | null
    paidAt: string | null
    createdAt: string
    project: {
      id: string | null
      name: string
    }
    quote: {
      id: string
      quoteNumber: string
      title: string
    } | null
  }>
  budgets: Array<{
    id: string
    name: string
    amount: number
    status: string
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    position: number
    project: { name: string } | null
    assignee: { id: string; name: string } | null
  }>
  files?: Array<{
    id: string
    name: string
    path: string
    size: number
    mimeType: string | null
    createdAt: string
    entityType: string
    entityId: string
  }>
  createdAt: string
}

// Custom Drag Layer - מציג את המשימה הנגררת
const CustomDragLayer = ({ tasks }: { tasks: Client['tasks'] }) => {
  const { itemType, isDragging, item, initialOffset, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }))

  if (!isDragging || itemType !== 'task') {
    return null
  }

  const draggedTask = tasks.find(t => t.id === item.id)
  if (!draggedTask) return null

  if (!initialOffset || !currentOffset) {
    return null
  }

  const x = currentOffset.x - 128 // מקזזים חצי רוחב (256/2)
  const y = currentOffset.y - 48 // מקזזים חצי גובה (96/2)

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="rotate-2 opacity-95">
        <Card className="shadow-2xl bg-white border-2 border-purple-400 w-64">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm text-gray-900">{draggedTask.title}</h4>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  {draggedTask.project && (
                    <div>פרויקט: {draggedTask.project.name}</div>
                  )}
                  {draggedTask.assignee && (
                    <div>אחראי: {draggedTask.assignee.name}</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Task Card Component with Drag
const TaskCard = ({ task, onStatusChange, onTaskAssigned, onDeleteTask }: { task: Client['tasks'][0], onStatusChange: (taskId: string, newStatus: string) => void, onTaskAssigned?: () => void, onDeleteTask?: (taskId: string) => void }) => {
  // בדיקה שהאובייקט task תקין
  if (!task || !task.id || typeof task !== 'object') {
    console.error('Invalid task object:', task)
    return null
  }

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'task',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // השתמשת ב-empty image כדי שהדפדפן לא יציג preview ברירת מחדל
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])

  const isDone = task.status === 'DONE'

  return (
    <div
      ref={drag}
      className={`cursor-move transition-all duration-200 ${
        isDragging 
          ? 'opacity-30' 
          : 'opacity-100 hover:shadow-md'
      }`}
    >
      <Card className={`shadow-sm bg-white transition-all ${
        isDragging 
          ? 'border-2 border-purple-400 shadow-lg' 
          : 'border border-gray-200'
      }`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <GripVertical className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              isDragging ? 'text-purple-500' : 'text-gray-400'
            }`} />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className={`font-medium text-sm ${isDone ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.title}</h4>
                {isDone && onDeleteTask ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteTask(task.id)
                    }}
                    className="p-1.5 rounded-lg bg-red-50 border-2 border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors flex items-center justify-center text-red-600"
                    title="מחק משימה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <AssignTaskDialog
                    taskId={task.id}
                    taskTitle={task.title}
                    currentAssigneeId={task.assignee?.id || null}
                    currentAssigneeName={task.assignee?.name || null}
                    onTaskAssigned={onTaskAssigned}
                  />
                )}
              </div>
              <div className={`space-y-1 text-xs ${isDone ? 'text-gray-400' : 'text-gray-600'}`}>
                {task.project && (
                  <div>פרויקט: {task.project.name}</div>
                )}
                {task.assignee && (
                  <div>אחראי: {task.assignee.name}</div>
                )}
                {task.dueDate && (
                  <div>יעד: {new Date(task.dueDate).toLocaleDateString('he-IL')}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Task Drop Zone Component (לפני כל משימה)
const TaskDropZone = ({ 
  onDrop, 
  taskIndex,
  onHover
}: { 
  onDrop: (taskId: string, newPosition: number) => void
  taskIndex: number
  onHover?: (index: number | null) => void
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'task',
    drop: (item: { id: string }) => {
      onDrop(item.id, taskIndex)
      onHover?.(null)
    },
    hover: (item, monitor) => {
      if (monitor.isOver({ shallow: true })) {
        onHover?.(taskIndex)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  return (
    <div
      ref={drop}
      className={`transition-all duration-300 ease-in-out ${
        isOver 
          ? 'h-12 bg-purple-100 border-2 border-dashed border-purple-400 rounded-lg my-2' 
          : 'h-1 bg-transparent'
      }`}
      onMouseLeave={() => {
        if (!isOver) {
          onHover?.(null)
        }
      }}
    >
      {isOver && (
        <div className="flex items-center justify-center h-full">
          <div className="text-purple-600 text-sm font-medium">שחרר כאן</div>
        </div>
      )}
    </div>
  )
}

// Task Column Component with Drop
const TaskColumn = ({ 
  status, 
  tasks, 
  onDrop, 
  onReorder,
  statusLabel,
  onTaskAssigned,
  onDeleteTask
}: { 
  status: string
  tasks: Client['tasks']
  onDrop: (taskId: string, newStatus: string) => void
  onReorder: (taskId: string, newPosition: number, status: string) => void
  statusLabel: string
  onTaskAssigned?: () => void
  onDeleteTask?: (taskId: string) => void
}) => {
  const [hoveredDropZone, setHoveredDropZone] = useState<number | null>(null)
  
  const [{ isOver }, drop] = useDrop({
    accept: 'task',
    drop: (item: { id: string, status: string }) => {
      if (item.status !== status) {
        onDrop(item.id, status)
      }
      setHoveredDropZone(null)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  // Reset hover כאשר לא נגרר יותר
  useEffect(() => {
    if (!isOver && hoveredDropZone !== null) {
      const timer = setTimeout(() => {
        setHoveredDropZone(null)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOver, hoveredDropZone])

  // ודא ש-tasks הוא מערך
  if (!Array.isArray(tasks)) {
    console.error('Tasks is not an array in TaskColumn:', tasks, typeof tasks)
    return (
      <div className="h-full">
        <Card className="shadow-sm bg-gray-50 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{statusLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-400 py-8 text-sm">שגיאה בטעינת משימות</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredTasks = tasks
    .filter(t => t && typeof t === 'object' && t.id && t.status === status)
    .map(t => {
      // ודא שהאובייקט תקין
      if (!t.id || !t.title) {
        console.error('Invalid task object:', t)
        return null
      }
      return t
    })
    .filter(Boolean) as Client['tasks']

  // מיון לפי position
  const sortedTasks = [...filteredTasks].sort((a, b) => (a.position || 0) - (b.position || 0))

  return (
    <div ref={drop} className="h-full">
      <Card className={`shadow-sm h-full transition-all duration-200 ${
        isOver 
          ? 'bg-purple-50 border-2 border-purple-400 border-dashed' 
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-base ${isOver ? 'text-purple-700' : ''}`}>
              {statusLabel}
            </CardTitle>
            <span className="text-sm text-gray-500">{Array.isArray(sortedTasks) ? sortedTasks.length : 0}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 min-h-[200px]">
          {isOver && sortedTasks.length === 0 && (
            <div className="text-center text-purple-600 py-8 text-sm font-medium border-2 border-purple-300 border-dashed rounded-lg bg-purple-50">
              שחרר כאן כדי להעביר
            </div>
          )}
          {!isOver && (!sortedTasks || sortedTasks.length === 0) ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              אין משימות
            </div>
          ) : (
            Array.isArray(sortedTasks) ? sortedTasks.map((task, index) => {
              if (!task || typeof task !== 'object' || !task.id) {
                console.error('Invalid task in sortedTasks:', task)
                return null
              }
              // אם יש drop zone פעיל לפני המשימה הזו (index > hoveredDropZone), המשימה תדחף למטה
              // אם drop zone הוא בדיוק ב-index הזה, לא נדחוף (כי המשימה תיכנס שם)
              const shouldPushDown = hoveredDropZone !== null && index > hoveredDropZone
              return (
                <div key={task.id} className="transition-all duration-300 ease-in-out">
                  <TaskDropZone 
                    onDrop={(taskId, newPosition) => onReorder(taskId, newPosition, status)} 
                    taskIndex={index}
                    onHover={setHoveredDropZone}
                  />
                  <div 
                    className={`py-1.5 transition-all duration-300 ease-in-out ${
                      shouldPushDown ? 'translate-y-14' : 'translate-y-0'
                    }`}
                  >
                    <TaskCard task={task} onStatusChange={onDrop} onTaskAssigned={onTaskAssigned} onDeleteTask={onDeleteTask} />
                  </div>
                </div>
              )
            }).filter(Boolean) : null
          )}
          {/* Drop zone בסוף */}
          {sortedTasks.length > 0 && (
            <TaskDropZone 
              onDrop={(taskId, newPosition) => onReorder(taskId, newPosition, status)} 
              taskIndex={sortedTasks.length}
              onHover={setHoveredDropZone}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ClientDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "tasks" | "payments" | "files" | "timeline">("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState<string>("")

  useEffect(() => {
    fetchClient()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("entityType", "client")
        formData.append("entityId", params.id as string)
        formData.append("clientId", params.id as string)

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to upload file")
        }
      }

      toast({
        title: "הקובץ הועלה בהצלחה",
        description: "הקובץ נוסף לקבצים",
      })

      // רענון נתוני הלקוח
      await fetchClient()
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "שגיאה בהעלאת קובץ",
        description: "לא הצלחנו להעלות את הקובץ",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      // איפוס ה-input
      e.target.value = ""
    }
  }

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        // ודא ש-tasks הוא מערך וכל task הוא אובייקט תקין
        if (data) {
          if (!Array.isArray(data.tasks)) {
            console.error('Tasks is not an array from API:', data.tasks, typeof data.tasks)
            data.tasks = []
          } else {
            // ודא שכל task הוא אובייקט תקין
            data.tasks = data.tasks
              .filter(t => 
                t && 
                typeof t === 'object' && 
                t.id && 
                t.title &&
                t.status &&
                t.priority &&
                (t.dueDate === null || typeof t.dueDate === 'string')
              )
              .map(t => ({
                ...t,
                position: typeof t.position === 'number' ? t.position : 0
              }))
          }
        }
        setClient(data)
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את פרטי הלקוח",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching client:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת פרטי הלקוח",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTasksCreated = async (taskTitles: string[]) => {
    if (!taskTitles || taskTitles.length === 0) {
      toast({
        title: "שגיאה",
        description: "לא נבחרו משימות",
        variant: "destructive",
      })
      return
    }

    if (!client) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון פרטי לקוח",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      // מחפש פרויקט קיים של הלקוח (אם יש)
      let projectId: string | undefined = undefined
      if (client.projects && client.projects.length > 0) {
        // לוקח את הפרויקט האחרון או הראשון
        projectId = client.projects[0].id
      }

      // יוצר את כל המשימות
      const createdTasks = []
      for (const title of taskTitles) {
        if (!title.trim()) continue // דילוג על משימות ריקות
        
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: null,
            clientId: client.id,
            projectId: projectId || null,
            priority: 'NORMAL',
            status: 'TODO',
            skipEmail: true, // לא לשלוח מיילים בעת טעינת תבנית
          }),
        })

        if (response.ok) {
          const task = await response.json()
          createdTasks.push(task)
        } else {
          console.error(`Failed to create task: ${title}`)
        }
      }

      if (createdTasks.length > 0) {
        toast({
          title: "המשימות נוצרו בהצלחה!",
          description: `${createdTasks.length} משימות חדשות נוספו${projectId ? ' לפרויקט' : ' ללקוח'}`,
        })
        // רענון נתוני הלקוח
        await fetchClient()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן היה ליצור את המשימות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating tasks:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת המשימות",
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
        }),
      })

      if (response.ok) {
        // עדכון מקומי של הסטטוס
        if (client) {
          setClient({
            ...client,
            tasks: client.tasks.map(task =>
              task.id === taskId ? { ...task, status: newStatus } : task
            ),
          })
        }
      } else {
        throw new Error('Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן היה לעדכן את סטטוס המשימה",
        variant: "destructive",
      })
      // רענון נתונים במקרה של שגיאה
      await fetchClient()
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "משימה נמחקה",
          description: "המשימה נמחקה בהצלחה",
        })
        // רענון נתוני הלקוח
        await fetchClient()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את המשימה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המשימה",
        variant: "destructive",
      })
    }
  }

  const handleTaskReorder = async (taskId: string, newPosition: number, status: string) => {
    if (!client) return

    try {
      // מציאת המשימה הנגררת
      const draggedTask = client.tasks.find(t => t.id === taskId)
      if (!draggedTask) return

      // אם המשימה לא באותו סטטוס, נשנה את הסטטוס קודם
      if (draggedTask.status !== status) {
        await handleTaskStatusChange(taskId, status)
        // רענון נתונים אחרי שינוי סטטוס
        await fetchClient()
        return
      }

      // קבלת כל המשימות באותו סטטוס, ממוינות לפי position
      const tasksInStatus = client.tasks
        .filter(t => t.status === status && t.id !== taskId)
        .sort((a, b) => (a.position || 0) - (b.position || 0))

      // חישוב position חדש - נשתמש במספרים עוקבים
      const newPositions: Array<{ id: string; position: number }> = []
      
      // הוספת המשימות לפני המיקום החדש
      for (let i = 0; i < newPosition; i++) {
        if (tasksInStatus[i]) {
          newPositions.push({ id: tasksInStatus[i].id, position: i })
        }
      }
      
      // הוספת המשימה הנגררת במיקום החדש
      newPositions.push({ id: taskId, position: newPosition })
      
      // הוספת המשימות אחרי המיקום החדש
      for (let i = newPosition; i < tasksInStatus.length; i++) {
        if (tasksInStatus[i]) {
          newPositions.push({ id: tasksInStatus[i].id, position: i + 1 })
        }
      }

      // עדכון כל המשימות
      await Promise.all(
        newPositions.map(({ id, position }) =>
          fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              position,
            }),
          })
        )
      )

      // עדכון מקומי
      await fetchClient()
    } catch (error) {
      console.error('Error reordering tasks:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן היה לשנות את סדר המשימות",
        variant: "destructive",
      })
      await fetchClient()
    }
  }

  const handleEditProjectName = async (projectId: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "שגיאה",
        description: "שם הפרויקט לא יכול להיות ריק",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "שם הפרויקט עודכן בהצלחה",
        })
        setEditingProjectId(null)
        // רענון נתוני הלקוח
        await fetchClient()
      } else {
        throw new Error('Failed to update project')
      }
    } catch (error) {
      console.error('Error updating project name:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן היה לעדכן את שם הפרויקט",
        variant: "destructive",
      })
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    // אישור לפני מחיקה
    if (!confirm('האם אתה בטוח שברצונך למחוק את התשלום הזה?')) {
      return
    }

    try {
      setDeletingPaymentId(paymentId)
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: "התשלום נמחק בהצלחה",
        })
        // רענון נתוני הלקוח
        await fetchClient()
      } else {
        const error = await res.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן למחוק את התשלום",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת התשלום",
        variant: "destructive",
      })
    } finally {
      setDeletingPaymentId(null)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען פרטי לקוח...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">לקוח לא נמצא</h3>
          <Link href="/clients">
            <Button variant="outline">חזרה ללקוחות</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const projects = client.projects.map(project => ({
    ...project,
    progress: project.tasks.length > 0 
      ? Math.round((project.tasks.filter(t => t.status === 'DONE').length / project.tasks.length) * 100)
      : 0,
    tasksCount: project.tasks.length,
    completedTasks: project.tasks.filter(t => t.status === 'DONE').length,
  }))

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">לקוח לא נמצא</h3>
          <Link href="/clients">
            <Button variant="outline">חזרה ללקוחות</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const budgets = Array.isArray(client?.budgets) ? client.budgets : []
  const tasks = Array.isArray(client?.tasks) ? client.tasks.filter(t => t && typeof t === 'object' && t.id) : []
  
  // איסוף כל התשלומים מכל הפרויקטים + תשלומים ישירים
  const projectPayments = client.projects.flatMap(project => 
    (project.payments || []).map(payment => ({
      ...payment,
      project: {
        id: project.id,
        name: project.name,
      },
    }))
  )
  
  const directPayments = (client.directPayments || []).map(payment => ({
    ...payment,
    project: payment.project || { id: null, name: "תשלום ישיר" },
  }))
  
  const allPayments = [...projectPayments, ...directPayments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  const completedPayments = allPayments.filter(p => p.status === "COMPLETED")
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  
  // חישוב יתרה לכל הצעה
  // קיבוץ תשלומים לפי הצעה
  const paymentsByQuote = new Map<string, { quote: any, payments: typeof allPayments }>()
  
  allPayments.forEach(payment => {
    if (payment.quote) {
      const quoteId = payment.quote.id
      if (!paymentsByQuote.has(quoteId)) {
        paymentsByQuote.set(quoteId, {
          quote: payment.quote,
          payments: []
        })
      }
      paymentsByQuote.get(quoteId)!.payments.push(payment)
    }
  })
  
  // חישוב יתרה לכל הצעה
  const quoteBalances = Array.from(paymentsByQuote.values()).map(({ quote, payments }) => {
    const quoteTotal = quote.total || 0
    const paidForQuote = payments
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0)
    const balance = quoteTotal - paidForQuote
    
    return {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      quoteTotal,
      paidForQuote,
      balance
    }
  })
  
  // חישוב יתרה כוללת
  // כולל סכום כל ההצעות שיש להן תשלומים
  const totalQuoteAmount = quoteBalances.length > 0 
    ? quoteBalances.reduce((sum, q) => sum + q.quoteTotal, 0)
    : 0
  
  // סכום כולל של כל התשלומים (כולל תשלומים ישירים ופרויקטים)
  const totalPaidForQuotes = quoteBalances.length > 0
    ? quoteBalances.reduce((sum, q) => sum + q.paidForQuote, 0)
    : totalPaid
  
  // חישוב יתרה - אם יש הצעות, נחשב לפי ההצעות, אחרת 0
  const totalBalance = totalQuoteAmount > 0 ? totalQuoteAmount - totalPaidForQuotes : 0
  
  // אם אין תשלומים כלל, לא נציג את כרטיס הסיכום
  const hasAnyPayments = allPayments.length > 0
  
  // יצירת ציר זמן מתאריכים אמיתיים
  const timeline = [
    ...(client.createdAt ? [{
      id: 'client-created',
      type: 'created' as const,
      title: 'לקוח נוצר',
      description: 'הלקוח נוסף למערכת',
      date: new Date(client.createdAt).toLocaleDateString('he-IL'),
      user: 'מערכת'
    }] : []),
    ...allPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      type: 'payment' as const,
      title: `תשלום ${payment.status === 'COMPLETED' ? 'הושלם' : payment.status === 'PENDING' ? 'ממתין' : payment.status}`,
      description: payment.description || `תשלום בסך ₪${payment.amount.toLocaleString('he-IL')}${payment.quote ? ` עבור הצעה ${payment.quote.quoteNumber}` : ''}`,
      date: new Date(payment.createdAt).toLocaleDateString('he-IL'),
      user: 'מערכת',
      payment: payment,
    })),
  ].sort((a, b) => {
    const dateA = a.type === 'created' ? new Date(client.createdAt || 0) : new Date(a.payment?.createdAt || 0)
    const dateB = b.type === 'created' ? new Date(client.createdAt || 0) : new Date(b.payment?.createdAt || 0)
    return dateB.getTime() - dateA.getTime()
  })

  const statusColors: Record<string, string> = {
    PLANNING: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const statusLabels: Record<string, string> = {
    PLANNING: "תכנון",
    IN_PROGRESS: "בביצוע",
    ON_HOLD: "בהמתנה",
    COMPLETED: "הושלם",
    CANCELLED: "בוטל",
  }

  const taskStatusColors: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
  }

  const budgetStatusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-green-100 text-green-800",
    OVERDUE: "bg-red-100 text-red-800",
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/clients" className="hover:text-gray-700">לקוחות</Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-gray-900">{client.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {client.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Invoice4UDialog clientId={client.id} clientName={client.name} />
            <Button variant="outline">
              <Send className="w-4 h-4 ml-2" />
              שלח מייל
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="w-4 h-4 ml-2" />
              ערוך
            </Button>
            <Link href={`/projects/new?clientId=${client.id}`}>
              <Button className="prodify-gradient text-white">
                <Plus className="w-4 h-4 ml-2" />
                פרויקט חדש
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">פרויקטים פעילים</div>
                  <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
                </div>
                <FolderKanban className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">משימות פתוחות</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {Array.isArray(tasks) ? tasks.filter(t => t && t.status !== "DONE").length : 0}
                  </div>
                </div>
                <CheckCircle2 className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">תשלומים</div>
                  <div className="text-2xl font-bold text-green-600">
                    ₪{totalPaid.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {completedPayments.length} תשלומים הושלמו
                  </div>
                </div>
                <Coins className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">התקדמות ממוצעת</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)}%
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {[
              { key: "overview", label: "סקירה" },
              { key: "projects", label: "פרויקטים" },
              { key: "tasks", label: "משימות" },
              { key: "payments", label: "תשלומים" },
              { key: "files", label: "קבצים" },
              { key: "timeline", label: "ציר זמן" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-600 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>פרטי לקוח</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>שם החברה</Label>
                        <Input value={client.name || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div>
                        <Label>אימייל</Label>
                        <Input value={client.email || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div>
                        <Label>טלפון</Label>
                        <Input value={client.phone || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div className="col-span-2">
                        <Label>כתובת</Label>
                        <Input value={client.address || ""} disabled={!isEditing} className="mt-1" />
                      </div>
                      <div className="col-span-2">
                        <Label>הערות</Label>
                        <textarea 
                          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={client.notes || ""}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Button>שמור שינויים</Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>ביטול</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>סיכום פרויקטים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {projects.slice(0, 2).map((project) => (
                        <div key={project.id} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{project.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                              {statusLabels[project.status]}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">התקדמות</span>
                              <span className="font-medium">{project.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all" 
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>{project.completedTasks}/{project.tasksCount} משימות</span>
                              <span>{(project.budget / 1000).toFixed(0)}K ₪</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>פרויקטים ({projects.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "פרויקט נוצר!",
                            description: "פרויקט חדש נוצר בהצלחה. עכשיו תוכל להוסיף משימות",
                          })
                          setActiveTab("tasks")
                        }}
                      >
                        + פרויקט מהיר
                      </Button>
                      <Button size="sm" className="prodify-gradient text-white">
                        + פרויקט מלא
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div key={project.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 flex items-center gap-2">
                            {editingProjectId === project.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editingProjectName}
                                  onChange={(e) => setEditingProjectName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditProjectName(project.id, editingProjectName)
                                    } else if (e.key === 'Escape') {
                                      setEditingProjectId(null)
                                      setEditingProjectName("")
                                    }
                                  }}
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditProjectName(project.id, editingProjectName)}
                                >
                                  שמור
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingProjectId(null)
                                    setEditingProjectName("")
                                  }}
                                >
                                  ביטול
                                </Button>
                              </div>
                            ) : (
                              <>
                                <h3 className="font-medium text-gray-900">{project.name}</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingProjectId(project.id)
                                    setEditingProjectName(project.name)
                                  }}
                                  title="ערוך שם פרויקט"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                            {statusLabels[project.status]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">תאריך התחלה:</span>
                            <span className="mr-2 font-medium">{project.startDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">תאריך סיום:</span>
                            <span className="mr-2 font-medium">{project.endDate}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">התקדמות</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{project.completedTasks}/{project.tasksCount} משימות הושלמו</span>
                            <span className="font-medium text-green-600">{(project.budget / 1000).toFixed(0)}K ₪</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks Tab - Kanban Style with Drag and Drop */}
            {activeTab === "tasks" && (
              <DndProvider backend={HTML5Backend}>
                <CustomDragLayer tasks={tasks} />
                <div className="mb-4 flex justify-end">
                  <TaskKitDialog 
                    clientId={client.id} 
                    onTasksCreated={handleTasksCreated}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <TaskColumn
                    status="TODO"
                    tasks={tasks}
                    onDrop={handleTaskStatusChange}
                    onReorder={handleTaskReorder}
                    statusLabel="לביצוע"
                    onTaskAssigned={fetchClient}
                    onDeleteTask={handleDeleteTask}
                  />
                  <TaskColumn
                    status="IN_PROGRESS"
                    tasks={tasks}
                    onDrop={handleTaskStatusChange}
                    onReorder={handleTaskReorder}
                    statusLabel="בתהליך"
                    onTaskAssigned={fetchClient}
                    onDeleteTask={handleDeleteTask}
                  />
                  <TaskColumn
                    status="DONE"
                    tasks={tasks}
                    onDrop={handleTaskStatusChange}
                    onReorder={handleTaskReorder}
                    statusLabel="הושלם"
                    onTaskAssigned={fetchClient}
                    onDeleteTask={handleDeleteTask}
                  />
                </div>
              </DndProvider>
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <>
                {/* סיכום תשלומים */}
                {hasAnyPayments && (
                  <Card className="shadow-sm mb-6">
                    <CardHeader>
                      <CardTitle>סיכום תשלומים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">סכום כל הפרויקט</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {totalQuoteAmount > 0 
                              ? `₪${totalQuoteAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
                              : <span className="text-gray-400">₪0.00</span>
                            }
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">שולם מקדמה</div>
                          <div className="text-2xl font-bold text-green-600">
                            ₪{totalPaidForQuotes.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">יתרה לתשלום</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {totalBalance > 0 ? (
                              `₪${totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-green-600">שולם במלואו</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>תשלומים ({allPayments.length})</CardTitle>
                      <NewPaymentDialog
                        clientId={client.id}
                        triggerButton={
                          <Button size="sm" className="prodify-gradient text-white border-0">
                            <Plus className="w-4 h-4 ml-2" />
                            תשלום חדש
                          </Button>
                        }
                        onPaymentCreated={() => {
                          fetchClient()
                          toast({
                            title: "תשלום נוצר",
                            description: "התשלום נוסף בהצלחה",
                          })
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                  {allPayments.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>אין תשלומים להצגה</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allPayments.map((payment) => {
                        // מציאת היתרה להצעה הזו (אם יש)
                        const quoteBalance = payment.quote 
                          ? quoteBalances.find(b => b.quoteId === payment.quote.id)
                          : null
                        
                        return (
                        <div key={payment.id} className="pr-3 pl-2 py-4 border rounded-lg hover:bg-gray-50 relative">
                          {/* כפתור מחיקה - שמאל למעלה (ימין למעלה ב-RTL) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletePayment(payment.id)}
                            disabled={deletingPaymentId === payment.id}
                            title="מחק תשלום"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                          
                          <div className="flex items-center justify-between mb-2 pr-10">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {payment.description || `תשלום #${payment.transactionId || payment.id.slice(-6)}`}
                              </h4>
                              <div className="text-sm text-gray-600 mt-1">
                                {payment.project.name}
                                {payment.quote && ` • הצעה ${payment.quote.quoteNumber}`}
                              </div>
                              {quoteBalance && (
                                <div className="text-xs text-gray-500 mt-1">
                                  סכום הצעה: ₪{quoteBalance.quoteTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(payment.createdAt).toLocaleDateString('he-IL', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {payment.paidAt && (
                                  <span> • שולם ב-{new Date(payment.paidAt).toLocaleDateString('he-IL')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-lg font-bold text-green-600">
                                ₪{payment.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                payment.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {payment.status === 'COMPLETED' ? 'הושלם' :
                                 payment.status === 'PENDING' ? 'ממתין' :
                                 payment.status === 'PROCESSING' ? 'מעבד' :
                                 payment.status}
                              </span>
                              {payment.status === 'PENDING' && payment.quote && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="prodify-gradient text-white border-0"
                                    onClick={async () => {
                                      try {
                                        // בדיקה איזה אינטגרציות זמינות
                                        const integrationsRes = await fetch('/api/integrations')
                                        let payplusAvailable = false
                                        let invoice4uClearingAvailable = false
                                        
                                        if (integrationsRes.ok) {
                                          const integrations = await integrationsRes.json()
                                          payplusAvailable = integrations.some((i: any) => i.type === 'PAYPLUS' && i.isActive)
                                          invoice4uClearingAvailable = integrations.some((i: any) => i.type === 'INVOICE4U' && i.isActive)
                                        }
                                        
                                        // קבלת clientId מההצעה
                                        let invoice4uClientId = params.id
                                        if (payment.quote) {
                                          try {
                                            const quoteRes = await fetch(`/api/quotes/${payment.quote.id}`)
                                            if (quoteRes.ok) {
                                              const quoteData = await quoteRes.json()
                                              // אם יש leadId, ננסה למצוא את הלקוח
                                              if (quoteData.leadId) {
                                                const leadRes = await fetch(`/api/leads/${quoteData.leadId}`)
                                                if (leadRes.ok) {
                                                  const leadData = await leadRes.json()
                                                  invoice4uClientId = leadData.clientId || params.id
                                                }
                                              }
                                            }
                                          } catch (e) {
                                            console.error("Error fetching quote:", e)
                                          }
                                        }
                                        
                                        // ניסיון Invoice4U Clearing קודם (אם זמין)
                                        if (invoice4uClearingAvailable) {
                                          const invoice4uRes = await fetch(`/api/integrations/invoice4u/clearing/process`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              quoteId: payment.quote.id,
                                              clientId: invoice4uClientId,
                                              amount: payment.amount.toString(),
                                              description: payment.description || `תשלום עבור הצעה ${payment.quote.quoteNumber}`,
                                              paymentType: "regular",
                                            }),
                                          })
                                          
                                          if (invoice4uRes.ok) {
                                            const data = await invoice4uRes.json()
                                            if (data.clearingUrl) {
                                              window.location.href = data.clearingUrl
                                              return
                                            } else {
                                              console.error("Invoice4U response missing clearingUrl:", data)
                                            }
                                          } else {
                                            const invoice4uError = await invoice4uRes.json().catch(() => ({}))
                                            console.error("Invoice4U error:", invoice4uError)
                                            
                                            // אם Invoice4U נכשל, ננסה PayPlus (אם זמין)
                                            if (payplusAvailable) {
                                              const payplusRes = await fetch(`/api/quotes/${payment.quote.id}/generate-payment-link`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  currency: "ILS",
                                                  amount: payment.amount,
                                                }),
                                              })
                                              
                                              if (payplusRes.ok) {
                                                const payplusData = await payplusRes.json()
                                                if (payplusData.paymentLink) {
                                                  window.location.href = payplusData.paymentLink
                                                  return
                                                }
                                              }
                                            }
                                            
                                            toast({
                                              title: "שגיאה ב-Invoice4U Clearing",
                                              description: invoice4uError.error || invoice4uError.details || "לא ניתן ליצור קישור תשלום דרך Invoice4U. נסה שוב או בדוק את הגדרות האינטגרציה.",
                                              variant: "destructive",
                                            })
                                            return
                                          }
                                        }
                                        
                                        // אם Invoice4U לא זמין, ננסה PayPlus
                                        if (payplusAvailable) {
                                          const payplusRes = await fetch(`/api/quotes/${payment.quote.id}/generate-payment-link`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              currency: "ILS",
                                              amount: payment.amount,
                                            }),
                                          })
                                          
                                          if (payplusRes.ok) {
                                            const data = await payplusRes.json()
                                            if (data.paymentLink) {
                                              window.location.href = data.paymentLink
                                              return
                                            }
                                          } else {
                                            const errorData = await payplusRes.json().catch(() => ({}))
                                            console.error("PayPlus error:", errorData)
                                            toast({
                                              title: "שגיאה",
                                              description: errorData.error || "לא ניתן ליצור קישור תשלום דרך PayPlus",
                                              variant: "destructive",
                                            })
                                            return
                                          }
                                        }
                                        
                                        // אם אין אינטגרציות זמינות
                                        toast({
                                          title: "אין אינטגרציות זמינות",
                                          description: "אנא הגדר PayPlus או Invoice4U Clearing בדף האינטגרציות לפני ניסיון תשלום.",
                                          variant: "destructive",
                                        })
                                      } catch (error: any) {
                                        console.error("Error processing payment:", error)
                                        toast({
                                          title: "שגיאה",
                                          description: error.message || "אירעה שגיאה ביצירת קישור תשלום",
                                          variant: "destructive",
                                        })
                                      }
                                    }}
                                  >
                                    💳 שלם עכשיו
                                  </Button>
                                </div>
                              )}
                              {payment.paymentReference && (
                                <span className="text-xs text-gray-500">
                                  אישור: {payment.paymentReference}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              </>
            )}

            {/* Files Tab */}
            {activeTab === "files" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>קבצים ({client?.files?.length || 0})</CardTitle>
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        multiple
                      />
                      <Button size="sm" className="prodify-gradient text-white" disabled={uploading}>
                        <Paperclip className="w-4 h-4 ml-2" />
                        {uploading ? "מעלה..." : "העלה קובץ"}
                      </Button>
                    </label>
                  </div>
                </CardHeader>
                <CardContent>
                  {!client?.files || client.files.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>אין קבצים מצורפים</p>
                      <p className="text-sm mt-1">גרור קבצים לכאן או לחץ להעלאה</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {client.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3 flex-1">
                            <Paperclip className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{file.name}</h4>
                              <div className="text-xs text-gray-500 mt-1">
                                {(file.size / 1024).toFixed(2)} KB • {new Date(file.createdAt).toLocaleDateString('he-IL')}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/files/${file.id}/download`, {
                                  credentials: 'include',
                                })
                                if (res.ok) {
                                  const blob = await res.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement("a")
                                  a.href = url
                                  a.download = file.name
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  window.URL.revokeObjectURL(url)
                                } else {
                                  const error = await res.json()
                                  console.error("Error downloading file:", error)
                                  alert("שגיאה בהורדת הקובץ: " + (error.error || "שגיאה לא ידועה"))
                                }
                              } catch (error) {
                                console.error("Error downloading file:", error)
                                alert("שגיאה בהורדת הקובץ")
                              }
                            }}
                          >
                            הורד
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline Tab */}
            {activeTab === "timeline" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>ציר זמן</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timeline.map((event) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            {event.type === "created" && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                            {event.type === "project" && <FolderKanban className="w-4 h-4 text-purple-600" />}
                            {event.type === "note" && <MessageSquare className="w-4 h-4 text-purple-600" />}
                            {event.type === "budget" && <Coins className="w-4 h-4 text-purple-600" />}
                            {event.type === "payment" && <Coins className="w-4 h-4 text-green-600" />}
                          </div>
                          {event.id !== timeline[timeline.length - 1].id && (
                            <div className="w-0.5 h-12 bg-gray-200"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{event.description}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            {event.date} • {event.user}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>פעולות מהירות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Send className="w-4 h-4 ml-2" />
                  שלח מייל
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Phone className="w-4 h-4 ml-2" />
                  התקשר
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 ml-2" />
                  קבע פגישה
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 ml-2" />
                  צור משימה
                </Button>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>מידע נוסף</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">בעלים</span>
                  <span className="font-medium">{client.owner?.name || 'לא משויך'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">סטטוס</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">פעיל</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">תאריך יצירה</span>
                </div>
              </CardContent>
            </Card>

            {/* Signature */}
            {client.signature && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>חתימה דיגיטלית</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                    <img 
                      src={client.signature} 
                      alt="חתימת הלקוח" 
                      className="max-w-full h-auto"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    חתימה זו נשמרה בעת אישור הצעת המחיר
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}


