"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, RefreshCw, Eye, EyeOff, ExternalLink, CheckCircle2, XCircle, FileText, CreditCard } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"api" | "integrations" | "logs">("api")
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey] = useState("crm_live_1234567890abcdefghijklmnop")
  
  // Invoice4U Integration State
  const [invoice4uEmail, setInvoice4uEmail] = useState("")
  const [invoice4uPassword, setInvoice4uPassword] = useState("")
  const [showInvoice4uPassword, setShowInvoice4uPassword] = useState(false)
  const [invoice4uConnected, setInvoice4uConnected] = useState(false)
  const [invoice4uLoading, setInvoice4uLoading] = useState(false)
  const [invoice4uTesting, setInvoice4uTesting] = useState(false)
  const [useProduction, setUseProduction] = useState(false)

  // PayPlus Integration State
  const [payplusApiKey, setPayplusApiKey] = useState("")
  const [payplusSecretKey, setPayplusSecretKey] = useState("")
  const [payplusPaymentPageUid, setPayplusPaymentPageUid] = useState("")
  const [showPayplusSecretKey, setShowPayplusSecretKey] = useState(false)
  const [payplusConnected, setPayplusConnected] = useState(false)
  const [payplusLoading, setPayplusLoading] = useState(false)
  const [payplusTesting, setPayplusTesting] = useState(false)
  const [payplusUseProduction, setPayplusUseProduction] = useState(false)

  // Mock webhook logs
  const webhookLogs = [
    { id: 1, type: "lead_created", status: 200, payload: { name: "יוסי כהן", email: "yossi@example.com" }, duration: 45, createdAt: "2024-01-15 10:30:15" },
    { id: 2, type: "lead_created", status: 200, payload: { name: "שרה לוי", email: "sara@example.com" }, duration: 38, createdAt: "2024-01-15 09:20:42" },
    { id: 3, type: "lead_created", status: 409, payload: { name: "דוד כהן", email: "david@example.com" }, duration: 22, createdAt: "2024-01-15 08:15:33" },
    { id: 4, type: "lead_created", status: 200, payload: { name: "מיכל אברהם", email: "michal@example.com" }, duration: 51, createdAt: "2024-01-14 16:45:18" },
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "הועתק ללוח!",
      description: "הטקסט הועתק בהצלחה ללוח",
    })
  }

  const regenerateApiKey = () => {
    toast({
      title: "מפתח חדש נוצר",
      description: "מפתח ה-API עודכן בהצלחה",
    })
  }

  // Load Invoice4U integration status
  useEffect(() => {
    fetch('/api/integrations/invoice4u')
      .then(res => res.json())
      .then(data => {
        if (data.integration && data.integration.isActive) {
          setInvoice4uConnected(true)
        }
      })
      .catch(console.error)
  }, [])

  // Load PayPlus integration status
  useEffect(() => {
    fetch('/api/integrations/payplus')
      .then(res => res.json())
      .then(data => {
        if (data.integration && data.integration.isActive) {
          setPayplusConnected(true)
          const config = data.integration.config || {}
          if (config.paymentPageUid) {
            setPayplusPaymentPageUid(config.paymentPageUid)
          }
          if (config.useProduction) {
            setPayplusUseProduction(true)
          }
        }
      })
      .catch(console.error)
  }, [])

  const connectInvoice4U = async () => {
    if (!invoice4uEmail || !invoice4uPassword) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setInvoice4uLoading(true)
    try {
      const res = await fetch('/api/integrations/invoice4u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invoice4uEmail,
          password: invoice4uPassword,
          name: 'Invoice4U',
          useProduction,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setInvoice4uConnected(true)
        toast({
          title: "הצלחה!",
          description: "החיבור ל-Invoice4U הושלם בהצלחה",
        })
      } else {
        console.error('Invoice4U connection failed:', data)
        toast({
          title: "שגיאה בהתחברות",
          description: data.error || data.details || "לא הצלחנו להתחבר ל-Invoice4U. אנא בדוק את פרטי ההתחברות.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בחיבור ל-Invoice4U",
        variant: "destructive",
      })
    } finally {
      setInvoice4uLoading(false)
    }
  }

  const testInvoice4UConnection = async () => {
    if (!invoice4uEmail || !invoice4uPassword) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setInvoice4uTesting(true)
    try {
      // בודק תחילה אם יש אינטגרציה קיימת - אם כן, נשתמש בה
      // אם לא, נבדוק ישירות עם הפרטים שמילא המשתמש
      const testRes = await fetch('/api/integrations/invoice4u/test')
      
      if (testRes.status === 401) {
        // לא מחובר - צריך להתחבר תחילה
        toast({
          title: "💡 טיפ",
          description: "לא נמצא חיבור קיים. נא ללחוץ על 'התחבר ל-Invoice4U' כדי לשמור את הפרטים.",
        })
        setInvoice4uTesting(false)
        return
      }

      if (testRes.status === 400) {
        // אין אינטגרציה - צריך להתחבר תחילה
        toast({
          title: "💡 טיפ",
          description: "יש ללחוץ על 'התחבר ל-Invoice4U' קודם כדי לשמור את הפרטים.",
        })
        setInvoice4uTesting(false)
        return
      }

      const data = await testRes.json()

      if (testRes.ok) {
        toast({
          title: "✅ החיבור תקין!",
          description: data.message || "ההתחברות ל-Invoice4U עבדה בהצלחה. כל המסמכים זמינים!",
        })
        console.log('✅ Connection test successful:', data)
      } else {
        console.error('❌ Connection test failed:', data)
        toast({
          title: "❌ החיבור נכשל",
          description: data.error || "לא הצלחנו להתחבר. נסה להתנתק ולהתחבר שוב.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Connection test error:', error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת החיבור",
        variant: "destructive",
      })
    } finally {
      setInvoice4uTesting(false)
    }
  }

  const disconnectInvoice4U = async () => {
    try {
      const res = await fetch('/api/integrations/invoice4u', {
        method: 'DELETE',
      })

      if (res.ok) {
        setInvoice4uConnected(false)
        setInvoice4uEmail("")
        setInvoice4uPassword("")
        toast({
          title: "הצלחה",
          description: "החיבור ל-Invoice4U נותק",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בניתוק מ-Invoice4U",
        variant: "destructive",
      })
    }
  }

  const testPayPlusConnection = async () => {
    if (!payplusApiKey || !payplusSecretKey || !payplusPaymentPageUid) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setPayplusTesting(true)
    try {
      const res = await fetch('/api/integrations/payplus/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: payplusApiKey,
          secretKey: payplusSecretKey,
          paymentPageUid: payplusPaymentPageUid,
          useProduction: payplusUseProduction,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: "הצלחה!",
          description: data.message || "החיבור ל-PayPlus תקין",
        })
      } else {
        toast({
          title: "שגיאה בבדיקה",
          description: data.error || data.details || "לא הצלחנו לבדוק את החיבור",
          variant: "destructive",
          duration: 10000,
        })
      }
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת החיבור",
        variant: "destructive",
      })
    } finally {
      setPayplusTesting(false)
    }
  }

  const connectPayPlus = async () => {
    if (!payplusApiKey || !payplusSecretKey || !payplusPaymentPageUid) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות",
        variant: "destructive",
      })
      return
    }

    setPayplusLoading(true)
    try {
      const res = await fetch('/api/integrations/payplus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: payplusApiKey,
          secretKey: payplusSecretKey,
          paymentPageUid: payplusPaymentPageUid,
          name: 'PayPlus',
          useProduction: payplusUseProduction,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPayplusConnected(true)
        toast({
          title: "הצלחה!",
          description: "החיבור ל-PayPlus הושלם בהצלחה",
        })
      } else {
        console.error('PayPlus connection failed:', data)
        toast({
          title: "שגיאה בהתחברות",
          description: data.error || data.details || "לא הצלחנו להתחבר ל-PayPlus. אנא בדוק את פרטי ההתחברות.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בחיבור ל-PayPlus",
        variant: "destructive",
      })
    } finally {
      setPayplusLoading(false)
    }
  }

  const disconnectPayPlus = async () => {
    try {
      const res = await fetch('/api/integrations/payplus', {
        method: 'DELETE',
      })

      if (res.ok) {
        setPayplusConnected(false)
        setPayplusApiKey("")
        setPayplusSecretKey("")
        setPayplusPaymentPageUid("")
        toast({
          title: "התנתקות הצליחה",
          description: "החיבור ל-PayPlus נותק",
        })
      } else {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו להתנתק",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתנתקות",
        variant: "destructive",
      })
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">אינטגרציות ו-Webhooks</h1>
          <p className="text-gray-500 mt-1">נהל את האינטגרציות והחיבורים עם מערכות חיצוניות</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {[
              { key: "api", label: "API & Webhooks" },
              { key: "integrations", label: "אינטגרציות" },
              { key: "logs", label: "לוגים" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-600 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* API & Webhooks Tab */}
        {activeTab === "api" && (
          <div className="space-y-6">
            {/* API Key Section */}
            <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>מפתח API</CardTitle>
            <CardDescription>
              השתמש במפתח זה לשליחת נתונים למערכת דרך ה-API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>מפתח API שלך</Label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    readOnly
                    className="font-mono pr-10"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button variant="outline" onClick={() => copyToClipboard(apiKey)}>
                  <Copy className="w-4 h-4 ml-2" />
                  העתק
                </Button>
                <Button variant="outline" onClick={regenerateApiKey}>
                  <RefreshCw className="w-4 h-4 ml-2" />
                  חדש
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ⚠️ שמור את המפתח במקום מאובטח. אל תשתף אותו באופן ציבורי.
              </p>
            </div>
          </CardContent>
            </Card>

            {/* Webhook Endpoint */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Webhook - קבלת לידים</CardTitle>
                <CardDescription>
                  שלח לידים חדשים למערכת דרך Webhook
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Endpoint URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="text"
                      value="https://your-domain.com/api/webhooks/leads"
                      readOnly
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={() => copyToClipboard("https://your-domain.com/api/webhooks/leads")}>
                      <Copy className="w-4 h-4 ml-2" />
                      העתק
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">דוגמת שימוש</h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
{`POST /api/webhooks/leads
Content-Type: application/json
X-API-KEY: ${apiKey}

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+972501234567",
  "source": "Facebook Ads",
  "tags": ["hot-lead", "enterprise"]
}`}
                  </pre>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline">
                    <ExternalLink className="w-4 h-4 ml-2" />
                    תיעוד API
                  </Button>
                  <Button variant="outline">שלח בדיקה</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            {/* Invoice4U Integration */}
            <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Invoice4U - הוצאת מסמכים</CardTitle>
                  <CardDescription>
                    חבר את החשבון שלך ב-Invoice4U להוצאת הצעות מחיר, חשבוניות ומסמכים
                  </CardDescription>
                </div>
              </div>
              {invoice4uConnected && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">מחובר</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!invoice4uConnected ? (
              <>
                <div>
                  <Label htmlFor="invoice4u-email">אימייל Invoice4U</Label>
                  <Input
                    id="invoice4u-email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={invoice4uEmail}
                    onChange={(e) => setInvoice4uEmail(e.target.value)}
                    className="mt-2"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="invoice4u-password">סיסמה</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 relative">
                      <Input
                        id="invoice4u-password"
                        type={showInvoice4uPassword ? "text" : "password"}
                        placeholder="הזן את סיסמת Invoice4U"
                        value={invoice4uPassword}
                        onChange={(e) => setInvoice4uPassword(e.target.value)}
                        className="pr-10"
                        dir="ltr"
                      />
                      <button
                        onClick={() => setShowInvoice4uPassword(!showInvoice4uPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showInvoice4uPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-production"
                    checked={useProduction}
                    onChange={(e) => setUseProduction(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="use-production" className="font-normal cursor-pointer">
                    שימוש בסביבת ייצור (Production)
                  </Label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-blue-900">
                    💡 <strong>איפה למצוא את הפרטים?</strong>
                  </p>
                  <p className="text-sm text-blue-700">
                    השתמש באותם פרטי התחברות שאתה משתמש בהם כדי להיכנס ל-<a href="https://www.invoice4u.co.il" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">Invoice4U</a>
                  </p>
                  <ul className="text-xs text-blue-600 mr-4 space-y-1">
                    <li>• ודא שהאימייל והסיסמה נכונים (ללא רווחים)</li>
                    <li>• בחר "Production" אם זה חשבון ייצור</li>
                    <li>• אם השגיאה חוזרת, נסה לאפס את הסיסמה ב-Invoice4U</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={testInvoice4UConnection}
                    disabled={invoice4uTesting || invoice4uLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    {invoice4uTesting ? "בודק..." : "🔍 בדוק חיבור"}
                  </Button>
                  <Button
                    onClick={connectInvoice4U}
                    disabled={invoice4uLoading || invoice4uTesting}
                    className="flex-1 prodify-gradient text-white"
                  >
                    {invoice4uLoading ? "מתחבר..." : "התחבר ל-Invoice4U"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900 font-medium">
                    ✅ החשבון מחובר בהצלחה!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    כעת תוכל להוציא מסמכים ישירות מדפי הלקוחות והלידים
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">מסמכים זמינים:</h4>
                  <ul className="text-sm text-gray-600 space-y-1 mr-4">
                    <li>• הצעת מחיר (InvoiceQuote)</li>
                    <li>• חשבון עסקה (ProformaInvoice)</li>
                    <li>• חשבונית מס (Invoice)</li>
                    <li>• חשבונית מס קבלה (InvoiceReceipt)</li>
                  </ul>
                </div>

                <Button
                  onClick={disconnectInvoice4U}
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  נתק חיבור
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* PayPlus Integration */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>PayPlus - תשלומים</CardTitle>
                  <CardDescription>
                    חבר את החשבון שלך ב-PayPlus לעיבוד תשלומים מאובטחים
                  </CardDescription>
                </div>
              </div>
              {payplusConnected && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">מחובר</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!payplusConnected ? (
              <>
                <div>
                  <Label htmlFor="payplus-api-key">API Key</Label>
                  <Input
                    id="payplus-api-key"
                    type="text"
                    placeholder="הזן את ה-API Key מ-PayPlus"
                    value={payplusApiKey}
                    onChange={(e) => setPayplusApiKey(e.target.value)}
                    className="mt-2"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label htmlFor="payplus-secret-key">Secret Key</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 relative">
                      <Input
                        id="payplus-secret-key"
                        type={showPayplusSecretKey ? "text" : "password"}
                        placeholder="הזן את ה-Secret Key מ-PayPlus"
                        value={payplusSecretKey}
                        onChange={(e) => setPayplusSecretKey(e.target.value)}
                        className="pr-10"
                        dir="ltr"
                      />
                      <button
                        onClick={() => setShowPayplusSecretKey(!showPayplusSecretKey)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPayplusSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="payplus-payment-page-uid">Payment Page UID</Label>
                  <Input
                    id="payplus-payment-page-uid"
                    type="text"
                    placeholder="הזן את ה-Payment Page UID מ-PayPlus"
                    value={payplusPaymentPageUid}
                    onChange={(e) => setPayplusPaymentPageUid(e.target.value)}
                    className="mt-2"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="payplus-use-production"
                    checked={payplusUseProduction}
                    onChange={(e) => setPayplusUseProduction(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="payplus-use-production" className="font-normal cursor-pointer">
                    שימוש בסביבת ייצור (Production)
                  </Label>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-orange-900">
                    💡 <strong>איפה למצוא את הפרטים?</strong>
                  </p>
                  <p className="text-sm text-orange-700">
                    התחבר ל-<a href="https://www.payplus.co.il" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-800">PayPlus</a> ונווט ל-API Settings
                  </p>
                  <ul className="text-xs text-orange-600 mr-4 space-y-1">
                    <li>• API Key ו-Secret Key נמצאים תחת API Credentials</li>
                    <li>• Payment Page UID נמצא תחת Payment Pages</li>
                    <li>• בחר "Production" אם זה חשבון ייצור</li>
                    <li>• ודא שיש לך הרשאות מתכנת (Developer) בחשבון</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={testPayPlusConnection}
                    disabled={payplusTesting || payplusLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    {payplusTesting ? "בודק..." : "🔍 בדוק חיבור"}
                  </Button>
                  <Button
                    onClick={connectPayPlus}
                    disabled={payplusLoading || payplusTesting}
                    className="flex-1 prodify-gradient text-white"
                  >
                    {payplusLoading ? "מתחבר..." : "התחבר ל-PayPlus"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900 font-medium">
                    ✅ החשבון מחובר בהצלחה!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    כעת תוכל לעבד תשלומים דרך PayPlus ישירות מההצעות מחיר
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">תכונות זמינות:</h4>
                  <ul className="text-sm text-gray-600 space-y-1 mr-4">
                    <li>• יצירת קישורי תשלום מאובטחים</li>
                    <li>• עיבוד תשלומי כרטיס אשראי</li>
                    <li>• תשלומים בתשלומים</li>
                    <li>• קבלת עדכונים אוטומטיים על תשלומים</li>
                  </ul>
                </div>

                <Button
                  onClick={disconnectPayPlus}
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  נתק חיבור
                </Button>
              </>
            )}
          </CardContent>
            </Card>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            {/* Webhook Logs */}
            <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>לוג Webhooks</CardTitle>
                <CardDescription>מעקב אחר כל הקריאות שהתקבלו</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 ml-2" />
                רענן
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-right">
                    <th className="pb-3 px-4 text-sm font-medium text-gray-500">סטטוס</th>
                    <th className="pb-3 px-4 text-sm font-medium text-gray-500">סוג</th>
                    <th className="pb-3 px-4 text-sm font-medium text-gray-500">Payload</th>
                    <th className="pb-3 px-4 text-sm font-medium text-gray-500">משך זמן</th>
                    <th className="pb-3 px-4 text-sm font-medium text-gray-500">תאריך</th>
                    <th className="pb-3 px-4 text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {log.status === 200 ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">{log.status}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{log.status}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {JSON.stringify(log.payload).substring(0, 50)}...
                        </code>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{log.duration}ms</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{log.createdAt}</td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}


