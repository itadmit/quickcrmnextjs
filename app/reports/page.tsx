"use client"

import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Coins, CheckCircle2, FolderKanban } from "lucide-react"

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">דוחות ואנליטיקה</h1>
          <p className="text-gray-600 mt-1">מבט מקיף על הביצועים והתוצאות</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">לידים חדשים (7 ימים)</CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">24</div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-600">+12%</span>
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">המרות ללקוחות</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">8</div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-600">+5%</span>
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">פרויקטים פעילים</CardTitle>
              <FolderKanban className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">15</div>
              <p className="text-xs text-gray-500 mt-1">
                ללא שינוי
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">צפי הכנסות (חודש)</CardTitle>
              <Coins className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">125K ₪</div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-600">+18%</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <CardTitle>מקורות לידים</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { source: "Facebook Ads", count: 45, percentage: 35, color: "bg-blue-400" },
                  { source: "Google", count: 32, percentage: 25, color: "bg-red-300" },
                  { source: "אתר", count: 28, percentage: 22, color: "bg-emerald-400" },
                  { source: "הפניות", count: 23, percentage: 18, color: "bg-purple-400" },
                ].map((item) => (
                  <div key={item.source}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{item.source}</span>
                      <span className="text-sm text-gray-600">{item.count} לידים</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div 
                        className={`${item.color} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-lift">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-purple-600" />
                <CardTitle>יחס המרה בפייפליין</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { stage: "חדש", count: 45, conversion: 100, color: "bg-slate-300" },
                  { stage: "יצירת קשר", count: 32, conversion: 71, color: "bg-sky-300" },
                  { stage: "מתאים", count: 18, conversion: 40, color: "bg-violet-300" },
                  { stage: "הצעה", count: 12, conversion: 27, color: "bg-orange-300" },
                  { stage: "נסגר", count: 8, conversion: 18, color: "bg-emerald-300" },
                ].map((item) => (
                  <div key={item.stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{item.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{item.count}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{item.conversion}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div 
                        className={`${item.color} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${item.conversion}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Forecast */}
        <Card className="shadow-sm hover-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-600" />
              <CardTitle>צפי מול ביצוע - 6 חודשים אחרונים</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {[
                { month: "ינואר", forecast: 80000, actual: 75000 },
                { month: "פברואר", forecast: 90000, actual: 92000 },
                { month: "מרץ", forecast: 85000, actual: 88000 },
                { month: "אפריל", forecast: 95000, actual: 91000 },
                { month: "מאי", forecast: 100000, actual: 105000 },
                { month: "יוני", forecast: 110000, actual: 108000 },
              ].map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.month}</span>
                    <div className="flex gap-4">
                      <span className="text-sky-600 font-medium">צפי: {(item.forecast / 1000).toFixed(0)}K ₪</span>
                      <span className="text-emerald-600 font-medium">ביצוע: {(item.actual / 1000).toFixed(0)}K ₪</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-sky-50 rounded-full h-3 border border-sky-100">
                      <div 
                        className="bg-gradient-to-l from-sky-300 to-sky-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(item.forecast / 110000) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 bg-emerald-50 rounded-full h-3 border border-emerald-100">
                      <div 
                        className="bg-gradient-to-l from-emerald-300 to-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(item.actual / 110000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

