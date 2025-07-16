import { toast } from "sonner"

export const useNotifications = () => {
  const showSuccess = (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    })
  }

  const showError = (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 6000,
    })
  }

  const showWarning = (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5000,
    })
  }

  const showInfo = (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    })
  }

  const showPromise = <T,>(
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
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPromise,
  }
}
