"use client"

import { Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>נבנה עם</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>על ידי</span>
            <span className="font-pacifico prodify-gradient-text">
              Quick crm
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span>© {new Date().getFullYear()} כל הזכויות שמורות</span>
            <a href="#" className="prodify-gradient-text transition-colors hover:opacity-80">
              תנאי שימוש
            </a>
            <a href="#" className="prodify-gradient-text transition-colors hover:opacity-80">
              מדיניות פרטיות
            </a>
            <a href="#" className="prodify-gradient-text transition-colors hover:opacity-80">
              צור קשר
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

