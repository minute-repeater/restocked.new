import { useEffect, useState } from "react"
import { Toast } from "./toast"
import { createPortal } from "react-dom"

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

let toastId = 0;
const toasts: ToastData[] = [];
const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export function toast(data: Omit<ToastData, "id">) {
  const id = String(++toastId);
  const toastData: ToastData = { ...data, id };
  toasts.push(toastData);
  notify();
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    dismiss(id);
  }, 5000);
  
  return id;
}

export function dismiss(id: string) {
  const index = toasts.findIndex((t) => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    notify();
  }
}

export function Toaster() {
  const [, setUpdate] = useState(0);

  useEffect(() => {
    const listener = () => setUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toastData) => (
        <Toast
          key={toastData.id}
          {...toastData}
          onClose={() => dismiss(toastData.id)}
        />
      ))}
    </div>,
    document.body
  );
}

