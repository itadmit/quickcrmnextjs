"use client"

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
} from "lucide-react"

const menuItems = [
  { icon: Home, label: "בית", href: "/dashboard" },
  { icon: CheckSquare, label: "המשימות שלי", href: "/tasks/my" },
  { icon: Calendar, label: "לוח שנה", href: "/calendar" },
  { icon: Inbox, label: "התראות", href: "/notifications", badge: 3 },
  { icon: TrendingUp, label: "דוחות ואנליטיקה", href: "/reports" },
]

const projectItems = [
  { label: "לידים", href: "/leads", color: "bg-purple-500" },
  { label: "לקוחות", href: "/clients", color: "bg-blue-500" },
  { label: "פרויקטים", href: "/projects", color: "bg-cyan-500" },
]

const settingsItems = [
  { icon: Settings, label: "הגדרות", href: "/settings" },
  { icon: Plug, label: "אינטגרציות", href: "/settings/integrations" },
  { icon: Workflow, label: "אוטומציות", href: "/automations" },
]

export function Sidebar() {
  const pathname = usePathname()

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
          {menuItems.map((item) => {
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
                {item.badge && (
                  <span className="prodify-gradient text-white text-xs rounded-full px-2 py-0.5">
                    {item.badge}
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
            {projectItems.map((item) => {
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
          {settingsItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
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
          <button className="w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
            + הזמן אנשים
          </button>
        </div>
      </div>
    </div>
  )
}

