
import React, { useMemo, useState } from 'react';
import { TuitionRecord, PaymentHistoryItem } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useFinance } from '../../context/FinanceContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { useToast } from '../../context/ToastContext';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TuitionRecord | null;
  role: 'master' | 'student';
  paymentHistory?: PaymentHistoryItem[];
  onPay?: (record: TuitionRecord) => void;
  onDownloadReceipt?: (record: TuitionRecord) => void;
  onApprove?: (record: TuitionRecord) => void;
  onReject?: (record: TuitionRecord) => void;
  onReview?: (record: TuitionRecord) => void; 
  onDelete?: () => void; 
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  role,
  paymentHistory = [],
  onPay,
  onDownloadReceipt,
  onApprove,
  onReject,
  onReview,
  onDelete
}) => {
  const { markAsPaidByMaster, updateRecordAmount } = useFinance();
  const { confirm } = useConfirmation();
  const { addToast } = useToast();

  const [isPayingManual, setIsPayingManual] = useState(false);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualMethod, setManualMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta'>('Efectivo');
  const [manualNote, setManualNote] = useState('');
  
  const [isAdjustingTotal, setIsAdjustingTotal] = useState(false);
  const [adjustedTotal, setAdjustedTotal] = useState<string>('');

  const remainingDebt = useMemo(() => {
    if (!record) return 0;
    return record.amount + (record.penaltyAmount || 0);
  }, [record]);

  React.useEffect(() => {
    if (isOpen && record) {
        setIsPayingManual(false);
        setIsAdjustingTotal(false);
        setManualAmount(remainingDebt.toString());
        setAdjustedTotal(remainingDebt.toString());
        setManualNote('');
        setManualMethod('Efectivo');
    }
  }, [isOpen, record, remainingDebt]);

  if (!isOpen || !record) return null;

  // --- LOGIC IMPLEMENTATION (RECONSTRUCTION METHOD) ---
  
  // 1. Total Paid History
  const totalPaid = (paymentHistory || []).reduce((acc, curr) => acc + curr.amount, 0);
  
  // 2. Current Debt
  const currentDebt = record.amount + (record.penaltyAmount || 0);

  // 3. Grand Total (Reconstructed Total Value of Transaction)
  const grandTotal = totalPaid + currentDebt;

  // 4. Base Amount (Use originalAmount if available, else assume current Grand Total is base)
  const baseAmount = record.originalAmount !== undefined ? record.originalAmount : grandTotal;

  // 5. Implied Penalty (Difference between what it costs now vs original base)
  let impliedPenalty = grandTotal - baseAmount;
  if (impliedPenalty < 0.01) impliedPenalty = 0;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': return { label: 'Pagado', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'check_circle' };
      case 'overdue': return { label: 'Vencido', color: 'text-red-700', bg: 'bg-red-50', icon: 'warning' };
      case 'partial': return { label: 'Parcial', color: 'text-amber-700', bg: 'bg-amber-50', icon: 'pie_chart' };
      case 'in_review': return { label: 'Revisión', color: 'text-blue-700', bg: 'bg-blue-50', icon: 'hourglass_top' };
      default: return { label: 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-100', icon: 'pending' };
    }
  };

  const statusConfig = getStatusConfig(record.status);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const handleApplyAdjustment = () => {
      const newTotalNum = parseFloat(adjustedTotal);
      if (isNaN(newTotalNum) || newTotalNum < 0) return;
      
      confirm({
          title: 'Ajustar Deuda Total',
          message: `¿Deseas cambiar el monto total de este movimiento a ${formatMoney(newTotalNum)}? Útil para aplicar becas o descuentos especiales.`,
          type: 'info',
          confirmText: 'Aplicar Cambio',
          onConfirm: () => {
              updateRecordAmount(record.id, newTotalNum);
              setIsAdjustingTotal(false);
              setManualAmount(newTotalNum.toString());
              addToast('Monto total ajustado correctamente', 'success');
          }
      });
  };

  const handleConfirmManualPayment = () => {
    const amountNum = parseFloat(manualAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    confirm({
        title: 'Confirmar Pago Manual',
        message: `¿Estás seguro de registrar un pago de ${formatMoney(amountNum)} para este movimiento? Esta acción actualizará el saldo del alumno automáticamente.`,
        type: 'success',
        confirmText: 'Registrar Pago',
        onConfirm: () => {
            markAsPaidByMaster(record.id, amountNum, manualMethod, manualNote);
            setIsPayingManual(false);
            onClose();
        }
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-soft flex flex-col max-h-[90vh] overflow-hidden relative border border-gray-100 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 md:p-8 border-b border-gray-50 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="size-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-transparent ${statusConfig.bg} ${statusConfig.color}`}>
                  <span className="material-symbols-outlined text-sm filled">{statusConfig.icon}</span>
                  {statusConfig.label}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                  {record.category || 'General'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">
                    {record.concept}
                  </h2>
                  {impliedPenalty > 0 && (
                      <span className="text-xs font-bold text-gray-400 hidden md:inline-block">
                          (Base + Recargo)
                      </span>
                  )}
              </div>
            </div>
          </div>
          
          {/* Header Costo Global Logic - Consistent with Abonos */}
          <div className="hidden md:block text-right">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Costo Total</p>
             {impliedPenalty > 0 ? (
                 <div className="flex flex-col items-end gap-0.5">
                     <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                        <span>Base:</span>
                        <span className="tabular-nums">{formatMoney(baseAmount)}</span>
                     </div>
                     <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                        <span>+ Recargo:</span>
                        <span className="tabular-nums">{formatMoney(impliedPenalty)}</span>
                     </div>
                     <div className="border-t border-gray-100 w-full my-0.5"></div>
                     <p className="text-3xl font-black text-slate-900 tabular-nums mt-1">{formatMoney(grandTotal)}</p>
                 </div>
             ) : (
                 <p className="text-3xl font-black text-slate-900 tabular-nums">{formatMoney(grandTotal)}</p>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
          {isPayingManual ? (
              <div className="animate-in slide-in-from-bottom-4 duration-300 flex flex-col gap-6">
                  {/* Becado / Scholarship Section */}
                  {role === 'master' && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">workspace_premium</span>
                                    Ajuste por Beca o Descuento
                                </h4>
                                <p className="text-[11px] text-blue-700 font-medium">Cambia el monto total que el alumno debe pagar por este concepto.</p>
                            </div>
                            <button 
                                onClick={() => setIsAdjustingTotal(!isAdjustingTotal)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAdjustingTotal ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                            >
                                {isAdjustingTotal ? 'Cancelar Ajuste' : 'Ajustar Monto'}
                            </button>
                        </div>
                        
                        {isAdjustingTotal && (
                            <div className="flex items-end gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1 ml-1">Nuevo Monto Total</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold">$</span>
                                        <input 
                                            type="number"
                                            value={adjustedTotal}
                                            onChange={e => setAdjustedTotal(e.target.value)}
                                            className="w-full bg-white border border-blue-200 rounded-xl px-7 py-2.5 text-lg font-bold text-blue-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleApplyAdjustment}
                                    className="h-[46px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">sync_alt</span>
                                    Aplicar Beca
                                </button>
                            </div>
                        )}
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                      <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600">point_of_sale</span>
                        Registrar Pago Manual
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Monto del Pago</label>
                                  <div className="relative">
                                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                      <input 
                                          type="number"
                                          value={manualAmount}
                                          onChange={e => setManualAmount(e.target.value)}
                                          className="w-full bg-white border border-gray-200 rounded-xl px-8 py-4 text-2xl font-black text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Método de Pago</label>
                                  <div className="grid grid-cols-3 gap-2">
                                      {['Efectivo', 'Transferencia', 'Tarjeta'].map((m) => (
                                          <button
                                              key={m}
                                              onClick={() => setManualMethod(m as any)}
                                              className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                                                  manualMethod === m 
                                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' 
                                                  : 'bg-white text-slate-500 border-gray-200 hover:border-emerald-200 hover:text-emerald-600'
                                              }`}
                                          >
                                              {m}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Motivo o Nota del Maestro</label>
                              <textarea 
                                  value={manualNote}
                                  onChange={e => setManualNote(e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none h-44"
                                  placeholder="Ej: Pago recibido en el dojo, alumno entregó efectivo..."
                              />
                          </div>
                      </div>

                      <div className="flex gap-4 mt-10 pt-8 border-t border-gray-100">
                          <button 
                            onClick={() => setIsPayingManual(false)}
                            className="flex-1 py-4 bg-white border border-gray-200 rounded-xl font-bold text-slate-500 hover:bg-gray-100 transition-all uppercase tracking-wide text-xs"
                          >
                              Cancelar
                          </button>
                          <button 
                            onClick={handleConfirmManualPayment}
                            className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 uppercase tracking-wide text-xs active:scale-95 flex items-center justify-center gap-2"
                          >
                              <span className="material-symbols-outlined text-lg">check_circle</span>
                              Confirmar Liquidación
                          </button>
                      </div>
                  </div>
              </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Costo Global - Card Version with Breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-auto min-h-[7rem]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <span className="material-symbols-outlined text-lg">receipt_long</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Costo Global</span>
                  </div>
                  
                  {impliedPenalty > 0 ? (
                      <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                              <span>Base:</span>
                              <span>{formatMoney(baseAmount)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-red-500 font-bold">
                              <span>+ Recargo:</span>
                              <span>{formatMoney(impliedPenalty)}</span>
                          </div>
                          <div className="border-t border-gray-100 my-1"></div>
                          <span className="text-xl font-bold text-slate-900 tabular-nums">{formatMoney(grandTotal)}</span>
                      </div>
                  ) : (
                      <span className="text-2xl font-bold text-slate-900 tabular-nums mt-auto">{formatMoney(grandTotal)}</span>
                  )}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-auto min-h-[7rem]">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <span className="material-symbols-outlined text-lg">payments</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Abonado</span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-700 tabular-nums mt-auto">{formatMoney(totalPaid)}</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-auto min-h-[7rem]">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <span className="material-symbols-outlined text-lg">pie_chart</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Restante</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 tabular-nums mt-auto">{formatMoney(remainingDebt)}</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-auto min-h-[7rem]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <span className="material-symbols-outlined text-lg">event</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Vence</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900 tabular-nums mt-auto">{formatDateDisplay(record.dueDate)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400">history</span>
                  Historial de Movimientos
                </h3>

                {paymentHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">savings</span>
                    <p className="text-sm font-medium">Aún no se han registrado pagos.</p>
                  </div>
                ) : (
                  <div className="space-y-0 relative">
                    <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-gray-200"></div>
                    {paymentHistory.map((item, idx) => (
                      <div key={idx} className="relative pl-12 pb-8 last:pb-0 group">
                        <div className="absolute left-0 top-1 size-10 rounded-full bg-white border-4 border-gray-100 flex items-center justify-center z-10 shadow-sm">
                          <div className="size-3 bg-slate-400 rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-start bg-white p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors shadow-sm">
                            <div>
                                <p className="text-sm font-bold text-slate-900 capitalize">
                                    {formatDateDisplay(item.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wide">
                                        {item.method || 'Sistema'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                        {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-slate-900 tabular-nums">{formatMoney(item.amount)}</span>
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Abonado</p>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!isPayingManual && (
            <div className="p-6 border-t border-gray-50 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 font-bold border border-gray-100">
                        {record.studentName.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{record.studentName}</p>
                        <p className="text-xs text-gray-500">Alumno</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto items-center">
                    {role === 'master' && onDelete && (
                        <button 
                            onClick={onDelete}
                            className="mr-2 p-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors active:scale-95"
                            title="Eliminar Registro"
                        >
                            <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                    )}

                    {role === 'student' && (
                        <>
                            {remainingDebt > 0 && onPay && (
                                <button 
                                    onClick={() => record.status !== 'in_review' && onPay(record)}
                                    disabled={record.status === 'in_review'}
                                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide text-xs ${
                                        record.status === 'in_review'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-lg">
                                        {record.status === 'in_review' ? 'hourglass_top' : 'credit_card'}
                                    </span>
                                    {record.status === 'in_review' ? 'En Revisión' : 'Pagar'}
                                </button>
                            )}
                            {(record.status === 'paid' || record.status === 'partial') && onDownloadReceipt && (
                                <button 
                                    onClick={() => onDownloadReceipt(record)}
                                    className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-slate-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                                >
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    Recibo
                                </button>
                            )}
                        </>
                    )}

                    {role === 'master' && (
                        <>
                            {remainingDebt > 0 && (
                                <button 
                                    onClick={() => setIsPayingManual(true)}
                                    className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-95 text-xs uppercase tracking-wide shadow-lg shadow-emerald-600/20"
                                >
                                    <span className="material-symbols-outlined text-lg">payments</span>
                                    Marcar Pagado
                                </button>
                            )}
                            
                            {record.status === 'in_review' ? (
                                <button 
                                    onClick={() => {
                                        if (onReview) {
                                            onReview(record);
                                            onClose(); 
                                        }
                                    }}
                                    className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-95 text-xs uppercase tracking-wide shadow-lg shadow-red-600/20"
                                >
                                    <span className="material-symbols-outlined text-lg">fact_check</span>
                                    Revisar
                                </button>
                            ) : (
                                <button 
                                    onClick={() => onDownloadReceipt && onDownloadReceipt(record)}
                                    className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-slate-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                                >
                                    <span className="material-symbols-outlined text-lg">print</span>
                                    Imprimir
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default TransactionDetailModal;
