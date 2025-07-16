import { useCallback } from "react"
import { toast } from "sonner"

export const useNotifications = () => {
  const showSuccess = useCallback((message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    })
  }, [])

  const showError = useCallback((message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 6000,
    })
  }, [])

  const showWarning = useCallback((message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5000,
    })
  }, [])

  const showInfo = useCallback((message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    })
  }, [])

  const showPromise = useCallback(<T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    })
  }, [])

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPromise,
  }
}
