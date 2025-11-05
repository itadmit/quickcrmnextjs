"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CheckCircle, CreditCard, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { SignaturePad } from "@/components/ui/signature-pad"

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description?: string | null
  total: number
  lead?: {
    name: string
    email?: string | null
  } | null
}

export default function ApproveQuotePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchQuote()
    }
  }, [params.id])

  const fetchQuote = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/quotes/${params.id}/approve`)
      if (res.ok) {
        const data = await res.json()
        setQuote(data)
      } else {
        setError("הצעת המחיר לא נמצאה")
      }
    } catch (error) {
      console.error("Error fetching quote:", error)
      setError("שגיאה בטעינת הצעת המחיר")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!signature) {
      toast({
        title: "חתימה נדרשת",
        description: "אנא הוסף חתימה לפני אישור ההצעה",
        variant: "destructive",
      })
      return
    }

    try {
      setApproving(true)
      
      // שלב 1: אישור ההצעה ושמירת החתימה
      const approveRes = await fetch(`/api/quotes/${params.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
        }),
      })

      if (!approveRes.ok) {
        const errorData = await approveRes.json()
        toast({
          title: "שגיאה",
          description: errorData.error || "לא הצלחנו לאשר את הצעת המחיר",
          variant: "destructive",
        })
        return
      }

      // שלב 2: יצירת payment link והעברה ישירה ל-PayPlus
      const paymentLinkRes = await fetch(`/api/quotes/${params.id}/generate-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: "ILS",
          customer: quote.lead ? {
            customer_name: quote.lead.name,
            email: quote.lead.email || undefined,
            phone: quote.lead.phone || undefined,
          } : undefined,
        }),
      })

      if (paymentLinkRes.ok) {
        const data = await paymentLinkRes.json()
        if (data.paymentLink) {
          // מעבר ישיר לדף התשלום של PayPlus
          window.location.href = data.paymentLink
        } else {
          throw new Error("Payment link not generated")
        }
      } else {
        const errorData = await paymentLinkRes.json()
        const errorMessage = errorData.error || errorData.details || "שגיאה ביצירת קישור תשלום"
        toast({
          title: "שגיאה ביצירת קישור תשלום",
          description: errorMessage,
          variant: "destructive",
          duration: 10000, // הצגה למשך 10 שניות כדי שהמשתמש יוכל לקרוא
        })
      }
    } catch (error: any) {
      console.error("Error approving quote:", error)
      const errorMessage = error.message || "לא הצלחנו לאשר את הצעת המחיר"
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // הצגה למשך 10 שניות כדי שהמשתמש יוכל לקרוא
      })
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">שגיאה</h2>
              <p className="text-gray-600 mb-4">{error || "הצעת המחיר לא נמצאה"}</p>
              <Button onClick={() => router.push("/")} variant="outline">
                חזרה לדף הבית
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              אישור הצעת מחיר
            </CardTitle>
            <p className="text-gray-600">מספר הצעה: {quote.quoteNumber}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{quote.title}</h3>
              {quote.description && (
                <p className="text-gray-600 text-sm">{quote.description}</p>
              )}
            </div>

            {quote.lead && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">לקוח:</p>
                <p className="font-medium text-gray-900">{quote.lead.name}</p>
                {quote.lead.email && (
                  <p className="text-sm text-gray-600">{quote.lead.email}</p>
                )}
              </div>
            )}

            <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-900">מקדמה (40%):</span>
                <span className="text-2xl font-bold text-purple-600">
                  ₪{(quote.total * 0.4).toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>סה״כ כולל:</span>
                <span>₪{quote.total.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-sm text-gray-600">
                לאחר אישור ההצעה, תועבר לעמוד תשלום מקדמה
              </p>
            </div>

            {/* חתימה דיגיטלית */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">חתימה דיגיטלית</h3>
              <SignaturePad onSignatureChange={setSignature} />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 text-white"
                style={{
                  background: 'linear-gradient(135deg, #6f65e2 0%, #b965e2 100%)',
                }}
                size="lg"
              >
                {approving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מאשר...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    אשר והמשך לתשלום
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

