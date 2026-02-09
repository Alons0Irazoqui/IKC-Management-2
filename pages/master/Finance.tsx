
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

    // -- KPI CALCULATIONS --
    const totalRevenue = useMemo(() => {
        const now = new Date();
        return records
            .filter(r => r.status === 'paid')
            // Optional: filter by month if you want "Ingresos (Mes)" strictly
            .filter(r => {
                if (!r.paymentDate) return false;
                const d = new Date(r.paymentDate);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((acc, r) => acc + r.amount, 0);
    }, [records]);

    const totalPending = useMemo(() => {
        return records
            .filter(r => ['pending', 'overdue', 'partial'].includes(r.status))
            .reduce((acc, r) => acc + (r.amount + (r.penaltyAmount || 0)) - (r.paymentHistory?.reduce((p, h) => p + h.amount, 0) || 0), 0);
    }, [records]);

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-500">

            {/* HEADER Y ACCIONES */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Finanzas</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Gestión de ingresos y colegiaturas.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="px-4 py-2.5 bg-white border border-gray-100 text-slate-600 font-bold rounded-xl hover:bg-gray-50 transition-all text-xs uppercase tracking-wide flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-lg">download</span>
                    </button>
                    <button
                        onClick={() => setIsChargeModalOpen(true)}
                        className="bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Nuevo Cargo
                    </button>
                </div>
            </div>

            {/* RESUMEN (TARJETAS ESTILO PULSE) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tarjeta 1: Ingresos del Mes */}
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col gap-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-green-600">attach_money</span>
                    </div>
                    <div className="flex justify-between items-start z-10">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingresos (Mes)</span>
                        <div className="size-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                    </div>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter z-10">
                        ${totalRevenue?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                </div>

                {/* Tarjeta 2: Por Cobrar */}
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col gap-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-red-600">money_off</span>
                    </div>
                    <div className="flex justify-between items-start z-10">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pendiente de Cobro</span>
                        <div className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">pending</span>
                        </div>
                    </div>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter text-red-600 z-10">
                        ${totalPending?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                </div>

                {/* Tarjeta 3: Acciones Rápidas / Billing */}
                <div className="bg-slate-900 p-6 rounded-2xl shadow-soft flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Facturación Automática</span>
                        <h3 className="text-lg font-bold mt-1">Generar Mensualidad</h3>
                    </div>
                    <button
                        onClick={handleGenerateBilling}
                        className="mt-4 w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 relative z-10"
                    >
                        <span className="material-symbols-outlined">payments</span>
                        Ejecutar Ahora
                    </button>
                </div>
            </div>

            {/* TABS & FILTERS */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-gray-100/50 p-1 rounded-xl">
                    {[
                        { id: 'review', label: 'Por Revisar' },
                        { id: 'pending', label: 'Pendientes' },
                        { id: 'overdue', label: 'Vencidos' },
                        { id: 'paid', label: 'Pagados' },
                        { id: 'all', label: 'Todos' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm scale-100'
                                : 'text-gray-400 hover:text-slate-600 scale-95'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <span className="absolute left-3 top-1/2 lg:top-[70%] -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-100 focus:border-slate-300 outline-none transition-all placeholder:text-gray-300"
                    />
                </div>
            </div>

            {/* TABLA DE TRANSACCIONES */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 flex flex-col overflow-hidden min-h-[400px]">

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="p-4 pl-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alumno</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concepto</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                                <th className="p-4 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {groupedTransactions.map((group) => {
                                const { mainRecord, isBatch, totalOriginalAmount, totalRemainingDebt, declaredAmount } = group;
                                const isPaid = mainRecord.status === 'paid';
                                // const paidSoFar = totalOriginalAmount - totalRemainingDebt;

                                return (
                                    <tr
                                        key={group.id}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => setViewDetailRecord(mainRecord)}
                                    >
                                        <td className="p-4 pl-6 font-bold text-slate-700 text-sm tabular-nums">
                                            {formatDateDisplay(mainRecord.dueDate)}
                                        </td>
                                        <td className="p-4 font-bold text-slate-900 text-sm">
                                            {mainRecord.studentName}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 font-medium">
                                            {isBatch ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px] text-purple-500">layers</span>
                                                    Lote ({group.itemCount})
                                                </span>
                                            ) : (
                                                mainRecord.concept
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{mainRecord.method}</span>}
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        <td className="p-4 pr-6 text-right font-black text-slate-900 tracking-tight">
                                            ${totalOriginalAmount.toLocaleString('es-MX')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Empty State si no hay datos */}
                    {groupedTransactions.length === 0 && (
                        <div className="p-12 text-center text-slate-400 text-sm font-medium flex flex-col items-center gap-3">
                            <div className="size-12 rounded-full bg-gray-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-300 text-2xl">receipt_long</span>
                            </div>
                            No hay transacciones para mostrar.
                        </div>
                    )}
                </div>
            </div>

            {/* Modales */}
            {isChargeModalOpen && <CreateChargeModal isOpen={isChargeModalOpen} onClose={() => setIsChargeModalOpen(false)} />}

            {/* REVIEW MODAL Y TRANSACTION DETAILS REUTILIZAMOS LA LÓGICA EXISTENTE */}
            {/* Nota: He simplificado la llamada al modal de detalle en la tabla para usar setViewDetailRecord 
          pero idealmente deberíamos mantener el TransactionDetailModal renderizado aquí abajo
          tal como estaba en el código original para que funcione.
      */}
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

            {/* REVIEW MODAL (El que ya tenías, lo mantenemos igual o adaptamos ligeramente si es necesario, 
            pero por ahora usaré el bloque original de Review Modal si es que estaba inline, 
            o si estaba extraído. En tu código original estaba inline.
            Voy a restaurar el Review Modal inline para no romper esa funcionalidad.
        */}
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
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Desglose de Aplicación</h4>
                                    <div className="space-y-3">
                                        {previewDistribution.map((item: any) => {
                                            const isMensualidadModal = item.category === 'Mensualidad' || item.concept.toLowerCase().includes('mensualidad');
                                            return (
                                                <div key={item.id} className="flex flex-col p-4 bg-white border border-gray-100 rounded-xl relative overflow-hidden group hover:border-gray-200 transition-all shadow-sm">
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${item._status === 'paid' ? 'bg-emerald-500' : item._status === 'partial' ? 'bg-amber-500' : 'bg-red-400'
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

        </div>
    );
};

export default Finance;
