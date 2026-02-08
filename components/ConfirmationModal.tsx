
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      ></div>

      {/* Modal Content - White card, subtle border */}
      <div className="relative bg-white rounded-3xl shadow-soft border border-gray-100 w-full max-w-md p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-5">
          <div className={`size-16 rounded-2xl flex items-center justify-center ${
            type === 'danger' ? 'bg-red-50 text-red-600' :
            type === 'success' ? 'bg-green-50 text-green-600' :
            'bg-blue-50 text-blue-600'
          }`}>
            <span className="material-symbols-outlined text-3xl filled">
              {type === 'danger' ? 'warning' : type === 'success' ? 'check_circle' : 'info'}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-xs mx-auto">{message}</p>
          </div>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-xl bg-gray-50 font-bold text-gray-500 hover:bg-gray-100 transition-colors text-sm"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 text-sm ${
                type === 'danger' ? 'bg-gradient-to-br from-red-600 to-red-700 shadow-red-600/20' :
                type === 'success' ? 'bg-gradient-to-br from-green-600 to-green-700 shadow-green-600/20' :
                'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-600/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
