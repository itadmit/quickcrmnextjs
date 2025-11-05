"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Loader2,
  FileText,
  Plus,
  Calculator,
  Type,
  CheckCircle,
} from "lucide-react"

interface PDFLoadingDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
}

type LoadingStage = {
  text: string
  icon: React.ComponentType<{ className?: string }>
}

const loadingStages: LoadingStage[] = [
  { text: "מכין הצעה...", icon: FileText },
  { text: "מוסיף את כל הסעיפים...", icon: Plus },
  { text: "מחשב מחיר...", icon: Calculator },
  { text: "מוסיף אותיות קטנות...", icon: Type },
  { text: "הנה זה אצלך...", icon: CheckCircle },
]

export function PDFLoadingDialog({ open, onOpenChange }: PDFLoadingDialogProps) {
  const [currentStage, setCurrentStage] = useState(0)

  useEffect(() => {
    if (!open) {
      setCurrentStage(0)
      return
    }

    const stageIntervals = [
      600, // מכין הצעה
      900, // מוסיף את כל הסעיפים
      800, // מחשב מחיר
      700, // מוסיף אותיות קטנות
      600, // הנה זה אצלך
    ]

    let timeoutIds: NodeJS.Timeout[] = []
    let currentIndex = 0

    const progressStages = () => {
      if (currentIndex < loadingStages.length) {
        setCurrentStage(currentIndex)
        const timeoutId = setTimeout(() => {
          currentIndex++
          if (currentIndex < loadingStages.length) {
            progressStages()
          }
        }, stageIntervals[currentIndex])
        timeoutIds.push(timeoutId)
      }
    }

    progressStages()

    return () => {
      timeoutIds.forEach(id => clearTimeout(id))
      timeoutIds = []
    }
  }, [open])

  const currentStageData = loadingStages[currentStage] || loadingStages[0]
  const progress = ((currentStage + 1) / loadingStages.length) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {/* Spinner */}
          <div className="mb-8">
            <Loader2 className="h-16 w-16 animate-spin text-purple-600" />
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-xs mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stage Text */}
          <div className="text-center space-y-2">
            <div className="mb-4 flex justify-center">
              {(() => {
                const IconComponent = currentStageData.icon
                return <IconComponent className="h-12 w-12 text-purple-600" />
              })()}
            </div>
            <DialogDescription className="text-lg font-medium text-gray-700">
              {currentStageData.text}
            </DialogDescription>
            
            {/* Stage Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {loadingStages.map((stage, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    index <= currentStage
                      ? "bg-purple-600 scale-125"
                      : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

