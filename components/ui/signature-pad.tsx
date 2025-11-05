"use client"

import { useRef, useEffect, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "./button"
import { Trash2 } from "lucide-react"

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void
  width?: number
  height?: number
}

export function SignaturePad({ 
  onSignatureChange, 
  width,
  height = 200 
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(width || 400)

  const clear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear()
      onSignatureChange(null)
    }
  }

  const save = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataURL = sigPadRef.current.toDataURL("image/png")
      onSignatureChange(dataURL)
    } else {
      onSignatureChange(null)
    }
  }

  const handleEnd = () => {
    save()
  }

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        setCanvasWidth(containerWidth)
      }
    }

    // עדכון ראשוני
    updateWidth()
    
    // עדכון אחרי שהקומפוננטה נטענה
    const timeoutId = setTimeout(updateWidth, 100)
    
    // עדכון כשיש resize
    window.addEventListener('resize', updateWidth)
    
    // ResizeObserver לעדכון כשה-container משתנה
    const resizeObserver = new ResizeObserver(() => {
      updateWidth()
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      window.removeEventListener('resize', updateWidth)
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div className="space-y-3 w-full" dir="rtl" ref={containerRef}>
      <div className="border-2 border-gray-300 rounded-lg bg-white w-full" style={{ height }}>
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            width: canvasWidth,
            height,
            className: "signature-canvas",
          }}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          size="sm"
        >
          <Trash2 className="w-4 h-4 ml-2" />
          נקה
        </Button>
        <p className="text-sm text-gray-600 flex items-center">
          אנא חתום בשדה לעיל
        </p>
      </div>
    </div>
  )
}

