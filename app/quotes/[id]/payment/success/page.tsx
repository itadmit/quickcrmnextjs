"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useParams } from "next/navigation"
import { CheckCircle, Receipt, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const quoteId = params.id as string
  const [paymentData, setPaymentData] = useState<{
    transactionUid?: string
    approvalNum?: string
    voucherNum?: string
    amount?: number
    status?: string
  } | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    // קבלת נתוני התשלום מ-PayPlus
    const transactionUid = searchParams.get("transaction_uid")
    const approvalNum = searchParams.get("approval_num")
    const voucherNum = searchParams.get("voucher_num")
    const amount = searchParams.get("amount")
    const status = searchParams.get("status")
    const moreInfo2 = searchParams.get("more_info_2") // quoteId

    if (transactionUid || approvalNum) {
      setPaymentData({
        transactionUid: transactionUid || undefined,
        approvalNum: approvalNum || undefined,
        voucherNum: voucherNum || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        status: status || undefined,
      })

      // בדיקה שלא עיבדנו את התשלום הזה כבר
      const processedKey = `payment_processed_${transactionUid || approvalNum || moreInfo2 || quoteId}`
      const alreadyProcessed = sessionStorage.getItem(processedKey)
      
      // שליחה ל-callback API כדי לשמור את התשלום
      if (status === "approved" && (moreInfo2 || quoteId) && !alreadyProcessed) {
        // סימון שהתשלום כבר עובד
        sessionStorage.setItem(processedKey, "true")
        processPaymentCallback()
      } else {
        setProcessing(false)
      }
    } else {
      setProcessing(false)
    }
  }, [searchParams, quoteId])

  const processPaymentCallback = async () => {
    try {
      // בניית body עם כל הנתונים מה-URL
      const callbackData: any = {}
      searchParams.forEach((value, key) => {
        callbackData[key] = value
      })

      // שליחה ל-callback API
      const response = await fetch("/api/payments/payplus/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(callbackData),
      })

      if (response.ok) {
        console.log("✅ Payment callback processed successfully")
      } else {
        console.error("❌ Payment callback failed:", await response.text())
      }
    } catch (error) {
      console.error("Error processing payment callback:", error)
    } finally {
      setProcessing(false)
    }
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return "—"
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
    }).format(amount)
  }

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 flex items-center justify-center" dir="rtl">
        <div className="max-w-2xl w-full">
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">מעבד את התשלום...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 flex items-center justify-center" dir="rtl">
      <div className="max-w-2xl w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CheckCircle className="w-20 h-20 text-green-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              התשלום הושלם בהצלחה!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-gray-700 mb-2">
                תודה על התשלום!
              </p>
              <p className="text-gray-600">
                ההצעה אושרה והפרויקט נוצר במערכת.
              </p>
            </div>

            {paymentData && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">פרטי התשלום</h3>
                </div>
                
                {paymentData.amount && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">סכום:</span>
                    <span className="font-bold text-lg text-gray-900">
                      {formatAmount(paymentData.amount)}
                    </span>
                  </div>
                )}

                {paymentData.approvalNum && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">מספר אישור:</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {paymentData.approvalNum}
                    </span>
                  </div>
                )}

                {paymentData.voucherNum && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">מספר קבלה:</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {paymentData.voucherNum}
                    </span>
                  </div>
                )}

                {paymentData.transactionUid && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">מספר עסקה:</span>
                    <span className="font-mono text-sm text-gray-700 break-all text-left">
                      {paymentData.transactionUid}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-4 pt-4">
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                הדפס קבלה
              </Button>
              <p className="text-sm text-gray-500">
                תוכל לסגור את החלון הזה
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

