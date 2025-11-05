"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Settings, Upload, X, Trash2, BookOpen } from "lucide-react"

interface QuoteSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuoteSettingsDialog({
  open,
  onOpenChange,
}: QuoteSettingsDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // הגדרות עיצוב
  const [primaryColor, setPrimaryColor] = useState("#FF6B6B")
  const [secondaryColor, setSecondaryColor] = useState("#1e3a8a")
  const [logoUrl, setLogoUrl] = useState("")
  const [tagline, setTagline] = useState("")

  // פרטי חברה
  const [vatId, setVatId] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")

  // תבניות
  const [templates, setTemplates] = useState<any[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchSettings()
      fetchTemplates()
    }
  }, [open])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/company/settings")
      if (res.ok) {
        const data = await res.json()
        const settings = data.settings || {}
        const quoteTemplate = settings.quoteTemplate || {}
        const companyInfo = settings.companyInfo || {}

        setPrimaryColor(quoteTemplate.primaryColor || "#FF6B6B")
        setSecondaryColor(quoteTemplate.secondaryColor || "#1e3a8a")
        setLogoUrl(quoteTemplate.logoUrl || "")
        setTagline(quoteTemplate.tagline || companyInfo.tagline || "")
        setVatId(companyInfo.vatId || settings.vatId || "")
        setAddress(companyInfo.address || settings.address || "")
        setPhone(companyInfo.phone || settings.phone || "")
        setEmail(companyInfo.email || settings.email || "")
        setWebsite(companyInfo.website || settings.website || "")
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את ההגדרות",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    setTemplatesLoading(true)
    try {
      const res = await fetch("/api/quotes/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setTemplatesLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את התבנית הזו?")) {
      return
    }

    try {
      const res = await fetch(`/api/quotes/templates/${templateId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: "התבנית נמחקה בהצלחה",
        })
        fetchTemplates()
      } else {
        throw new Error("Failed to delete template")
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו למחוק את התבנית",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const settings = {
        quoteTemplate: {
          primaryColor,
          secondaryColor,
          logoUrl: logoUrl || null,
          tagline: tagline || null,
        },
        companyInfo: {
          vatId: vatId || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          tagline: tagline || null,
        },
      }

      const res = await fetch("/api/company/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        toast({
          title: "הצלחה",
          description: "ההגדרות נשמרו בהצלחה",
        })
        onOpenChange(false)
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לשמור את ההגדרות",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // כאן צריך להוסיף לוגיקה להעלאת תמונה ל-storage
    // בינתיים נשמור את זה כ-URL
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setLogoUrl(result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            הגדרות הצעות מחיר
          </DialogTitle>
          <DialogDescription>
            הגדר את העיצוב והפרטים של הצעות המחיר שלך
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">טוען...</div>
          </div>
        ) : (
          <div className="space-y-6 mt-4" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {/* עיצוב וצבעים */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">עיצוב וצבעים</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">צבע ראשי</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#FF6B6B"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">צבע משני</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#1e3a8a"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="logo">לוגו החברה</Label>
                <div className="mt-2">
                  {logoUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-20 w-20 object-contain border rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => setLogoUrl("")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <span className="text-sm text-gray-600">העלה לוגו</span>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* פרטי חברה */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">פרטי חברה</h3>
              
              <div>
                <Label htmlFor="tagline">טאג ליין</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="הכנס טאג ליין"
                  className="mt-2 break-words"
                  style={{ wordBreak: 'break-word' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vatId">עוסק מורשה</Label>
                  <Input
                    id="vatId"
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value)}
                    placeholder="הכנס מספר עוסק מורשה"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">טלפון</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="הכנס מספר טלפון"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">כתובת</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="הכנס כתובת"
                  className="mt-2 break-words"
                  style={{ wordBreak: 'break-word' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">דוא״ל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הכנס כתובת אימייל"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="website">אתר אינטרנט</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="הכנס כתובת אתר"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* תבניות */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">תבניות שמורות</h3>
              
              {templatesLoading ? (
                <div className="text-center py-4 text-gray-500">טוען...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  אין תבניות שמורות. שמור תבנית ממודל העריכה של הצעה.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 break-words">
                          {template.title}
                        </div>
                        {template.description && (
                          <div className="text-sm text-gray-500 mt-1 break-words whitespace-pre-wrap">
                            {template.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {template.items.length} פריטים • {template.templateType === "professional" ? "תבנית מקצועית" : "תבנית פשוטה"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* כפתורים */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {saving ? "שומר..." : "שמור"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

