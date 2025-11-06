"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface Invitation {
  id: string
  email: string
  name: string | null
  company: {
    name: string
  }
  inviter: {
    name: string
  }
  permissions: Record<string, boolean>
  expiresAt: string
  status: string
}

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const token = params.token as string

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`)
      if (response.ok) {
        const data = await response.json()
        setInvitation(data)
        setFormData((prev) => ({ ...prev, name: data.name || "" }))
      } else {
        const errorData = await response.json()
        setError(errorData.error || "ההזמנה לא נמצאה או שפג תוקפה")
      }
    } catch (error) {
      console.error("Error fetching invitation:", error)
      setError("אירעה שגיאה בטעינת ההזמנה")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.password) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "שגיאה",
        description: "הסיסמה חייבת להכיל לפחות 6 תווים",
        variant: "destructive",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "שגיאה",
        description: "הסיסמאות אינן תואמות",
        variant: "destructive",
      })
      return
    }

    setAccepting(true)
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          password: formData.password,
        }),
      })

      if (response.ok) {
        toast({
          title: "הצלחה!",
          description: "החשבון נוצר בהצלחה. אתה מועבר להתחברות...",
        })
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        const errorData = await response.json()
        toast({
          title: "שגיאה",
          description: errorData.error || "לא ניתן ליצור את החשבון",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת החשבון",
        variant: "destructive",
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout hideSidebar={true} hideHeader={true}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </AppLayout>
    )
  }

  if (error || !invitation) {
    return (
      <AppLayout hideSidebar={true} hideHeader={true}>
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                שגיאה
              </h2>
              <p className="text-gray-600 mb-6">{error || "ההזמנה לא נמצאה"}</p>
              <Button onClick={() => router.push("/login")} variant="outline">
                חזור לדף ההתחברות
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  const permissionsCount = Object.values(invitation.permissions).filter(
    (allowed) => allowed
  ).length

  return (
    <AppLayout hideSidebar={true} hideHeader={true}>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            אישור הזמנה להצטרפות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-900">
                {invitation.inviter.name} הזמין אותך להצטרף
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>חברה: {invitation.company.name}</div>
              <div>אימייל: {invitation.email}</div>
              <div>הרשאות: {permissionsCount} פריטים</div>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">שם מלא *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="הזן את שמך המלא"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">סיסמה *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                placeholder="לפחות 6 תווים"
                minLength={6}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">אישור סיסמה *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                required
                placeholder="הזן שוב את הסיסמה"
              />
            </div>

            <div className="pt-4 border-t">
              <Button
                type="submit"
                disabled={accepting}
                className="w-full prodify-gradient text-white"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    יוצר חשבון...
                  </>
                ) : (
                  "אשר והצטרף"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppLayout>
  )
}

