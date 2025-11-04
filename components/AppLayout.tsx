"use client"

import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { Footer } from "./Footer"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#f7f9fe' }} dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
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

