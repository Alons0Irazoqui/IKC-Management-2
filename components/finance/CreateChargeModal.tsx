
import React, { useState, useEffect, useMemo } from 'react';
import { useAcademy } from '../../context/AcademyContext';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { ChargeCategory } from '../../types';
import StudentSearch from '../ui/StudentSearch';
import { getLocalDate } from '../../utils/dateUtils';

interface CreateChargeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type CategoryGroup = 'event' | 'equipment' | 'other';

const CreateChargeModal: React.FC<CreateChargeModalProps> = ({ isOpen, onClose }) => {
    const { students, getStudentEnrolledEvents } = useAcademy();
    const { createManualCharge } = useFinance();
    const { addToast } = useToast();

    const [studentId, setStudentId] = useState<string>('');
    const [categoryGroup, setCategoryGroup] = useState<CategoryGroup>('event');
    
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [customTitle, setCustomTitle] = useState('');
    const [description, setDescription] = useState('');
    
    const [amount, setAmount] = useState<string>('');
    const [surcharge, setSurcharge] = useState<string>(''); // Nuevo estado para recargo
    const [dueDate, setDueDate] = useState<string>(getLocalDate());
    const [canBePaidInParts, setCanBePaidInParts] = useState(false);

    const availableEvents = useMemo(() => {
        if (!studentId) return [];
        return getStudentEnrolledEvents(studentId);
    }, [studentId, getStudentEnrolledEvents]);

    const selectedEvent = useMemo(() => {
        return availableEvents.find(e => e.id === selectedEventId);
    }, [availableEvents, selectedEventId]);

    useEffect(() => {
        setSelectedEventId('');
        setCustomTitle('');
        setDescription('');
    }, [studentId]);

    useEffect(() => {
        if (categoryGroup === 'event' && selectedEvent) {
            setCustomTitle(selectedEvent.title);
        } else if (categoryGroup === 'event' && !selectedEvent) {
            setCustomTitle('');
        }
    }, [selectedEvent, categoryGroup]);

    const handleSubmit = () => {
        if (!studentId) return addToast('Debes seleccionar un alumno.', 'error');
        if (!amount || parseFloat(amount) <= 0) return addToast('Ingresa un monto válido.', 'error');
        
        let finalCategory: ChargeCategory = 'Otro';
        let finalTitle = customTitle;

        if (categoryGroup === 'event') {
            if (!selectedEventId) return addToast('Selecciona el evento a cobrar.', 'error');
            if (selectedEvent?.type === 'tournament') finalCategory = 'Torneo';
            else if (selectedEvent?.type === 'exam') finalCategory = 'Examen/Promoción';
            else finalCategory = 'Otro';
        } else if (categoryGroup === 'equipment') {
            finalCategory = 'Equipo/Uniforme';
            if (!finalTitle) return addToast('Ingresa el nombre del equipo.', 'error');
        } else {
            finalCategory = 'Otro';
            if (!finalTitle) return addToast('Ingresa el concepto del cargo.', 'error');
        }

        createManualCharge({
            studentId,
            category: finalCategory,
            title: finalTitle,
            description: description,
            amount: parseFloat(amount),
            dueDate: dueDate,
            canBePaidInParts,
            relatedEventId: categoryGroup === 'event' ? selectedEventId : undefined,
            customPenaltyAmount: surcharge ? parseFloat(surcharge) : 0 // Integración del recargo
        });

        handleClose();
    };

    const handleClose = () => {
        setStudentId('');
        setCategoryGroup('event');
        setAmount('');
        setSurcharge(''); // Reset recargo
        setCustomTitle('');
        setDescription('');
        setCanBePaidInParts(false);
        onClose();
    };

    // Global input style override handles borders now, but we reinforce borderless for specific components if needed.
    const inputClasses = "w-full";

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-soft flex flex-col max-h-[90vh] overflow-hidden relative border border-gray-100" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Nuevo Cargo</h2>
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">Asigna un cobro manual a un estudiante.</p>
                    </div>
                    <button onClick={handleClose} className="bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-8 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        
                        {/* LEFT COLUMN: Context */}
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 ml-1">Alumno</label>
                                <div className="p-0.5">
                                    <StudentSearch 
                                        students={students}
                                        value={studentId}
                                        onChange={setStudentId}
                                        placeholder="Buscar alumno..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 ml-1">Tipo de cargo</label>
                                <div className="flex bg-[#F9FAFB] p-1 rounded-lg">
                                    {[
                                        { id: 'event', label: 'Evento' },
                                        { id: 'equipment', label: 'Equipo' },
                                        { id: 'other', label: 'Otro' }
                                    ].map(cat => (
                                        <button 
                                            key={cat.id}
                                            onClick={() => setCategoryGroup(cat.id as CategoryGroup)}
                                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                                                categoryGroup === cat.id 
                                                ? 'bg-white text-gray-900 shadow-sm' 
                                                : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {categoryGroup === 'event' ? (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-500 ml-1">Evento inscrito</label>
                                        <select 
                                            value={selectedEventId}
                                            onChange={(e) => setSelectedEventId(e.target.value)}
                                            className={inputClasses}
                                            disabled={availableEvents.length === 0}
                                        >
                                            <option value="">Seleccionar evento...</option>
                                            {availableEvents.map(evt => (
                                                <option key={evt.id} value={evt.id}>
                                                    {evt.title} ({new Date(evt.date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                        {availableEvents.length === 0 && studentId && (
                                            <p className="text-[11px] text-orange-500 font-medium mt-1 ml-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">info</span>
                                                Este alumno no tiene eventos recientes.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium text-gray-500 ml-1">Concepto</label>
                                            <input 
                                                type="text"
                                                value={customTitle}
                                                onChange={(e) => setCustomTitle(e.target.value)}
                                                placeholder={categoryGroup === 'equipment' ? "Ej. Gi Blanco A2" : "Ej. Reposición Credencial"}
                                                className={inputClasses}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium text-gray-500 ml-1">Notas (Opcional)</label>
                                            <textarea 
                                                rows={3}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className={`${inputClasses} resize-none`}
                                                placeholder="Detalles adicionales..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Financials */}
                        <div className="flex flex-col h-full">
                            <div className="bg-[#F9FAFB] rounded-2xl p-6 flex-1 flex flex-col gap-6 border border-gray-100/50">
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-500 ml-1">Monto ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={`${inputClasses} !pl-8 !text-lg !font-bold !bg-white`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Nuevo Input de Recargo */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-500 ml-1">Recargo por Vencimiento ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={surcharge}
                                            onChange={(e) => setSurcharge(e.target.value)}
                                            className={`${inputClasses} !pl-8 !bg-white`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 ml-1 font-medium">
                                        Se aplicará automáticamente si pasa la fecha límite.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-500 ml-1">Fecha límite</label>
                                    <input 
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className={`${inputClasses} !bg-white`}
                                    />
                                </div>

                                <div className="pt-2">
                                    {/* Toggle Switch */}
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">Permitir pagos parciales</span>
                                        <div className="relative">
                                            <input 
                                                type="checkbox" 
                                                checked={canBePaidInParts} 
                                                onChange={(e) => setCanBePaidInParts(e.target.checked)} 
                                                className="sr-only peer" 
                                            />
                                            <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-red-600 transition-colors duration-300 ease-in-out"></div>
                                            <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-300 peer-checked:translate-x-5"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-4">
                                <button 
                                    onClick={handleClose}
                                    className="flex-1 py-3.5 rounded-xl border-none bg-gray-100 font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    className="flex-[2] py-3.5 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold hover:shadow-lg hover:shadow-red-600/20 transition-all text-sm active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span>Generar Cargo</span>
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateChargeModal;
