"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { NotificationsSkeleton } from "@/components/skeletons/NotificationsSkeleton"
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  FileText,
  Calendar,
  AlertCircle,
  Coins,
  Receipt,
  Mail,
  Phone,
  MapPin,
  Trash2
} from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  entityType?: string | null
  entityId?: string | null
  entityDetails?: any
}

export default function NotificationsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string, navigateToEntity = false) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        )
        
        if (!navigateToEntity) {
          toast({
            title: "סומן כנקרא",
            description: "ההתראה סומנה כנקראה",
          })
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // סמן כנקרא
    markAsRead(notification.id, true)

    // נווט ל-entity הרלוונטי
    if (notification.entityType && notification.entityId) {
      switch (notification.entityType) {
        case 'lead':
          router.push(`/leads/${notification.entityId}`)
          break
        case 'quote':
          router.push(`/quotes/${notification.entityId}`)
          break
        case 'payment':
          router.push(`/payments`)
          break
        case 'client':
          router.push(`/clients/${notification.entityId}`)
          break
        case 'project':
          router.push(`/projects`)
          break
        case 'task':
          router.push(`/tasks/my`)
          break
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        )
        toast({
          title: "הכל סומן כנקרא",
          description: "כל ההתראות סומנו כנקראו בהצלחה",
        })
        fetchNotifications()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לסמן את ההתראות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בסימון ההתראות",
        variant: "destructive",
      })
    }
  }

  const deleteAllNotifications = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל ההתראות? פעולה זו לא ניתנת לביטול.')) {
      return
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotifications([])
        toast({
          title: "הכל נמחק",
          description: "כל ההתראות נמחקו בהצלחה",
        })
        fetchNotifications()
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את ההתראות",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת ההתראות",
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return CheckCircle2
      case 'meeting':
        return Calendar
      case 'lead':
        return UserPlus
      case 'document':
        return FileText
      case 'reminder':
        return Clock
      case 'quote':
        return Receipt
      case 'payment':
        return Coins
      default:
        return Bell
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-600 bg-blue-100'
      case 'meeting':
        return 'text-purple-600 bg-purple-100'
      case 'lead':
        return 'text-green-600 bg-green-100'
      case 'document':
        return 'text-cyan-600 bg-cyan-100'
      case 'reminder':
        return 'text-orange-600 bg-orange-100'
      case 'quote':
        return 'text-indigo-600 bg-indigo-100'
      case 'payment':
        return 'text-emerald-600 bg-emerald-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatNotificationDetails = (notification: Notification) => {
    if (!notification.entityDetails) return null

    switch (notification.entityType) {
      case 'lead':
        const lead = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{lead.name}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                {lead.email}
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                {lead.phone}
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                מקור: {lead.source}
              </div>
            )}
          </div>
        )
      case 'quote':
        const quote = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-medium text-gray-900">#{quote.quoteNumber}</div>
            {quote.title && (
              <div className="text-gray-600">{quote.title}</div>
            )}
            {quote.total && (
              <div className="text-gray-900 font-semibold">₪{quote.total.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</div>
            )}
          </div>
        )
      case 'payment':
        const payment = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-semibold text-emerald-600 text-lg">₪{payment.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</div>
            {payment.transactionId && (
              <div className="text-gray-600">מספר עסקה: {payment.transactionId}</div>
            )}
          </div>
        )
      case 'client':
        const client = notification.entityDetails
        return (
          <div className="mt-2 space-y-1 text-sm">
            <div className="font-medium text-gray-900">{client.name}</div>
            {client.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                {client.email}
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <NotificationsSkeleton />
      </AppLayout>
    )
  }

  const unreadNotifications = notifications.filter(n => !n.isRead)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">התראות</h1>
            <p className="text-gray-500 mt-1">עדכונים חשובים ותזכורות</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={markAllAsRead}>
              סמן הכל כנקרא
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteAllNotifications}
              disabled={notifications.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              מחק את הכל
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b">
          <button className="px-4 py-2 border-b-2 border-purple-600 text-purple-600 font-medium">
            הכל ({notifications.length})
          </button>
          <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
            לא נקראו ({unreadNotifications.length})
          </button>
          <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
            משימות
          </button>
          <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
            פגישות
          </button>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">אין התראות חדשות</h3>
              <p className="text-gray-500">כל ההתראות שלך יופיעו כאן</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              const colorClass = getNotificationColor(notification.type)
              const details = formatNotificationDetails(notification)
              const timeAgo = new Date(notification.createdAt).toLocaleString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <Card 
                  key={notification.id} 
                  onClick={() => handleNotificationClick(notification)}
                  className={`shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    !notification.isRead ? "border-r-4 border-r-purple-600 bg-purple-50/30" : ""
                  } hover:bg-gray-50`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-600"}`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            {details && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                {details}
                              </div>
                            )}
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-gray-500">{timeAgo}</span>
                          {!notification.isRead && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                            >
                              סמן כנקרא
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

