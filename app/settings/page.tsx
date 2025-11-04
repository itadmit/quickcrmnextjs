"use client"

import { useState } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { 
  Trash2, 
  AlertTriangle, 
  Database,
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Mail,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [isResetting, setIsResetting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{connected: boolean; tested: boolean} | null>(null)

  const handleResetData = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/admin/reset-data', {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "הנתונים אופסו!",
          description: "כל הנתונים נמחקו בהצלחה. הדף ירענן עכשיו.",
        })
        
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לאפס את הנתונים",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error resetting data:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה באיפוס הנתונים",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
      setShowConfirm(false)
    }
  }

  const handleTestEmail = async () => {
    setIsTestingEmail(true)
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: session?.user?.email,
          subject: 'בדיקת מערכת האימיילים - QuickCRM',
          message: 'זה אימייל בדיקה. אם קיבלת אותו, המערכת עובדת כראוי! ✅',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "אימייל נשלח בהצלחה! ✅",
          description: `אימייל בדיקה נשלח ל-${data.sentTo}. בדוק את תיבת הדואר שלך.`,
        })
        setEmailStatus({ connected: true, tested: true })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה בשליחת אימייל",
          description: error.details || "לא ניתן לשלוח אימייל",
          variant: "destructive",
        })
        setEmailStatus({ connected: false, tested: true })
      }
    } catch (error) {
      console.error('Error testing email:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת האימייל",
        variant: "destructive",
      })
      setEmailStatus({ connected: false, tested: true })
    } finally {
      setIsTestingEmail(false)
    }
  }

  const handleSeedData = async () => {
    setIsSeeding(true)
    try {
      const response = await fetch('/api/admin/seed-data', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "נתוני דמו נטענו!",
          description: `נוצרו ${data.stats.leads} לידים, ${data.stats.clients} לקוחות, ${data.stats.projects} פרויקטים ועוד. הדף ירענן עכשיו.`,
        })
        
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן לטעון את נתוני הדמו",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error seeding data:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת נתוני הדמו",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-gray-500 mt-1">נהל את הגדרות המערכת והחשבון שלך</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>פרופיל אישי</CardTitle>
                  <CardDescription>עדכן את פרטי המשתמש שלך</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">שם</p>
                  <p className="font-medium">{session?.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">אימייל</p>
                  <p className="font-medium">{session?.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">תפקיד</p>
                  <p className="font-medium">
                    {session?.user?.role === 'ADMIN' ? 'מנהל' : 
                     session?.user?.role === 'MANAGER' ? 'מנהל צוות' : 'משתמש'}
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4" disabled>
                  ערוך פרופיל (בקרוב)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Configuration */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>הגדרות אימייל</CardTitle>
                  <CardDescription>בדיקת חיבור ושליחת אימייל מבחן</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SMTP Server</span>
                    <span className="text-sm text-gray-600">smtp.gmail.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">משתמש</span>
                    <span className="text-sm text-gray-600">quickcrmil@gmail.com</span>
                  </div>
                  {emailStatus && (
                    <div className="flex items-center gap-2 mt-2">
                      {emailStatus.connected ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">החיבור תקין ✅</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">בעיה בחיבור ❌</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="w-full prodify-gradient text-white"
                >
                  {isTestingEmail ? "שולח אימייל..." : "שלח אימייל בדיקה"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>התראות</CardTitle>
                  <CardDescription>הגדר העדפות התראות</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">התראות אימייל</span>
                  <Button variant="outline" size="sm" disabled>מופעל</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">התראות דחיפות</span>
                  <Button variant="outline" size="sm" disabled>מופעל</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">סיכומים שבועיים</span>
                  <Button variant="outline" size="sm" disabled>מופעל</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>אינטגרציות</CardTitle>
                  <CardDescription>חיבורים למערכות חיצוניות</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/settings/integrations">
                  <Button variant="outline" className="w-full">
                    נהל אינטגרציות
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>אבטחה</CardTitle>
                  <CardDescription>הגדרות אבטחה וסיסמה</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full" disabled>
                  שנה סיסמה (בקרוב)
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  אימות דו-שלבי (בקרוב)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone - Only for Admins */}
        {isAdmin && (
          <Card className="shadow-sm border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900">אזור מסוכן</CardTitle>
                  <CardDescription className="text-red-700">
                    פעולות בלתי הפיכות - זמינות למנהלים בלבד
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      איפוס כל הנתונים
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      פעולה זו תמחק את כל הלידים, לקוחות, פרויקטים, משימות והתראות.
                      הפעולה בלתי הפיכה!
                    </p>
                    
                    {!showConfirm ? (
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => setShowConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        אפס נתונים
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-yellow-900 mb-2">
                            ⚠️ האם אתה בטוח?
                          </p>
                          <p className="text-xs text-yellow-800">
                            פעולה זו תמחק לצמיתות את כל הנתונים של החברה.
                            לא ניתן לשחזר אותם!
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={handleResetData}
                            disabled={isResetting}
                          >
                            {isResetting ? "מוחק..." : "כן, מחק הכל"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowConfirm(false)}
                            disabled={isResetting}
                          >
                            ביטול
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      טען נתוני דמו
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      טען נתונים לדוגמה: לידים, לקוחות, פרויקטים, משימות ועוד
                    </p>
                    <div className="bg-white p-3 rounded border border-blue-200 mb-3">
                      <p className="text-xs text-gray-700 mb-2">
                        <strong>נתונים שייווצרו:</strong>
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• 5 לידים עם סטטוסים שונים</li>
                        <li>• 4 לקוחות פעילים</li>
                        <li>• 4 פרויקטים בשלבים שונים</li>
                        <li>• 6 משימות עם עדיפויות</li>
                        <li>• 5 תקציבים והצעות מחיר</li>
                        <li>• 4 התראות</li>
                        <li>• צינור מכירות עם 5 שלבים</li>
                      </ul>
                    </div>
                    <Button
                      variant="outline"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={handleSeedData}
                      disabled={isSeeding}
                    >
                      <Database className="w-4 h-4 ml-2" />
                      {isSeeding ? "טוען נתונים..." : "טען נתוני דמו"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

