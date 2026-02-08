
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TuitionRecord } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { generateReceipt } from '../../utils/pdfGenerator';
import { useStore } from '../../context/StoreContext'; // For accessing academy settings context if needed

interface StudentPaymentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    records: TuitionRecord[];
}

const StudentPaymentHistoryModal: React.FC<StudentPaymentHistoryModalProps> = ({ isOpen, onClose, records }) => {
    const { academySettings, currentUser } = useStore();
    
    // --- FILTERS STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'in_review'>('all');
    const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

    // --- DATA PROCESSING ---
    const filteredRecords = useMemo(() => {
        let data = [...records];

        // 1. Search (Concept, Description, Amount)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(r => 
                r.concept.toLowerCase().includes(query) || 
                (r.description && r.description.toLowerCase().includes(query)) ||
                (r.amount + (r.penaltyAmount || 0)).toString().includes(query)
            );
        }

        // 2. Status Filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending') {
                data = data.filter(r => ['pending', 'partial', 'charged'].includes(r.status));
            } else {
                data = data.filter(r => r.status === statusFilter);
            }
        }

        // 3. Sorting
        data.sort((a, b) => {
            const dateA = new Date(a.dueDate).getTime();
            const dateB = new Date(b.dueDate).getTime();
            const amountA = a.amount + (a.penaltyAmount || 0);
            const amountB = b.amount + (b.penaltyAmount || 0);

            switch (sortOrder) {
                case 'date_asc': return dateA - dateB;
                case 'date_desc': return dateB - dateA;
                case 'amount_asc': return amountA - amountB;
                case 'amount_desc': return amountB - amountA;
                default: return 0;
            }
        });

        return data;
    }, [records, searchQuery, statusFilter, sortOrder]);

    // --- SUMMARY STATS ---
    const stats = useMemo(() => {
        const totalPaid = records.filter(r => r.status === 'paid').reduce((acc, r) => acc + (r.originalAmount || r.amount), 0);
        const totalPending = records.filter(r => ['pending', 'overdue', 'partial', 'charged'].includes(r.status)).reduce((acc, r) => acc + r.amount + (r.penaltyAmount || 0), 0);
        return { totalPaid, totalPending, count: filteredRecords.length };
    }, [records, filteredRecords]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Pagado</span>;
            case 'overdue': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">Vencido</span>;
            case 'in_review': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">En Revisión</span>;
            case 'partial': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">Parcial</span>;
            default: return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">Pendiente</span>;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            
            {/* --- TOP BAR --- */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Historial Financiero Completo
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-gray-200">
                                {stats.count} Movimientos
                            </span>
                        </h1>
                        <p className="text-xs text-gray-500 font-medium">Visualiza y filtra todos tus movimientos históricos.</p>
                    </div>
                </div>
                <div className="flex gap-6 text-right">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Pagado (Histórico)</p>
                        <p className="text-lg font-black text-emerald-600 tabular-nums">${stats.totalPaid.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deuda Actual</p>
                        <p className={`text-lg font-black tabular-nums ${stats.totalPending > 0 ? 'text-red-600' : 'text-gray-900'}`}>${stats.totalPending.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
            </div>

            {/* --- FILTERS TOOLBAR --- */}
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 group-focus-within:text-primary transition-colors">search</span>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por concepto, descripción o monto..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                    {/* Status Filter */}
                    <div className="relative">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="appearance-none bg-white border border-gray-200 pl-4 pr-10 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-gray-600 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:border-gray-300 transition-all shadow-sm"
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="paid">Pagados</option>
                            <option value="pending">Pendientes / Parciales</option>
                            <option value="overdue">Vencidos</option>
                            <option value="in_review">En Revisión</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-400 pointer-events-none text-lg">filter_list</span>
                    </div>

                    {/* Sort Filter */}
                    <div className="relative">
                        <select 
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="appearance-none bg-white border border-gray-200 pl-4 pr-10 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-gray-600 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:border-gray-300 transition-all shadow-sm"
                        >
                            <option value="date_desc">Más Recientes</option>
                            <option value="date_asc">Más Antiguos</option>
                            <option value="amount_desc">Mayor Monto</option>
                            <option value="amount_asc">Menor Monto</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-400 pointer-events-none text-lg">sort</span>
                    </div>
                </div>
            </div>

            {/* --- DATA GRID --- */}
            <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-6">
                <div className="max-w-[1600px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Vencimiento</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Método</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-4xl opacity-30">search_off</span>
                                            <p className="text-sm font-medium">No se encontraron movimientos con estos filtros.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => {
                                    const totalAmount = record.amount + (record.penaltyAmount || 0);
                                    const isPaid = record.status === 'paid';
                                    
                                    return (
                                        <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{formatDateDisplay(record.dueDate)}</span>
                                                    {isPaid && record.paymentDate && (
                                                        <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                                            Pagado: {new Date(record.paymentDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{record.concept}</span>
                                                    {record.description && (
                                                        <span className="text-xs text-gray-500 truncate max-w-[250px]">{record.description}</span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-bold">{record.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                    {record.method || '---'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(record.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm font-black tabular-nums ${isPaid ? 'text-emerald-700' : totalAmount > 0 ? 'text-slate-900' : 'text-gray-400'}`}>
                                                        ${(record.originalAmount || totalAmount).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                                                    </span>
                                                    {!isPaid && totalAmount > 0 && (
                                                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1 rounded mt-0.5">
                                                            Pend: ${totalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(isPaid || record.status === 'partial') && (
                                                    <button 
                                                        onClick={() => generateReceipt(record, academySettings, currentUser)}
                                                        className="text-gray-400 hover:text-primary p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                                        title="Descargar Recibo"
                                                    >
                                                        <span className="material-symbols-outlined">receipt_long</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentPaymentHistoryModal;
