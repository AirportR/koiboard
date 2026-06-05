import { useCallback, useState } from "react";
import type { ToastMessage } from "../types/config";

let nextToastId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((title: string, message = "", tone: ToastMessage["tone"] = "success") => {
    const id = nextToastId;
    nextToastId += 1;
    setToasts((current) => [...current, { id, title, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, notify, dismiss };
}
