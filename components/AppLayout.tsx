"use client"

import { useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { useToast } from "@/components/ui/use-toast"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  hideSidebar?: boolean
  hideHeader?: boolean
}

export function AppLayout({ children, title, hideSidebar = false, hideHeader = false }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  useEffect(() => {
    // לא לבדוק authentication בדפי הזמנה או רישום
    if (pathname?.startsWith("/invite") || pathname?.startsWith("/register")) {
      return
    }

    // בדיקה אם ה-session התבטל (משתמש נמחק)
    if (status === "unauthenticated" && session === null) {
      // בדיקה אם זה קרה אחרי מחיקה
      const userDeleted = sessionStorage.getItem("user_deleted")
      if (userDeleted === "true") {
        toast({
          title: "החשבון נמחק",
          description: "החשבון שלך נמחק מהמערכת. יש להתחבר מחדש.",
          variant: "destructive",
        })
        sessionStorage.removeItem("user_deleted")
      }
      router.push("/login")
    }
  }, [status, session, router, toast, pathname])

  // אם צריך להסתיר Sidebar ו-Header (למשל בדף הזמנה)
  if (hideSidebar && hideHeader) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f7f9fe' }} dir="rtl">
        <main className="flex items-center justify-center py-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#f7f9fe' }} dir="rtl">
      {!hideSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!hideHeader && <Header title={title} />}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 p-6">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}

