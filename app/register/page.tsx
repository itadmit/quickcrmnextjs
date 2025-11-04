"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Sparkles } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "שגיאה בהרשמה",
          description: data.error || "אירעה שגיאה",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "נרשמת בהצלחה!",
        description: "כעת תוכל להתחבר עם הפרטים שהזנת",
      })

      router.push("/login")
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהרשמה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center prodify-gradient p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-pacifico text-white mb-2" style={{ letterSpacing: '2px' }}>
            Quick crm
          </h1>
          <p className="text-purple-100">צור את החשבון שלך והתחל עכשיו</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">הרשמה</CardTitle>
            <CardDescription className="text-center">
              מלא את הפרטים ליצירת חשבון חדש
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם מלא</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="ישראל ישראלי"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="לפחות 8 תווים"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">שם החברה</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="החברה שלי בע״מ"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full prodify-gradient text-white" disabled={loading}>
                {loading ? "יוצר חשבון..." : "צור חשבון"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center text-muted-foreground">
              כבר יש לך חשבון?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                התחבר
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

