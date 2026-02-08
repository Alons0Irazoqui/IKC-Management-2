
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TuitionRecord, ManualChargeData, ChargeCategory, Student, TuitionStatus } from '../types';
import { PulseService } from '../services/pulseService';
import { useAuth } from './AuthContext';
import { useAcademy } from './AcademyContext';
import { useToast } from './ToastContext';
import { getLocalDate } from '../utils/dateUtils';

// Helper for ID generation
const generateId = (prefix: string = 'id') => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}`;
};

interface RevenueData {
    name: string;
    total: number;
}

interface FinanceStats {
    totalRevenue: number;
    pendingCollection: number;
    overdueAmount: number;
    activeStudents: number;
}

interface FinanceContextType {
    records: TuitionRecord[];
    monthlyRevenueData: RevenueData[];
    rollingRevenueData: RevenueData[];
    stats: FinanceStats;
    isFinanceLoading: boolean;

    refreshFinance: () => void;
    createManualCharge: (data: ManualChargeData) => void;
    createRecord: (record: TuitionRecord) => void;
    approvePayment: (recordId: string, amountPaid?: number) => void;
    rejectPayment: (recordId: string) => void;
    approveBatchPayment: (batchId: string, totalAmountPaid: number) => void;
    rejectBatchPayment: (batchId: string) => void;
    registerBatchPayment: (
        recordIds: string[],
        file: File | null,
        method: 'Transferencia' | 'Efectivo',
        totalAmount: number,
        details: { description: string; amount: number }[]
    ) => void;
    updateRecordAmount: (recordId: string, newAmount: number) => void;
    deleteRecord: (recordId: string) => void;
    generateMonthlyBilling: () => void;
    purgeStudentDebts: (studentId: string) => void;
    getStudentPendingDebts: (studentId: string) => TuitionRecord[];
    uploadProof: (recordId: string, file: File) => void;
    markAsPaidByMaster: (recordId: string, amount: number, method: 'Efectivo' | 'Transferencia' | 'Tarjeta', note?: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { academySettings, students, batchUpdateStudents } = useAcademy();
    const { addToast } = useToast();

    const batchUpdateRef = useRef(batchUpdateStudents);
    useEffect(() => {
        batchUpdateRef.current = batchUpdateStudents;
    }, [batchUpdateStudents]);

    const [records, setRecords] = useState<TuitionRecord[]>([]);
    const [isFinanceLoading, setIsFinanceLoading] = useState(true);

    // Stats State
    const [monthlyRevenueData, setMonthlyRevenueData] = useState<RevenueData[]>([]);
    const [rollingRevenueData, setRollingRevenueData] = useState<RevenueData[]>([]);
    const [stats, setStats] = useState<FinanceStats>({
        totalRevenue: 0,
        pendingCollection: 0,
        overdueAmount: 0,
        activeStudents: 0
    });

    // --- LOAD DATA ---
    const loadFinanceData = useCallback(async () => {
        if (currentUser?.academyId) {
            setIsFinanceLoading(true);
            try {
                const dbRecords = await PulseService.getPayments(currentUser.academyId);
                setRecords(dbRecords);
            } catch (error) {
                console.error("Error loading finance", error);
                addToast("Error cargando finanzas", 'error');
            } finally {
                setIsFinanceLoading(false);
            }
        } else {
            setRecords([]);
            setIsFinanceLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        loadFinanceData();
    }, [loadFinanceData]);

    // --- BILLING PROCESS ---
    const runBillingProcess = useCallback(() => {
        if (!currentUser || currentUser.role !== 'master') return 0;
        if (!academySettings?.paymentSettings) return 0;

        const todayDate = new Date();
        const currentDay = todayDate.getDate();
        const billingDay = academySettings.paymentSettings.billingDay;

        if (currentDay >= billingDay) {
            const dateStr = getLocalDate();
            const [year, month] = dateStr.split('-');
            const monthContext = `${year}-${month}`;

            const lateFeeDay = academySettings.paymentSettings.lateFeeDay || 10;
            const dueDate = `${monthContext}-${lateFeeDay.toString().padStart(2, '0')}`;

            const activeStudents = students.filter(s => s.status === 'active');
            const newCharges: TuitionRecord[] = [];

            activeStudents.forEach(student => {
                const exists = records.some(r =>
                    r.studentId === student.id &&
                    r.month === monthContext &&
                    r.category === 'Mensualidad'
                );

                if (exists) return;

                const charge: TuitionRecord = {
                    id: generateId('bill'),
                    academyId: currentUser.academyId,
                    studentId: student.id,
                    studentName: student.name,
                    concept: `Mensualidad ${todayDate.toLocaleString('es-ES', { month: 'long' })}`,
                    month: monthContext,
                    category: 'Mensualidad',
                    amount: academySettings.paymentSettings.monthlyTuition,
                    originalAmount: academySettings.paymentSettings.monthlyTuition,
                    penaltyAmount: 0,
                    dueDate: dueDate,
                    status: 'pending',
                    type: 'charge',
                    paymentDate: null,
                    proofUrl: null,
                    canBePaidInParts: false,
                    description: 'Cuota mensual regular'
                };
                newCharges.push(charge);
            });

            if (newCharges.length > 0) {
                setRecords(prev => {
                    const updated = [...prev, ...newCharges];
                    PulseService.savePayments(newCharges); // Save new ones
                    return updated;
                });
                return newCharges.length;
            }
        }
        return 0;
    }, [currentUser, academySettings, students, records]);

    // Automate Billing Check
    useEffect(() => {
        if (!isFinanceLoading && students.length > 0) {
            const count = runBillingProcess();
            if (count > 0) addToast(`Facturación automática: ${count} cargos generados.`, 'info');
        }
    }, [isFinanceLoading, students.length, runBillingProcess]);

    // --- SYNC / CALCS ---
    // Recalculate Debts & Status
    useEffect(() => {
        if (isFinanceLoading || students.length === 0) return;

        const today = getLocalDate();
        let recordsUpdated = false;

        // Check Overdue
        const processedRecords = records.map(r => {
            if ((r.status === 'pending' || r.status === 'charged') && r.dueDate < today) {
                recordsUpdated = true;
                const penalty = (r.customPenaltyAmount !== undefined && r.customPenaltyAmount > 0)
                    ? r.customPenaltyAmount
                    : (academySettings.paymentSettings?.lateFeeAmount || 0);

                return { ...r, status: 'overdue', penaltyAmount: penalty } as TuitionRecord;
            }
            return r;
        });

        if (recordsUpdated) {
            setRecords(processedRecords);
            // Save updated overdue status? 
            // Ideally yes, but logic was inside effect. We'll do a bulk save if many updated.
            PulseService.savePayments(processedRecords);
            return;
        }

        // Student Balances
        const studentsToUpdate: Student[] = [];
        students.forEach(student => {
            const studentRecords = records.filter(r => r.studentId === student.id);
            const debt = studentRecords.reduce((acc, r) => {
                if (['pending', 'overdue', 'partial', 'charged'].includes(r.status)) {
                    return acc + r.amount + (r.penaltyAmount || 0);
                }
                return acc;
            }, 0);

            const currentRank = academySettings.ranks?.find(r => r.id === student.rankId);
            const requiredAttendance = currentRank ? currentRank.requiredAttendance : 9999;
            const isAcademicReady = student.attendance >= requiredAttendance;
            const hasDebt = debt > 0.01;

            let newStatus = student.status;
            if (student.status !== 'inactive') {
                if (isAcademicReady) newStatus = 'exam_ready';
                else if (hasDebt) newStatus = 'debtor';
                else newStatus = 'active';
            }

            const currentBalance = student.balance || 0;
            if (Math.abs(currentBalance - debt) > 0.01 || student.status !== newStatus) {
                studentsToUpdate.push({ ...student, balance: debt, status: newStatus });
            }
        });

        if (studentsToUpdate.length > 0) {
            batchUpdateRef.current(studentsToUpdate);
        }

    }, [records, students, isFinanceLoading, academySettings]);

    // Stats
    useEffect(() => {
        if (isFinanceLoading) return;
        const pending = records.filter(r => ['pending', 'partial', 'charged', 'in_review'].includes(r.status));
        const overdue = records.filter(r => r.status === 'overdue');

        const totalPending = pending.reduce((acc, r) => acc + r.amount, 0);
        const totalOverdue = overdue.reduce((acc, r) => acc + r.amount + (r.penaltyAmount || 0), 0);

        const totalRevenue = records.reduce((acc, r) => {
            if (r.status === 'paid') return acc + (r.originalAmount ?? r.amount);
            if (r.status === 'partial') return acc + ((r.originalAmount ?? r.amount) - r.amount);
            return acc;
        }, 0);

        setStats({
            totalRevenue,
            pendingCollection: totalPending,
            overdueAmount: totalOverdue,
            activeStudents: students.filter(s => s.status === 'active').length
        });

        // Charts
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const now = new Date();
        const currentYear = now.getFullYear();
        const annualTotals = new Array(12).fill(0);
        const rollingStats: { monthIndex: number; year: number; name: string; total: number }[] = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            rollingStats.push({ monthIndex: d.getMonth(), year: d.getFullYear(), name: months[d.getMonth()], total: 0 });
        }

        records.forEach(r => {
            if ((r.status === 'paid' || r.status === 'partial') && r.paymentDate) {
                const pDate = new Date(r.paymentDate);
                const pYear = pDate.getFullYear();
                const pMonth = pDate.getMonth();
                const paidAmount = r.status === 'paid' ? (r.originalAmount ?? r.amount) : (r.originalAmount ?? r.amount) - r.amount;

                if (pYear === currentYear) annualTotals[pMonth] += paidAmount;

                const rollingMatch = rollingStats.find(item => item.monthIndex === pMonth && item.year === pYear);
                if (rollingMatch) rollingMatch.total += paidAmount;
            }
        });

        setMonthlyRevenueData(months.map((m, i) => ({ name: m, total: annualTotals[i] })));
        setRollingRevenueData(rollingStats.map(r => ({ name: r.name, total: r.total })));

    }, [records, isFinanceLoading, students]);


    // --- ACTIONS ---

    const customSave = (updatedRecords: TuitionRecord[]) => {
        // Find which ones changed? Too expensive. Just upsert full new batch or updated ones.
        // For simplicity, we save all or pass specifically.
        // Context methods below modify specific records, so we can pass just those.
        // But setRecords usually takes full array.
        // We will call PulseService with the full list or relevant items.
        // Given Supabase Upsert, we can pass just modified items if we track them.
        // For now, I'll assume we pass the modified array to save helper.
        PulseService.savePayments(updatedRecords);
    };

    const createManualCharge = (data: ManualChargeData) => {
        if (currentUser?.role !== 'master') return;
        const finalAmount = Number(data.amount);
        const newRecord: TuitionRecord = {
            id: generateId('chg'),
            academyId: currentUser.academyId,
            studentId: data.studentId,
            studentName: students.find(s => s.id === data.studentId)?.name || 'Estudiante',
            concept: data.title,
            description: data.description,
            amount: finalAmount,
            originalAmount: finalAmount,
            penaltyAmount: 0,
            dueDate: data.dueDate,
            paymentDate: null,
            status: 'charged',
            type: 'charge',
            category: data.category,
            method: 'System',
            proofUrl: null,
            canBePaidInParts: data.canBePaidInParts,
            relatedEventId: data.relatedEventId,
            customPenaltyAmount: data.customPenaltyAmount || 0
        };
        setRecords(prev => [...prev, newRecord]);
        PulseService.savePayments([newRecord]);
        addToast('Cargo generado exitosamente', 'success');
    };

    const createRecord = (record: TuitionRecord) => {
        setRecords(prev => [...prev, record]);
        PulseService.savePayments([record]);
    };

    const registerBatchPayment = (
        recordIds: string[],
        file: File | null,
        method: 'Transferencia' | 'Efectivo',
        totalAmount: number,
        details: { description: string; amount: number }[]
    ) => {
        const fakeUrl = file ? (URL.createObjectURL(file)) : null; // Temp local URL
        // TODO: Upload file to storage in background
        const batchId = generateId('batch');
        const paymentDate = new Date().toISOString();
        const affected: TuitionRecord[] = [];

        setRecords(prev => prev.map(r => {
            if (recordIds.includes(r.id)) {
                const updated = {
                    ...r,
                    status: 'in_review' as TuitionStatus,
                    paymentDate: paymentDate,
                    proofUrl: fakeUrl, // Need real upload
                    method: method,
                    batchPaymentId: batchId,
                    declaredAmount: totalAmount,
                    details: details
                };
                affected.push(updated);
                return updated;
            }
            return r;
        }));
        PulseService.savePayments(affected);
        addToast('Pago registrado y enviado a revisión', 'success');
    };

    const approvePayment = (recordId: string, amountPaid?: number) => {
        let affected: TuitionRecord | null = null;
        setRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const currentPenalty = r.penaltyAmount || 0;
                const totalDebt = r.amount + currentPenalty;
                const amountToApply = amountPaid !== undefined ? amountPaid : totalDebt;
                const remaining = Math.max(0, totalDebt - amountToApply);
                const isPaidFull = remaining < 0.01;

                const newHistoryItem = { date: new Date().toISOString(), amount: amountToApply, method: r.method || 'System' };
                const updated = {
                    ...r,
                    status: isPaidFull ? 'paid' : 'partial',
                    amount: isPaidFull ? 0 : remaining,
                    originalAmount: isPaidFull ? (r.originalAmount ?? r.amount) + currentPenalty : (r.originalAmount ?? r.amount),
                    penaltyAmount: 0,
                    customPenaltyAmount: currentPenalty > 0 ? currentPenalty : r.customPenaltyAmount,
                    paymentHistory: [...(r.paymentHistory || []), newHistoryItem]
                } as TuitionRecord;
                affected = updated;
                return updated;
            }
            return r;
        }));
        if (affected) PulseService.savePayments([affected]);
        addToast('Pago aprobado', 'success');
    };

    const rejectPayment = (recordId: string) => {
        let affected: TuitionRecord | null = null;
        setRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const updated = {
                    ...r,
                    status: (r.dueDate < getLocalDate() ? 'overdue' : 'pending') as TuitionStatus,
                    paymentDate: null,
                    proofUrl: null,
                    batchPaymentId: undefined
                } as TuitionRecord;
                affected = updated;
                return updated;
            }
            return r;
        }));
        if (affected) PulseService.savePayments([affected]);
        addToast('Pago rechazado', 'info');
    };

    const approveBatchPayment = (batchId: string, totalAmountPaid: number) => {
        let affected: TuitionRecord[] = [];
        setRecords(prev => {
            const batchRecords = prev.filter(r => r.batchPaymentId === batchId);
            batchRecords.sort((a, b) => {
                const getPriority = (r: TuitionRecord) => {
                    const text = (r.concept + (r.category || '')).toLowerCase();
                    if (text.includes('mensualidad') || text.includes('colegiatura') || r.category === 'Mensualidad') return 0;
                    if (r.canBePaidInParts === false) return 1;
                    return 2;
                };
                if (getPriority(a) !== getPriority(b)) return getPriority(a) - getPriority(b);
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            });

            let available = totalAmountPaid;
            const now = new Date().toISOString();

            const updatedBatch = batchRecords.map(r => {
                const text = (r.concept + (r.category || '')).toLowerCase();
                const isMandatory = text.includes('mensualidad') || text.includes('colegiatura') || r.category === 'Mensualidad' || r.canBePaidInParts === false;
                const currentPenalty = r.penaltyAmount || 0;
                const totalDebt = r.amount + currentPenalty;
                let paid = 0;

                if (isMandatory) {
                    if (available >= totalDebt - 0.01) {
                        paid = totalDebt;
                        available -= totalDebt;
                    }
                } else {
                    if (available > 0) {
                        paid = Math.min(available, totalDebt);
                        available -= paid;
                    }
                }

                if (paid > 0) {
                    const remaining = Math.max(0, totalDebt - paid);
                    const isPaidFull = remaining < 0.01;
                    return {
                        ...r,
                        status: isPaidFull ? 'paid' : 'partial',
                        amount: isPaidFull ? 0 : remaining,
                        originalAmount: isPaidFull ? (r.originalAmount ?? r.amount) + currentPenalty : (r.originalAmount ?? r.amount),
                        penaltyAmount: 0,
                        customPenaltyAmount: currentPenalty > 0 ? currentPenalty : r.customPenaltyAmount,
                        paymentHistory: [...(r.paymentHistory || []), { date: now, amount: paid, method: r.method || 'Batch' }]
                    } as TuitionRecord;
                }
                return {
                    ...r,
                    status: (r.dueDate < getLocalDate() ? 'overdue' : 'pending') as TuitionStatus,
                    batchPaymentId: undefined
                } as TuitionRecord;
            });

            affected = updatedBatch;
            return prev.map(r => {
                const updated = updatedBatch.find(u => u.id === r.id);
                return updated || r;
            });
        });

        PulseService.savePayments(affected);
        addToast('Pago global distribuido', 'success');
    };

    const rejectBatchPayment = (batchId: string) => {
        let affected: TuitionRecord[] = [];
        setRecords(prev => prev.map(r => {
            if (r.batchPaymentId === batchId) {
                const updated = {
                    ...r,
                    status: (r.dueDate < getLocalDate() ? 'overdue' : 'pending') as TuitionStatus,
                    paymentDate: null,
                    proofUrl: null,
                    batchPaymentId: undefined
                } as TuitionRecord;
                affected.push(updated);
                return updated;
            }
            return r;
        }));
        PulseService.savePayments(affected);
        addToast('Lote rechazado', 'info');
    };

    const updateRecordAmount = (recordId: string, newTotal: number) => {
        let affected: TuitionRecord[] = [];
        setRecords(prev => {
            const targetRecord = prev.find(r => r.id === recordId);
            if (!targetRecord) return prev;

            const currentTotal = targetRecord.amount + (targetRecord.penaltyAmount || 0);
            const delta = currentTotal - newTotal;
            const batchId = targetRecord.batchPaymentId;

            return prev.map(r => {
                const isTarget = r.id === recordId;
                const isBatchSibling = batchId && r.batchPaymentId === batchId;
                if (!isTarget && !isBatchSibling) return r;

                let updatedDeclared = r.declaredAmount;
                if (r.declaredAmount !== undefined) updatedDeclared = r.declaredAmount - delta;

                const updated = { ...r, declaredAmount: updatedDeclared };
                if (isTarget) {
                    updated.amount = newTotal;
                    updated.penaltyAmount = 0;
                    updated.originalAmount = newTotal;
                    if (newTotal <= 0) {
                        updated.status = 'paid';
                        updated.paymentDate = updated.paymentDate || new Date().toISOString();
                        updated.amount = 0;
                    }
                }
                affected.push(updated);
                return updated;
            });
        });
        PulseService.savePayments(affected);
        addToast('Monto actualizado', 'success');
    };

    const deleteRecord = (recordId: string) => {
        setRecords(prev => prev.filter(r => r.id !== recordId));
        PulseService.deletePayment(recordId);
        addToast('Registro eliminado', 'info');
    };

    const generateMonthlyBilling = () => {
        const count = runBillingProcess();
        if (count === 0) addToast('No hay cargos por generar o fecha no alcanzada.', 'info');
        else addToast(`Generados ${count} cargos.`, 'success');
    };

    const purgeStudentDebts = (studentId: string) => {
        const toDelete: string[] = [];
        setRecords(prev => prev.filter(r => {
            if (r.studentId === studentId && r.status !== 'paid') {
                toDelete.push(r.id);
                return false;
            }
            return true;
        }));
        toDelete.forEach(id => PulseService.deletePayment(id));
    };

    const getStudentPendingDebts = (studentId: string) => {
        return records.filter(r => r.studentId === studentId && (r.status === 'pending' || r.status === 'overdue' || r.status === 'partial' || r.status === 'charged'));
    };

    const uploadProof = (recordId: string, file: File) => {
        registerBatchPayment([recordId], file, 'Transferencia', 0, []);
    };

    const markAsPaidByMaster = (recordId: string, amount: number, method: 'Efectivo' | 'Transferencia' | 'Tarjeta', note?: string) => {
        if (currentUser?.role !== 'master') return;
        let affected: TuitionRecord | null = null;

        setRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const currentPenalty = r.penaltyAmount || 0;
                const totalDebt = r.amount + currentPenalty;
                const remaining = Math.max(0, totalDebt - amount);
                const isPaidFull = remaining < 0.01;
                const now = new Date().toISOString();

                const updated = {
                    ...r,
                    status: isPaidFull ? 'paid' : 'partial',
                    amount: isPaidFull ? 0 : remaining,
                    originalAmount: isPaidFull ? (r.originalAmount ?? r.amount) + currentPenalty : (r.originalAmount ?? r.amount),
                    penaltyAmount: 0,
                    customPenaltyAmount: currentPenalty > 0 ? currentPenalty : r.customPenaltyAmount,
                    paymentDate: now,
                    method: method,
                    description: note || r.description,
                    paymentHistory: [...(r.paymentHistory || []), { date: now, amount, method }]
                } as TuitionRecord;
                affected = updated;
                return updated;
            }
            return r;
        }));
        if (affected) PulseService.savePayments([affected]);
        addToast('Marcado como pagado', 'success');
    };

    return (
        <FinanceContext.Provider value={{
            records, monthlyRevenueData, rollingRevenueData, stats, isFinanceLoading,
            refreshFinance: loadFinanceData,
            createManualCharge, createRecord, approvePayment, rejectPayment,
            approveBatchPayment, rejectBatchPayment, registerBatchPayment,
            updateRecordAmount, deleteRecord, generateMonthlyBilling,
            purgeStudentDebts, getStudentPendingDebts, uploadProof, markAsPaidByMaster
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};
