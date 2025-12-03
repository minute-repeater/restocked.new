import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, title, description, variant = "default", onClose, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
          {
            "bg-white border-gray-200": variant === "default",
            "bg-green-50 border-green-200": variant === "success",
            "bg-red-50 border-red-200": variant === "error",
          },
          className
        )}
        {...props}
      >
        <div className="grid gap-1">
          {title && (
            <div className={cn("text-sm font-semibold", {
              "text-gray-900": variant === "default",
              "text-green-900": variant === "success",
              "text-red-900": variant === "error",
            })}>
              {title}
            </div>
          )}
          {description && (
            <div className={cn("text-sm opacity-90", {
              "text-gray-600": variant === "default",
              "text-green-700": variant === "success",
              "text-red-700": variant === "error",
            })}>
              {description}
            </div>
          )}
        </div>
        {onClose && (
          <button
            className={cn("absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2", {
              "text-gray-950 hover:text-gray-950": variant === "default",
              "text-green-950 hover:text-green-950": variant === "success",
              "text-red-950 hover:text-red-950": variant === "error",
            })}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast }

