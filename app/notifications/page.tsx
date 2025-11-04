"use client"

import { useEffect, useState } from "react"
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
  AlertCircle
} from "lucide-react"

interface Notification {
  id: number
  type: string
  title: string
  description: string
  time: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const { toast } = useToast()
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

  const markAsRead = async (id: number) => {
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
        toast({
          title: "סומן כנקרא",
          description: "ההתראה סומנה כנקראה",
        })
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
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
      default:
        return 'text-gray-600 bg-gray-100'
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
          <Button variant="outline" onClick={markAllAsRead}>
            סמן הכל כנקרא
          </Button>
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

              return (
                <Card 
                  key={notification.id} 
                  className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                    !notification.isRead ? "border-r-4 border-r-purple-600" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-600"}`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{notification.description}</p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">{notification.time}</span>
                          {!notification.isRead && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={() => markAsRead(notification.id)}
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

