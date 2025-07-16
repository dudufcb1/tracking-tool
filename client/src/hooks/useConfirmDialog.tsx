import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"

interface ConfirmDialogProps {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  icon?: 'warning' | 'delete'
}

interface ConfirmDialogState extends ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState | null>(null)

  const showConfirm = (props: ConfirmDialogProps): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        ...props,
        isOpen: true,
        onConfirm: () => {
          setDialogState(null)
          resolve(true)
        },
        onCancel: () => {
          setDialogState(null)
          resolve(false)
        }
      })
    })
  }

  const ConfirmDialog = () => {
    if (!dialogState) return null

    const IconComponent = dialogState.icon === 'delete' ? Trash2 : AlertTriangle
    const iconColor = dialogState.variant === 'destructive' ? 'text-red-500' : 'text-yellow-500'

    return (
      <Dialog open={dialogState.isOpen} onOpenChange={() => dialogState.onCancel()}>
        <DialogContent className="sm:max-w-[425px] bg-white text-gray-900 border border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 font-semibold">
              <IconComponent className={`h-5 w-5 ${iconColor}`} />
              {dialogState.title}
            </DialogTitle>
            <DialogDescription className="text-left text-gray-700 mt-2">
              {dialogState.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button
              variant="outline"
              onClick={dialogState.onCancel}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              {dialogState.cancelText || 'Cancelar'}
            </Button>
            <Button
              variant={dialogState.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={dialogState.onConfirm}
              className={dialogState.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white font-medium' : 'bg-blue-600 hover:bg-blue-700 text-white font-medium'}
            >
              {dialogState.confirmText || 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return {
    showConfirm,
    ConfirmDialog
  }
}
