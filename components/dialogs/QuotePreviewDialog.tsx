"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { PDFLoadingDialog } from "./PDFLoadingDialog"
import { useToast } from "@/components/ui/use-toast"

interface QuotePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quoteId: string
  quoteNumber: string
}

export function QuotePreviewDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
}: QuotePreviewDialogProps) {
  const [loading, setLoading] = useState(true)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [pdfLoadingOpen, setPdfLoadingOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && quoteId) {
      setLoading(true)
      // טעינת HTML ישירות
      fetch(`/api/quotes/${quoteId}/html`)
        .then(res => res.text())
        .then(html => {
          setHtmlContent(html)
          setLoading(false)
        })
        .catch(error => {
          console.error("Error loading HTML:", error)
          setLoading(false)
        })
    } else {
      setHtmlContent(null)
    }
  }, [open, quoteId])

  const handleDownload = async () => {
    try {
      // פתיחת modal הטעינה
      setPdfLoadingOpen(true)

      const res = await fetch(`/api/quotes/${quoteId}/pdf`)
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `quote-${quoteNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        // סגירת modal אחרי שההורדה הסתיימה
        setTimeout(() => {
          setPdfLoadingOpen(false)
          toast({
            title: "הצלחה",
            description: "ה-PDF הורד בהצלחה",
          })
        }, 500)
      } else {
        throw new Error("Failed to download PDF")
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      setPdfLoadingOpen(false)
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להוריד את ה-PDF",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold">
                תצוגה מקדימה - הצעת מחיר {quoteNumber}
              </DialogTitle>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  הורד PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden bg-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-[70vh]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : htmlContent ? (
              <div className="w-full h-[70vh] overflow-auto bg-white">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-full border-0"
                  title={`Preview of quote ${quoteNumber}`}
                  sandbox="allow-same-origin"
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <PDFLoadingDialog
        open={pdfLoadingOpen}
        onOpenChange={setPdfLoadingOpen}
      />
    </>
  )
}

