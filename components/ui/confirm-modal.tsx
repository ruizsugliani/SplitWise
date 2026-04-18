import { AlertTriangle } from 'lucide-react'
import { ReactNode } from 'react'

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({
  isOpen,
  title = "¿Estás seguro?",
  description,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText = "Confirmar",
  cancelText = "Cancelar"
}: ConfirmModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-xs w-full shadow-2xl text-center">
        
        {/* Ícono de Advertencia */}
        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        
        {/* Textos */}
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm mb-6">
          {description}
        </p>
        
        {/* Botones */}
        <div className="flex gap-3">
            <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <span className="animate-pulse">Cargando...</span>
            ) : (
              confirmText
            )}
          </button>

          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          
          
        </div>
      </div>
    </div>
  )
}