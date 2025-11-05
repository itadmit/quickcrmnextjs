"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, XCircle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive"
        const Icon = isDestructive ? XCircle : CheckCircle2
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="flex items-center gap-2">
                  <Icon 
                    className={`h-4 w-4 flex-shrink-0 ${
                      isDestructive ? "text-red-500" : "text-green-500"
                    }`}
                  />
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}


