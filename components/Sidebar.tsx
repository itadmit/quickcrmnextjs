"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  UserPlus,
  Users,
  FolderKanban,
  CheckSquare,
  Coins,
  BarChart3,
  Settings,
  Sparkles,
  Inbox,
  Calendar,
  TrendingUp,
  Plug,
  Workflow,
  FileText,
  CreditCard,
} from "lucide-react"
import { InvitePeopleDialog } from "@/components/dialogs/InvitePeopleDialog"

const menuItems = [
  { icon: Home, label: "בית", href: "/dashboard", permission: "dashboard" },
  { icon: CheckSquare, label: "המשימות שלי", href: "/tasks/my", permission: "tasks" },
  { icon: Calendar, label: "לוח שנה", href: "/calendar", permission: "calendar" },
  { icon: Inbox, label: "התראות", href: "/notifications", hasBadge: true, permission: "notifications" },
  { icon: TrendingUp, label: "דוחות ואנליטיקה", href: "/reports", permission: "reports" },
]

const projectItems = [
  { label: "לידים", href: "/leads", color: "bg-purple-500", permission: "leads" },
  { label: "לקוחות", href: "/clients", color: "bg-blue-500", permission: "clients" },
  { label: "פרויקטים", href: "/projects", color: "bg-cyan-500", permission: "projects" },
  { label: "הצעות מחיר", href: "/quotes", color: "bg-green-500", permission: "quotes" },
  { label: "תשלומים", href: "/payments", color: "bg-orange-500", permission: "payments" },
]

const settingsItems = [
  { icon: Settings, label: "הגדרות", href: "/settings", permission: "settings" },
  { icon: Plug, label: "אינטגרציות", href: "/settings/integrations", permission: "integrations" },
  { icon: Workflow, label: "אוטומציות", href: "/automations", permission: "automations" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loadingPermissions, setLoadingPermissions] = useState(true)

  useEffect(() => {
    fetchPermissions()
    fetchUnreadCount()
    // רענון כל 30 שניות
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/users/permissions')
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || {})
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      // אם יש שגיאה, נניח שהמשתמש הוא ADMIN ויש לו כל ההרשאות
      setPermissions({
        dashboard: true,
        tasks: true,
        calendar: true,
        notifications: true,
        reports: true,
        leads: true,
        clients: true,
        projects: true,
        quotes: true,
        payments: true,
        settings: true,
        integrations: true,
        automations: true,
      })
    } finally {
      setLoadingPermissions(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const notifications = await response.json()
        const unread = notifications.filter((n: any) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Error fetching notifications count:', error)
    }
  }

  // פונקציה לבדיקה אם פריט מורשה
  const hasPermission = (permission?: string) => {
    if (!permission) return true // אם אין permission מוגדר, נציג
    return permissions[permission] === true
  }

  // אם עדיין טוען, נציג הכל (לא נחכה)
  if (loadingPermissions) {
    // נציג את כל הפריטים עד שהטעינה מסתיימת
  }

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-gray-50 to-gray-100 border-l border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center justify-center">
          <span 
            className="text-3xl font-pacifico prodify-gradient-text" 
            style={{ letterSpacing: '2px' }}
          >
            Quick crm
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Primary Menu */}
        <nav className="space-y-1">
          {menuItems
            .filter((item) => hasPermission(item.permission))
            .map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.disabled ? "#" : item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-700 hover:bg-gray-200",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.hasBadge && unreadCount > 0 && (
                    <span className="prodify-gradient text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
        </nav>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              הפרויקטים שלי
            </h3>
            <button className="text-gray-400 hover:text-gray-600">
              <span className="text-lg">+</span>
            </button>
          </div>
          <nav className="space-y-1">
            {projectItems
              .filter((item) => hasPermission(item.permission))
              .map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-full", item.color)} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </nav>
        </div>

        {/* Settings Section */}
        <nav className="space-y-1">
        {settingsItems
          .filter((item) => hasPermission(item.permission))
          .map((item) => {
            const Icon = item.icon
            // בדיקה מדויקת - אם pathname הוא בדיוק ה-href, או מתחיל ב-href + '/'
            // אבל רק אם זה לא חלק מ-href אחר יותר ארוך
            const isActive = pathname === item.href ||
              (pathname.startsWith(item.href + '/') &&
               !settingsItems.some(otherItem =>
                 otherItem.href !== item.href &&
                 pathname.startsWith(otherItem.href + '/') &&
                 otherItem.href.length > item.href.length
               ))
            // אם אנחנו ב-integrations, רק אינטגרציות יסומן (לא הגדרות)
            const isIntegrationsPage = pathname.startsWith('/settings/integrations')
            const finalIsActive = isIntegrationsPage && item.href === '/settings'
              ? false
              : isActive

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  finalIsActive
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-700 hover:bg-gray-200"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section - Prodify branding */}
      <div className="p-4 border-t border-gray-200">
        <div className="rounded-xl p-4 text-white text-sm" style={{
          background: 'linear-gradient(135deg, #6f65e2 0%, #b965e2 100%)'
        }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-pacifico text-lg" style={{ letterSpacing: '1px' }}>Quick crm</span>
          </div>
          <p className="text-white/80 text-xs mb-3">
            משתמשים חדשים מקבלים גישה ל-Dashboards-1 Spaces, Docs וצ׳וברהיים
          </p>
          <InvitePeopleDialog
            triggerButton={
              <button className="w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                + הזמן אנשים
              </button>
            }
          />
        </div>
      </div>
    </div>
  )
}

