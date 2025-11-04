"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Users, FolderKanban, Coins, TrendingUp, CheckSquare, Calendar, Bell, Clock, AlertCircle, Circle, CheckCircle2, User, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton"

interface Stats {
  leads: { total: number; new7Days: number }
  clients: { total: number; active: number }
  projects: { total: number; open: number }
  budgets: { total: number; pending: number }
  myTasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    project: { name: string } | null
    assignee: { name: string; email: string } | null
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
    location: string | null
  }>
  recentNotifications: Array<{
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [stats, setStats] = useState<Stats>({
    leads: { total: 0, new7Days: 0 },
    clients: { total: 0, active: 0 },
    projects: { total: 0, open: 0 },
    budgets: { total: 0, pending: 0 },
    myTasks: [],
    upcomingEvents: [],
    recentNotifications: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  const priorityConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    URGENT: { label: "דחוף", color: "text-red-700", icon: AlertCircle, bg: "bg-red-50 border-red-200" },
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

  if (loading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    )
  }

  const inProgressTasks = stats.myTasks.filter(t => t.status === 'IN_PROGRESS')
  const todoTasks = stats.myTasks.filter(t => t.status === 'TODO')

  return (
    <AppLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mt-1">
              שלום, {session?.user?.name || 'משתמש'}
            </h1>
            <h2 className="text-2xl mt-1" style={{
              background: 'linear-gradient(to left, #93f0e1, #6374c5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block'
            }}>
              איך אני יכול לעזור לך היום?
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/tasks/my')}>
              קבל עדכוני משימות
            </Button>
            <Button variant="outline" onClick={() => router.push('/projects')}>
              צור פרויקט חדש
            </Button>
            <Button variant="outline" onClick={() => router.push('/clients')}>
              הוסף לקוח
            </Button>
            <Button className="prodify-gradient text-white" onClick={() => router.push('/tasks/my')}>
              + הוסף משימה
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-sm hover-lift cursor-pointer" onClick={() => router.push('/leads')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">לידים חדשים</CardTitle>
            <UserPlus className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.leads.new7Days}</div>
            <p className="text-xs text-gray-500 mt-1">
              סה״כ {stats.leads.total} לידים במערכת
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover-lift cursor-pointer" onClick={() => router.push('/clients')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">לקוחות פעילים</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.clients.active}</div>
            <p className="text-xs text-gray-500 mt-1">
              סה״כ {stats.clients.total} לקוחות
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover-lift cursor-pointer" onClick={() => router.push('/projects')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">פרויקטים פתוחים</CardTitle>
            <FolderKanban className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.projects.open}</div>
            <p className="text-xs text-gray-500 mt-1">
              סה״כ {stats.projects.total} פרויקטים
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">תקציבים</CardTitle>
            <Coins className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₪{(stats.budgets.total / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ₪{(stats.budgets.pending / 1000).toFixed(0)}K ממתינים
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - My Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Tasks Card */}
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-purple-600" />
                  <CardTitle>המשימות שלי</CardTitle>
                </div>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => router.push('/tasks/my')}
                  className="text-purple-600 hover:text-purple-700 p-0 h-auto font-normal"
                >
                  ראה הכל ←
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.myTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>אין משימות פעילות כרגע</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => router.push('/tasks/my')}
                  >
                    + צור משימה חדשה
                  </Button>
                </div>
              ) : (
                <>
                  {/* In Progress Section */}
                  {inProgressTasks.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-cyan-500 text-white text-xs font-medium px-3 py-1 rounded-full">בתהליך</div>
                        <span className="text-sm text-gray-600">{inProgressTasks.length} משימות</span>
                      </div>
                      <div className="space-y-3">
                        {inProgressTasks.slice(0, 3).map((task) => {
                          const priority = priorityConfig[task.priority] || priorityConfig.NORMAL
                          const PriorityIcon = priority.icon
                          return (
                            <div 
                              key={task.id} 
                              className="p-3 border-r-4 border-cyan-500 hover:bg-gray-50 transition-all duration-200 cursor-pointer group"
                              onClick={() => router.push(`/tasks/${task.id}`)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-cyan-400 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 className="w-3 h-3 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 leading-tight mb-2">{task.title}</div>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div className={`flex items-center gap-1 text-xs ${priority.color}`}>
                                      <PriorityIcon className="w-3 h-3" />
                                      {priority.label}
                                    </div>
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Clock className="w-3 h-3" />
                                        {formatDueDate(task.dueDate)}
                                      </div>
                                    )}
                                    {task.project && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <FolderKanban className="w-3 h-3" />
                                        {task.project.name}
                                      </div>
                                    )}
                                    {task.assignee && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <User className="w-3 h-3" />
                                        {task.assignee.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* To Do Section */}
                  {todoTasks.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">לביצוע</div>
                        <span className="text-sm text-gray-600">{todoTasks.length} משימות</span>
                      </div>
                      <div className="space-y-3">
                        {todoTasks.slice(0, 3).map((task) => {
                          const priority = priorityConfig[task.priority] || priorityConfig.NORMAL
                          const PriorityIcon = priority.icon
                          return (
                            <div 
                              key={task.id} 
                              className="p-3 border-r-4 border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer group"
                              onClick={() => router.push(`/tasks/${task.id}`)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 leading-tight mb-2">{task.title}</div>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div className={`flex items-center gap-1 text-xs ${priority.color}`}>
                                      <PriorityIcon className="w-3 h-3" />
                                      {priority.label}
                                    </div>
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Clock className="w-3 h-3" />
                                        {formatDueDate(task.dueDate)}
                                      </div>
                                    )}
                                    {task.project && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <FolderKanban className="w-3 h-3" />
                                        {task.project.name}
                                      </div>
                                    )}
                                    {task.assignee && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <User className="w-3 h-3" />
                                        {task.assignee.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => router.push('/tasks/my')}
                  >
                    + הוסף משימה
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <CardTitle>סטטיסטיקות מהירות</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">לידים חדשים (7 ימים)</span>
                  <span className="text-lg font-bold text-purple-600">
                    {stats.leads.new7Days}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">לקוחות פעילים</span>
                  <span className="text-lg font-bold text-blue-600">
                    {stats.clients.active}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">פרויקטים פתוחים</span>
                  <span className="text-lg font-bold text-cyan-600">
                    {stats.projects.open}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">המשימות שלי</span>
                  <span className="text-lg font-bold text-orange-600">
                    {stats.myTasks.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Card */}
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <CardTitle>פגישות קרובות</CardTitle>
                </div>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => router.push('/calendar')}
                  className="text-purple-600 hover:text-purple-700 p-0 h-auto font-normal"
                >
                  ראה הכל ←
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.upcomingEvents.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">
                    אין פגישות קרובות
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/calendar')}
                  >
                    פתח לוח שנה
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.upcomingEvents.map(event => {
                    const startDate = new Date(event.startTime)
                    const endDate = new Date(event.endTime)
                    return (
                      <div 
                        key={event.id}
                        className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => router.push('/calendar')}
                      >
                        <div className="font-medium text-gray-900 mb-1">{event.title}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {startDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} • {startDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <FolderKanban className="w-3 h-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-600" />
                  <CardTitle>התראות אחרונות</CardTitle>
                </div>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => router.push('/notifications')}
                  className="text-purple-600 hover:text-purple-700 p-0 h-auto font-normal"
                >
                  ראה הכל ←
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentNotifications.length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">
                    אין התראות חדשות
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/notifications')}
                  >
                    ראה התראות
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentNotifications.map(notif => {
                    const getNotifIcon = () => {
                      switch (notif.type) {
                        case 'task': return CheckSquare
                        case 'lead': return UserPlus
                        case 'reminder': return Bell
                        case 'document': return Coins
                        default: return Bell
                      }
                    }
                    const NotifIcon = getNotifIcon()
                    return (
                      <div 
                        key={notif.id}
                        className={`p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-r-2 ${notif.isRead ? 'border-gray-200 opacity-60' : 'border-purple-500'}`}
                        onClick={() => router.push('/notifications')}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full ${notif.isRead ? 'bg-gray-100' : 'bg-purple-100'}`}>
                            <NotifIcon className={`w-3 h-3 ${notif.isRead ? 'text-gray-600' : 'text-purple-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm mb-0.5">{notif.title}</div>
                            <div className="text-xs text-gray-600 truncate">{notif.message}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
