"use client"

import { useState, useEffect } from "react"
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
  CheckCircle,
  Users,
  Lock,
  Unlock,
  Edit,
  Key
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<"general" | "communication" | "security" | "advanced">("general")
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

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<Record<string, Record<string, boolean>>>({})
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  const sidebarPermissions = [
    { key: "tasks", label: "משימות", required: false },
    { key: "calendar", label: "לוח שנה", required: false },
    { key: "reports", label: "דוחות", required: false },
    { key: "leads", label: "לידים", required: false },
    { key: "clients", label: "לקוחות", required: false },
    { key: "projects", label: "פרויקטים", required: false },
    { key: "quotes", label: "הצעות מחיר", required: false },
    { key: "payments", label: "תשלומים", required: false },
    { key: "settings", label: "הגדרות", required: false },
    { key: "integrations", label: "אינטגרציות", required: false },
    { key: "automations", label: "אוטומציות", required: false },
  ]

  useEffect(() => {
    if (activeTab === "security" && isAdmin) {
      fetchUsers()
    }
  }, [activeTab, isAdmin])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const usersData = await response.json()
        setUsers(usersData)
        
        // טעינת הרשאות לכל משתמש
        const permissionsPromises = usersData.map((user: any) => 
          fetch(`/api/users/permissions/${user.id}`).then(r => r.json())
        )
        const permissionsResults = await Promise.all(permissionsPromises)
        
        const permissionsMap: Record<string, Record<string, boolean>> = {}
        usersData.forEach((user: any, index: number) => {
          permissionsMap[user.id] = permissionsResults[index]?.permissions || {}
        })
        setUserPermissions(permissionsMap)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleTogglePermission = async (userId: string, permission: string, currentValue: boolean) => {
    // לא ניתן לשנות הרשאות נדרשות
    if (permission === "dashboard" || permission === "notifications") {
      return
    }

    const newPermissions = {
      ...userPermissions[userId],
      [permission]: !currentValue,
    }

    try {
      const response = await fetch(`/api/users/permissions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPermissions }),
      })

      if (response.ok) {
        setUserPermissions({
          ...userPermissions,
          [userId]: newPermissions,
        })
        toast({
          title: "הצלחה",
          description: "ההרשאות עודכנו בהצלחה",
        })
      } else {
        throw new Error('Failed to update permissions')
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
      toast({
        title: "שגיאה",
        description: "לא ניתן היה לעדכן את ההרשאות",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userName}? פעולה זו בלתי הפיכה!`)) {
      return
    }

    setDeletingUserId(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "המשתמש נמחק בהצלחה",
        })
        // רענון רשימת המשתמשים
        await fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן היה למחוק את המשתמש",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המשתמש",
        variant: "destructive",
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "שגיאה",
        description: "הסיסמה החדשה חייבת להכיל לפחות 8 תווים",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות החדשות לא תואמות",
        variant: "destructive",
      })
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה",
          description: "הסיסמה שונתה בהצלחה",
        })
        setShowChangePassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const error = await response.json()
        toast({
          title: "שגיאה",
          description: error.error || "לא ניתן היה לשנות את הסיסמה",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשינוי הסיסמה",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-gray-500 mt-1">נהל את הגדרות המערכת והחשבון שלך</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {[
              { key: "general", label: "כללי", icon: SettingsIcon },
              { key: "communication", label: "תקשורת", icon: Mail },
              { key: "security", label: "אבטחה", icon: Shield },
              ...(isAdmin ? [{ key: "advanced", label: "מתקדם", icon: Database }] : []),
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-purple-600 text-purple-600 font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
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
          </div>
        )}

        {/* Communication Tab - Email + Notifications */}
        {activeTab === "communication" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Security Settings */}
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
                <div className="space-y-6">
                  {/* Change Password */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">שינוי סיסמה</h3>
                          <p className="text-sm text-gray-500">עדכן את סיסמת החשבון שלך</p>
                        </div>
                      </div>
                      {!showChangePassword && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChangePassword(true)}
                        >
                          שנה סיסמה
                        </Button>
                      )}
                    </div>
                    {showChangePassword && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="mt-1"
                            placeholder="הכנס סיסמה נוכחית"
                          />
                        </div>
                        <div>
                          <Label htmlFor="newPassword">סיסמה חדשה</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="mt-1"
                            placeholder="סיסמה חדשה (מינימום 8 תווים)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">אישור סיסמה</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="mt-1"
                            placeholder="הכנס שוב את הסיסמה החדשה"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleChangePassword}
                            disabled={changingPassword}
                            className="prodify-gradient text-white"
                          >
                            {changingPassword ? "משנה..." : "שמור סיסמה"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowChangePassword(false)
                              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                            }}
                            disabled={changingPassword}
                          >
                            ביטול
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Two Factor Authentication */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">אימות דו-שלבי</h3>
                          <p className="text-sm text-gray-500">הוסף שכבת אבטחה נוספת לחשבון שלך</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        בקרוב
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Permissions Management - Only for Admins */}
            {isAdmin && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>ניהול הרשאות משתמשים</CardTitle>
                      <CardDescription>נהל את ההרשאות של משתמשי החברה</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">טוען משתמשים...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      אין משתמשים
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => {
                        const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                        const isEditing = editingUserId === user.id
                        const permissions = userPermissions[user.id] || {}

                        return (
                          <div key={user.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <User className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{user.name}</h3>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {user.role === 'ADMIN' ? 'מנהל' : 
                                     user.role === 'SUPER_ADMIN' ? 'מנהל ראשי' :
                                     user.role === 'MANAGER' ? 'מנהל צוות' : 'משתמש'}
                                  </p>
                                </div>
                              </div>
                              {!isAdminUser && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingUserId(isEditing ? null : user.id)}
                                  >
                                    {isEditing ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 ml-2" />
                                        סיים עריכה
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="w-4 h-4 ml-2" />
                                        ערוך הרשאות
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    disabled={deletingUserId === user.id}
                                  >
                                    {deletingUserId === user.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 ml-2"></div>
                                        מוחק...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 ml-2" />
                                        מחק
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>

                            {isAdminUser ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-900">
                                  למשתמשים מנהלים יש גישה מלאה לכל ההרשאות
                                </p>
                              </div>
                            ) : isEditing ? (
                              <div className="space-y-3">
                                <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                  {sidebarPermissions.map((perm) => {
                                    const hasPermission = permissions[perm.key] === true
                                    return (
                                      <div
                                        key={perm.key}
                                        className="flex items-center gap-3"
                                      >
                                        <input
                                          type="checkbox"
                                          id={`perm-${user.id}-${perm.key}`}
                                          checked={hasPermission}
                                          onChange={() => handleTogglePermission(user.id, perm.key, hasPermission)}
                                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                        />
                                        <label
                                          htmlFor={`perm-${user.id}-${perm.key}`}
                                          className="text-sm flex-1 cursor-pointer"
                                        >
                                          {perm.label}
                                        </label>
                                      </div>
                                    )
                                  })}
                                </div>
                                <div className="bg-gray-50 border rounded-lg p-3">
                                  <p className="text-xs text-gray-600">
                                    <strong>הערה:</strong> הרשאות "בית" ו"התראות" תמיד פעילות ולא ניתן לשנותן
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {sidebarPermissions.map((perm) => {
                                  const hasPermission = permissions[perm.key] === true
                                  return (
                                    <div
                                      key={perm.key}
                                      className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                                        hasPermission
                                          ? 'bg-green-50 text-green-700'
                                          : 'bg-gray-50 text-gray-500'
                                      }`}
                                    >
                                      {hasPermission ? (
                                        <Unlock className="w-3 h-3" />
                                      ) : (
                                        <Lock className="w-3 h-3" />
                                      )}
                                      <span>{perm.label}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Advanced Tab - Only for Admins */}
        {activeTab === "advanced" && isAdmin && (
          <div className="space-y-6">
          {/* Danger Zone */}
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
          </div>
        )}
      </div>
    </AppLayout>
  )
}

