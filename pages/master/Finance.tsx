
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { TuitionRecord, TuitionStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { generateReceipt } from '../../utils/pdfGenerator';
import { formatDateDisplay } from '../../utils/dateUtils';
import EmptyState from '../../components/ui/EmptyState';
import CreateChargeModal from '../../components/finance/CreateChargeModal';
import TransactionDetailModal from '../../components/ui/TransactionDetailModal';

// --- HELPER COMPONENTS ---

const StatusBadge: React.FC<{ status: TuitionStatus; amount: number; penalty: number }> = ({ status, amount, penalty }) => {
    switch (status) {
        case 'paid':
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[12px] filled">check_circle</span>
                    Pagado
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[12px] filled">hourglass_top</span>
                    Revisión
                </span>
            );
        case 'overdue':
            return (
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-700 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[12px] filled">warning</span>
                        Vencido
                    </span>
                    {penalty > 0 && <span className="text-[10px] text-red-600 font-bold ml-1 tabular-nums">+${penalty} Mora</span>}
                </div>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[12px] filled">pie_chart</span>
                    Parcial
                </span>
            );
        default: // pending
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[12px]">pending</span>
                    Pendiente
                </span>
            );
    }
};

const DebtAmountEditor = ({ item, onUpdate }: { item: TuitionRecord, onUpdate: (id: string, val: number) => void }) => {
    const totalDebt = item.amount + (item.penaltyAmount || 0);
    const [val, setVal] = useState(totalDebt.toString());
    const { addToast } = useToast();
    
    useEffect(() => {
        const currentTotal = item.amount + (item.penaltyAmount || 0);
        setVal(currentTotal.toString());
    }, [item.amount, item.penaltyAmount]);

    const handleSave = () => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
            onUpdate(item.id, num);
            addToast("Monto actualizado", 'success');
        }
    };

    const currentTotal = item.amount + (item.penaltyAmount || 0);
    const hasChanged = parseFloat(val) !== currentTotal;

    return (
        <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center">
                <div className="relative group">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-xs">$</span>
                    <input 
                        type="number"
                        className="w-20 pl-3 pr-0 py-1 bg-transparent border-none text-xs font-mono font-bold text-slate-900 outline-none focus:bg-gray-50 transition-all text-right rounded-md placeholder-gray-300"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && hasChanged && handleSave()}
                        placeholder="0.00"
                    />
                </div>
            </div>
            
            {hasChanged && (
                <button 
                    onClick={handleSave}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded"
                >
                    Guardar
                </button>
            )}
        </div>
    );
};

interface GroupedTransaction {
    id: string; 
    isBatch: boolean;
    records: TuitionRecord[];
    mainRecord: TuitionRecord; 
    totalOriginalAmount: number; 
    totalRemainingDebt: number;  
    declaredAmount?: number;     
    itemCount: number;
}

const Finance: React.FC = () => {
  const { 
      records, 
      approvePayment, 
      rejectPayment, 
      generateMonthlyBilling, 
      academySettings, 
      currentUser,
      approveBatchPayment,
      rejectBatchPayment,
      updateRecordAmount,
      deleteRecord
  } = useStore();
  
  const { addToast } = useToast();
  const { confirm } = useConfirmation();
  
  const [activeTab, setActiveTab] = useState<'review' | 'pending' | 'overdue' | 'paid' | 'all'>('review');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedGroup, setSelectedGroup] = useState<GroupedTransaction | null>(null);
  const [viewDetailRecord, setViewDetailRecord] = useState<TuitionRecord | null>(null);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);

  // -- DATA PROCESSING --
  const rawFilteredRecords = useMemo(() => {
      let filtered = records;
      if (activeTab === 'review') filtered = filtered.filter(r => r.status === 'in_review');
      else if (activeTab === 'pending') filtered = filtered.filter(r => r.status === 'pending' || r.status === 'charged' || r.status === 'partial');
      else if (activeTab === 'overdue') filtered = filtered.filter(r => r.status === 'overdue');
      else if (activeTab === 'paid') filtered = filtered.filter(r => r.status === 'paid');

      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(r => r.studentName?.toLowerCase().includes(q) || r.concept.toLowerCase().includes(q) || r.amount.toString().includes(q));
      }
      return filtered;
  }, [records, activeTab, searchQuery]);

  const groupedTransactions: GroupedTransaction[] = useMemo(() => {
      const groups: Record<string, TuitionRecord[]> = {};
      const result: GroupedTransaction[] = [];
      const processedIds = new Set<string>();

      rawFilteredRecords.forEach(r => {
          if (r.batchPaymentId && activeTab === 'review') { 
              if (!groups[r.batchPaymentId]) groups[r.batchPaymentId] = [];
              groups[r.batchPaymentId].push(r);
          }
      });

      rawFilteredRecords.forEach(r => {
          if (processedIds.has(r.id)) return;
          if (r.batchPaymentId && groups[r.batchPaymentId] && activeTab === 'review') {
              const batchItems = groups[r.batchPaymentId];
              batchItems.forEach(i => processedIds.add(i.id));
              const declared = batchItems.find(i => i.declaredAmount !== undefined)?.declaredAmount;
              
              // RECONSTRUCTION LOGIC FOR BATCH
              const totalRemaining = batchItems.reduce((acc, item) => acc + item.amount + (item.penaltyAmount || 0), 0);
              const totalPaidHistory = batchItems.reduce((acc, item) => acc + (item.paymentHistory || []).reduce((h, p) => h + p.amount, 0), 0);
              
              result.push({
                  id: r.batchPaymentId,
                  isBatch: true,
                  records: batchItems,
                  mainRecord: r,
                  // Total Value = What is left + What was paid. This is infallible.
                  totalOriginalAmount: totalRemaining + totalPaidHistory,
                  totalRemainingDebt: totalRemaining,
                  declaredAmount: declared,
                  itemCount: batchItems.length
              });
          } else {
              processedIds.add(r.id);
              
              // RECONSTRUCTION LOGIC FOR SINGLE RECORD
              const totalRemaining = r.amount + (r.penaltyAmount || 0);
              const totalPaidHistory = (r.paymentHistory || []).reduce((acc, p) => acc + p.amount, 0);

              result.push({
                  id: r.id,
                  isBatch: false,
                  records: [r],
                  mainRecord: r,
                  // Total Value = What is left + What was paid.
                  totalOriginalAmount: totalRemaining + totalPaidHistory,
                  totalRemainingDebt: totalRemaining,
                  declaredAmount: r.declaredAmount,
                  itemCount: 1
              });
          }
      });
      return result.sort((a, b) => new Date(b.mainRecord.dueDate).getTime() - new Date(a.mainRecord.dueDate).getTime());
  }, [rawFilteredRecords, activeTab]);

  const activeGroup = useMemo(() => {
      if (!selectedGroup) return null;
      const freshRecords = records.filter(r => selectedGroup.records.some(old => old.id === r.id));
      if (freshRecords.length === 0) return null;
      const mainRecord = freshRecords.find(r => r.id === selectedGroup.mainRecord.id) || freshRecords[0];
      
      // RECONSTRUCTION LOGIC FOR MODAL
      const totalRemaining = freshRecords.reduce((acc, item) => acc + item.amount + (item.penaltyAmount || 0), 0);
      const totalPaidHistory = freshRecords.reduce((acc, item) => acc + (item.paymentHistory || []).reduce((h, p) => h + p.amount, 0), 0);

      return {
          ...selectedGroup,
          records: freshRecords,
          mainRecord,
          totalOriginalAmount: totalRemaining + totalPaidHistory,
          totalRemainingDebt: totalRemaining,
          declaredAmount: freshRecords.find(i => i.declaredAmount !== undefined)?.declaredAmount
      };
  }, [selectedGroup, records]);

  const stats = useMemo(() => {
      return {
          review: records.filter(r => r.status === 'in_review').length,
          overdue: records.filter(r => r.status === 'overdue').length,
          pending: records.filter(r => r.status === 'pending' || r.status === 'charged' || r.status === 'partial').length,
      };
  }, [records]);

  // Derived values for review modal
  const amountToApprove = useMemo(() => {
      if (!activeGroup) return 0;
      return activeGroup.declaredAmount !== undefined ? activeGroup.declaredAmount : activeGroup.totalRemainingDebt;
  }, [activeGroup]);

  const previewDistribution = useMemo(() => {
      if (!activeGroup) return [];
      
      let available = amountToApprove;
      
      // --- REGLA DE NEGOCIO: ORDENAMIENTO POR PRIORIDAD EN LA UI ---
      const sortedRecords = [...activeGroup.records].sort((a, b) => {
          const getPriority = (r: TuitionRecord) => {
              const text = (r.concept + (r.category || '')).toLowerCase();
              // Prioridad 0: Mensualidades
              if (text.includes('mensualidad') || text.includes('colegiatura') || r.category === 'Mensualidad') return 0;
              // Prioridad 1: No permiten pagos parciales
              if (r.canBePaidInParts === false) return 1;
              // Prioridad 2: Abonables
              return 2;
          };
          const pA = getPriority(a);
          const pB = getPriority(b);
          if (pA !== pB) return pA - pB;
          // FIFO por fecha a igualdad de peso
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      return sortedRecords.map(r => {
          const text = (r.concept + (r.category || '')).toLowerCase();
          const isMandatory = text.includes('mensualidad') || text.includes('colegiatura') || r.category === 'Mensualidad' || r.canBePaidInParts === false;
          
          const currentPenalty = r.penaltyAmount || 0;
          const totalDebt = r.amount + currentPenalty;
          let paid = 0;
          
          if (isMandatory) {
              // Lógica de "Todo o nada" visual para prioridades altas
              if (available >= totalDebt - 0.01) {
                  paid = totalDebt;
                  available -= totalDebt;
              }
          } else {
              // Lógica de abono para prioridades bajas
              if (available > 0) {
                  paid = Math.min(available, totalDebt);
                  available -= paid;
              }
          }

          const remaining = Math.max(0, totalDebt - paid);
          const isPaidFull = remaining < 0.01;
          
          return {
              ...r,
              _paid: paid,
              _status: isPaidFull ? 'paid' : (paid > 0 ? 'partial' : 'pending')
          };
      });
  }, [activeGroup, amountToApprove]);

  // -- ACTIONS --
  const handleApprove = () => {
      if (!activeGroup) return;
      if (activeGroup.isBatch) approveBatchPayment(activeGroup.id, activeGroup.declaredAmount || activeGroup.totalRemainingDebt);
      else approvePayment(activeGroup.id, activeGroup.totalRemainingDebt);
      setSelectedGroup(null);
  };

  const handleReject = () => {
      if (!activeGroup) return;
      confirm({
          title: activeGroup.isBatch ? 'Rechazar Lote' : 'Rechazar Pago',
          message: 'El estatus volverá a Pendiente.',
          type: 'danger',
          confirmText: 'Rechazar',
          onConfirm: () => {
              if (activeGroup.isBatch) rejectBatchPayment(activeGroup.id);
              else rejectPayment(activeGroup.id);
              setSelectedGroup(null);
          }
      });
  };

  const handleDeleteRecord = (record: TuitionRecord) => {
      setViewDetailRecord(null);
      confirm({
          title: 'Eliminar Movimiento',
          message: 'Esta acción no se puede deshacer.',
          type: 'danger',
          confirmText: 'Eliminar',
          onConfirm: () => deleteRecord(record.id)
      });
  };

  const handleGenerateBilling = () => {
      confirm({
          title: 'Generar Mensualidades',
          message: `¿Generar el cargo de mensualidad para todos los alumnos activos?`,
          type: 'info',
          confirmText: 'Generar',
          onConfirm: () => generateMonthlyBilling()
      });
  };

  const handleExport = () => {
      const data = groupedTransactions.map(g => ({
          Fecha: g.mainRecord.dueDate,
          Alumno: g.mainRecord.studentName,
          Concepto: g.isBatch ? `Lote (${g.itemCount})` : g.mainRecord.concept,
          Monto: g.totalOriginalAmount,
          Estado: g.mainRecord.status,
          Metodo: g.mainRecord.method || '-'
      }));
      exportToCSV(data, `Finanzas_${activeTab}`);
      addToast('Reporte generado', 'success');
  };

  return (
    <div className="flex flex-col h-full bg-white">
        {/* --- HEADER --- */}
        <div className="bg-white border-b border-gray-50 px-6 py-6 md:px-10 sticky top-0 z-20 shadow-sm">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Tesorería</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Conciliación bancaria y gestión de flujos.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="px-4 py-2.5 bg-white border border-gray-100 text-slate-600 font-bold rounded-lg hover:bg-gray-50 transition-all text-xs uppercase tracking-wide flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span> Exportar
                    </button>
                    <button onClick={() => setIsChargeModalOpen(true)} className="px-5 py-2.5 bg-gradient-to-br from-red-600 to-red-700 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-red-600/20 transition-all text-xs uppercase tracking-wide flex items-center gap-2 active:scale-95">
                        <span className="material-symbols-outlined text-lg">add_circle</span> Nuevo Cargo
                    </button>
                    <button onClick={handleGenerateBilling} className="px-5 py-2.5 bg-white border border-gray-100 text-slate-900 font-bold rounded-lg hover:bg-gray-50 transition-all text-xs uppercase tracking-wide flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">payments</span> Generar Mensualidad
                    </button>
                </div>
            </div>

            {/* --- TABS (Borderless) --- */}
            <div className="max-w-[1600px] mx-auto mt-8 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex bg-gray-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                    {[
                        { id: 'review', label: 'Por Revisar', count: stats.review },
                        { id: 'pending', label: 'Pendientes', count: stats.pending },
                        { id: 'overdue', label: 'Vencidos', count: stats.overdue },
                        { id: 'paid', label: 'Pagados', count: null },
                        { id: 'all', label: 'Todos', count: null },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-gray-400 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`ml-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-md text-[9px] ${
                                    tab.id === 'review' ? 'bg-blue-600 text-white' : 
                                    tab.id === 'overdue' ? 'bg-red-600 text-white' : 
                                    activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80 group">
                    <span className="absolute left-4 top-2.5 text-gray-400 material-symbols-outlined text-[18px]">search</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Buscar alumno, concepto..." 
                        className="w-full pl-10 pr-4 py-2 bg-[#F9FAFB] border-transparent rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-300" 
                    />
                </div>
            </div>
        </div>

        {/* --- LIST CONTENT (Structured Minimalism) --- */}
        <div className="flex-1 overflow-y-auto p-6 md:px-10">
            <div className="max-w-[1600px] mx-auto bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden min-h-[400px]">
                {groupedTransactions.length === 0 ? (
                    <EmptyState 
                        title="Sin movimientos financieros" 
                        description={activeTab === 'review' ? "Todas las transacciones han sido conciliadas." : "No se encontraron registros bajo este criterio."}
                        icon="account_balance"
                    />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0 z-10 border-b border-gray-50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alumno</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concepto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Importe</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {groupedTransactions.map(group => {
                                const { mainRecord, isBatch, totalOriginalAmount, totalRemainingDebt, declaredAmount } = group;
                                const isPaid = mainRecord.status === 'paid';
                                const isPartial = mainRecord.status === 'partial' || (declaredAmount !== undefined && declaredAmount < totalOriginalAmount);
                                const paidSoFar = totalOriginalAmount - totalRemainingDebt;
                                const isMensualidad = mainRecord.category === 'Mensualidad' || mainRecord.concept.toLowerCase().includes('mensualidad');
                                const breakdownTooltip = `Total: $${totalOriginalAmount} \nPagado: $${paidSoFar} \nRestante: $${totalRemainingDebt}`;

                                return (
                                    <tr 
                                        key={group.id} 
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer border-b border-gray-50 last:border-0"
                                        onClick={() => setViewDetailRecord(group.mainRecord)}
                                    >
                                        <td className="px-8 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm tabular-nums">{formatDateDisplay(mainRecord.dueDate)}</span>
                                                {mainRecord.paymentDate && (
                                                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                        Pagado: {formatDateDisplay(mainRecord.paymentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 text-sm">{mainRecord.studentName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                            {isBatch ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-purple-600">layers</span>
                                                        Lote ({group.itemCount})
                                                    </span>
                                                    <span className="text-xs mt-0.5 truncate max-w-[200px] text-gray-400">
                                                        {group.records.map(r => r.concept).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-700">{mainRecord.concept}</span>
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[10px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-400 uppercase tracking-wide">{mainRecord.method}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        
                                        <td className="px-6 py-4 text-right" title={breakdownTooltip}>
                                            {mainRecord.status === 'in_review' && !isBatch && isMensualidad ? (
                                                <div className="flex justify-end">
                                                    <DebtAmountEditor 
                                                        item={mainRecord} 
                                                        onUpdate={(id, val) => updateRecordAmount(id, val)} 
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-bold text-sm tabular-nums tracking-tight ${isPaid ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                        ${totalOriginalAmount.toFixed(2)}
                                                    </span>
                                                    {isPartial && !isPaid && (
                                                        <div className="mt-1 flex flex-col items-end gap-0.5">
                                                            <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-emerald-500 rounded-full" 
                                                                    style={{ width: `${(paidSoFar / totalOriginalAmount) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[10px] text-emerald-700 font-bold tabular-nums">
                                                                Abonado: ${paidSoFar.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        
                                        <td className="px-8 py-4 text-right">
                                            {mainRecord.status === 'in_review' ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); }}
                                                    className="bg-gradient-to-br from-red-600 to-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-2 ml-auto shadow-lg shadow-red-600/20 uppercase tracking-wide hover:shadow-red-600/30"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    Validar
                                                </button>
                                            ) : (mainRecord.status === 'paid' || mainRecord.status === 'partial') ? (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (group.isBatch) {
                                                            group.records.forEach(r => generateReceipt(r, academySettings, currentUser));
                                                        } else {
                                                            generateReceipt(mainRecord, academySettings, currentUser);
                                                        }
                                                    }}
                                                    className="size-8 bg-transparent hover:bg-gray-100 text-gray-300 hover:text-slate-900 rounded-lg transition-all flex items-center justify-center ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {group.isBatch ? 'folder_open' : 'receipt_long'}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className="text-gray-200 text-xs font-medium">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* --- REVIEW MODAL --- */}
        {activeGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] shadow-soft border border-gray-100 flex overflow-hidden animate-in zoom-in-95 duration-200">
                    
                    {/* Left: Proof */}
                    <div className="w-1/2 bg-gray-50 flex items-center justify-center relative p-8">
                        {activeGroup.mainRecord.proofUrl ? (
                            activeGroup.mainRecord.proofType?.includes('pdf') ? (
                                <iframe src={activeGroup.mainRecord.proofUrl} className="w-full h-full rounded-2xl shadow-sm border border-gray-200" />
                            ) : (
                                <img src={activeGroup.mainRecord.proofUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-lg" />
                            )
                        ) : (
                            <div className="text-gray-300 flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">broken_image</span>
                                <p className="font-bold text-sm uppercase tracking-wide">Sin comprobante visible</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Details & Action */}
                    <div className="w-1/2 flex flex-col bg-white">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">Conciliación</h2>
                                <p className="text-gray-400 text-sm font-medium">Verifica el monto y distribuye el pago.</p>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-slate-900 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto a Aprobar</p>
                                    <span className="bg-white px-3 py-1 rounded-md text-xs font-bold text-slate-600 uppercase shadow-sm border border-gray-200">
                                        {activeGroup.mainRecord.method}
                                    </span>
                                </div>
                                <p className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">
                                    ${amountToApprove.toFixed(2)}
                                </p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Desglose de Aplicación (Orden de Prioridad)</h4>
                                <div className="space-y-3">
                                    {previewDistribution.map((item: any) => {
                                        const isMensualidadModal = item.category === 'Mensualidad' || item.concept.toLowerCase().includes('mensualidad');
                                        return (
                                            <div key={item.id} className="flex flex-col p-4 bg-white border border-gray-100 rounded-xl relative overflow-hidden group hover:border-gray-200 transition-all shadow-sm">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                    item._status === 'paid' ? 'bg-emerald-500' : item._status === 'partial' ? 'bg-amber-500' : 'bg-red-400'
                                                }`}></div>
                                                
                                                <div className="flex justify-between items-center pl-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-900 block">{item.concept}</span>
                                                            {isMensualidadModal && <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">Prioritario</span>}
                                                        </div>
                                                        <div className="mt-1">
                                                            {isMensualidadModal ? (
                                                                <DebtAmountEditor 
                                                                    item={item} 
                                                                    onUpdate={(id, val) => updateRecordAmount(id, val)}
                                                                />
                                                            ) : (
                                                                <span className="text-xs text-gray-400 font-mono">Total Deuda: ${item.amount + (item.penaltyAmount || 0)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`font-mono font-bold text-lg tabular-nums ${item._status === 'paid' ? 'text-emerald-700' : item._paid > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                                            ${item._paid.toFixed(2)}
                                                        </span>
                                                        <div className={`text-[10px] font-bold uppercase mt-0.5 tracking-wider ${item._status === 'paid' ? 'text-emerald-600' : item._paid > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                                                            {item._status === 'paid' ? 'Cubierto' : item._status === 'partial' ? 'Abono' : 'Sin Saldo'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-white flex gap-4">
                            <button onClick={handleReject} className="px-6 py-4 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-all text-sm uppercase tracking-wide">
                                Rechazar Pago
                            </button>
                            <button onClick={handleApprove} className="flex-1 py-4 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wide shadow-md shadow-red-600/20">
                                <span className="material-symbols-outlined">check_circle</span>
                                Confirmar y Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <CreateChargeModal isOpen={isChargeModalOpen} onClose={() => setIsChargeModalOpen(false)} />

        <TransactionDetailModal
            isOpen={!!viewDetailRecord}
            onClose={() => setViewDetailRecord(null)}
            record={viewDetailRecord}
            role="master"
            paymentHistory={viewDetailRecord?.paymentHistory || []}
            onApprove={(r) => { approvePayment(r.id); setViewDetailRecord(null); }}
            onReject={(r) => { rejectPayment(r.id); setViewDetailRecord(null); }}
            onDownloadReceipt={(r) => generateReceipt(r, academySettings, currentUser)}
            onReview={(r) => {
                const isBatch = !!r.batchPaymentId;
                let groupRecords = [r];
                if (isBatch) {
                     groupRecords = records.filter(item => item.batchPaymentId === r.batchPaymentId);
                }
                
                // RECONSTRUCTION LOGIC FOR MODAL GROUPING
                const totalRemaining = groupRecords.reduce((acc, item) => acc + item.amount + (item.penaltyAmount || 0), 0);
                const totalPaidHistory = groupRecords.reduce((acc, item) => acc + (item.paymentHistory || []).reduce((h, p) => h + p.amount, 0), 0);

                const group: GroupedTransaction = {
                    id: isBatch ? r.batchPaymentId! : r.id,
                    isBatch: isBatch,
                    records: groupRecords,
                    mainRecord: r,
                    totalOriginalAmount: totalRemaining + totalPaidHistory,
                    totalRemainingDebt: totalRemaining,
                    declaredAmount: groupRecords.find(i => i.declaredAmount !== undefined)?.declaredAmount,
                    itemCount: groupRecords.length
                };
                setViewDetailRecord(null);
                setSelectedGroup(group);
            }}
            onDelete={() => {
                if (viewDetailRecord) handleDeleteRecord(viewDetailRecord);
            }}
        />
    </div>
  );
};

export default Finance;
