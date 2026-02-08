
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, TuitionRecord, RankColor } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { useToast } from '../../context/ToastContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import Avatar from './Avatar';

interface StudentDetailModalProps {
    isOpen: boolean;
    student: Student | null;
    onClose: () => void;
    onEdit: (student: Student) => void;
    financialRecords: TuitionRecord[];
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    isOpen,
    student,
    onClose,
    onEdit,
    financialRecords
}) => {
    const { deleteStudent, purgeStudentDebts, academySettings, updateStudent } = useStore();
    const { confirm } = useConfirmation();
    const { addToast } = useToast();
    
    // ESTADOS LOCALES
    const [activeTab, setActiveTab] = useState<'info' | 'payments'>('info');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Student | null>(null);

    // Sincronizar formData cuando el estudiante cambia o se entra en modo edición
    useEffect(() => {
        if (student && isEditing) {
            setFormData(JSON.parse(JSON.stringify(student)));
        }
    }, [student, isEditing]);

    // CÁLCULO DE PROGRESO
    const { progressPercent, requiredAttendance } = useMemo(() => {
        if (!student) return { progressPercent: 0, requiredAttendance: 0 };
        const currentRankConfig = academySettings.ranks.find(r => r.id === student.rankId);
        const required = currentRankConfig?.requiredAttendance || 0;
        const percent = required > 0 ? Math.min(Math.round((student.attendance / required) * 100), 100) : 100;
        return { progressPercent: percent, requiredAttendance: required };
    }, [student, academySettings]);

    if (!student) return null;

    const handleDelete = () => {
        confirm({
            title: 'Eliminar Expediente',
            message: `¿Deseas eliminar permanentemente a ${student.name}? Esta acción borrará registros de asistencia y deudas.`,
            type: 'danger',
            confirmText: 'Confirmar Eliminación',
            onConfirm: () => {
                deleteStudent(student.id);
                purgeStudentDebts(student.id);
                onClose();
            }
        });
    };

    const handleSaveChanges = () => {
        if (!formData) return;
        
        // Validación básica
        if (!formData.name || !formData.email) {
            addToast('Nombre y Email son obligatorios', 'error');
            return;
        }

        updateStudent(formData);
        addToast('Datos actualizados correctamente', 'success');
        setIsEditing(false);
    };

    // Helpers para actualización de campos anidados
    const updateNestedField = (path: string, value: any) => {
        setFormData(prev => {
            if (!prev) return null;
            const next = { ...prev };
            const keys = path.split('.');
            let current: any = next;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return next;
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-0 z-50 bg-[#F1F5F9] overflow-y-auto font-sans"
                >
                    {isEditing && formData ? (
                        /* --- MODO EDICIÓN: FORMULARIO ENTERPRISE --- */
                        <div className="min-h-screen flex flex-col">
                            <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-50">
                                <div className="max-w-5xl mx-auto flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Editar Expediente</h2>
                                        <p className="text-slate-400 text-sm font-medium">Actualiza la información técnica y personal del alumno.</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </header>

                            <main className="flex-1 max-w-5xl mx-auto w-full p-8 pb-32">
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    
                                    {/* SECCIÓN 1: DATOS DEL ALUMNO */}
                                    <section>
                                        <SectionTitle icon="person" title="Información del Alumno" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2">
                                                <EditInput label="Nombre Completo" value={formData.name} onChange={v => updateNestedField('name', v)} />
                                            </div>
                                            <EditInput label="Email de Acceso" value={formData.email} onChange={v => updateNestedField('email', v)} type="email" />
                                            <EditInput label="Celular Alumno" value={formData.cellPhone} onChange={v => updateNestedField('cellPhone', v)} type="tel" />
                                            <EditInput label="Fecha Nacimiento" value={formData.birthDate} onChange={v => updateNestedField('birthDate', v)} type="date" />
                                            <EditSelect 
                                                label="Tipo de Sangre" 
                                                value={(formData as any).bloodType || ''} 
                                                onChange={v => updateNestedField('bloodType', v)}
                                                options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                                            />
                                            <EditInput label="Peso (kg)" value={formData.weight?.toString() || ''} onChange={v => updateNestedField('weight', parseFloat(v))} type="number" />
                                            <EditInput label="Estatura (cm)" value={formData.height?.toString() || ''} onChange={v => updateNestedField('height', parseInt(v))} type="number" />
                                            <EditSelect 
                                                label="Rango Actual" 
                                                value={formData.rank} 
                                                onChange={v => {
                                                    const r = academySettings.ranks.find(rank => rank.name === v);
                                                    if (r) {
                                                        updateNestedField('rank', r.name);
                                                        updateNestedField('rankId', r.id);
                                                        updateNestedField('rankColor', r.color);
                                                    }
                                                }}
                                                options={academySettings.ranks.map(r => r.name)}
                                            />
                                        </div>
                                    </section>

                                    {/* SECCIÓN 2: DIRECCIÓN */}
                                    <section>
                                        <SectionTitle icon="location_on" title="Domicilio Residencial" />
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="md:col-span-2">
                                                <EditInput label="Calle" value={formData.guardian.address.street} onChange={v => updateNestedField('guardian.address.street', v)} />
                                            </div>
                                            <EditInput label="Núm. Exterior" value={formData.guardian.address.exteriorNumber} onChange={v => updateNestedField('guardian.address.exteriorNumber', v)} />
                                            <EditInput label="Núm. Interior" value={formData.guardian.address.interiorNumber || ''} onChange={v => updateNestedField('guardian.address.interiorNumber', v)} />
                                            <div className="md:col-span-3">
                                                <EditInput label="Colonia" value={formData.guardian.address.colony} onChange={v => updateNestedField('guardian.address.colony', v)} />
                                            </div>
                                            <EditInput label="Código Postal" value={formData.guardian.address.zipCode} onChange={v => updateNestedField('guardian.address.zipCode', v)} />
                                        </div>
                                    </section>

                                    {/* SECCIÓN 3: TUTOR */}
                                    <section>
                                        <SectionTitle icon="family_history" title="Tutor y Emergencias" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2">
                                                <EditInput label="Nombre del Tutor" value={formData.guardian.fullName} onChange={v => updateNestedField('guardian.fullName', v)} />
                                            </div>
                                            <EditSelect 
                                                label="Parentesco" 
                                                value={formData.guardian.relationship} 
                                                onChange={v => updateNestedField('guardian.relationship', v)}
                                                options={['Padre', 'Madre', 'Tutor Legal', 'Familiar', 'Otro']}
                                            />
                                            <EditInput label="Email Tutor" value={formData.guardian.email} onChange={v => updateNestedField('guardian.email', v)} type="email" />
                                            <EditInput label="Teléfono Principal" value={formData.guardian.phones.main} onChange={v => updateNestedField('guardian.phones.main', v)} type="tel" />
                                            <EditInput label="Teléfono Secundario" value={formData.guardian.phones.secondary || ''} onChange={v => updateNestedField('guardian.phones.secondary', v)} type="tel" />
                                        </div>
                                    </section>

                                </div>
                            </main>

                            {/* BARRA DE ACCIONES FIJA */}
                            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-6 z-50">
                                <div className="max-w-5xl mx-auto flex gap-4">
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSaveChanges}
                                        className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20 uppercase tracking-widest text-xs active:scale-[0.98]"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </footer>
                        </div>
                    ) : (
                        /* --- MODO LECTURA (Ficha Técnica + Finanzas) --- */
                        <>
                            {/* --- STICKY TOP BAR --- */}
                            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
                                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
                                    {/* IZQUIERDA: IDENTIDAD */}
                                    <div className="flex items-center">
                                        <Avatar 
                                            src={student.avatarUrl} 
                                            name={student.name} 
                                            className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-white border border-slate-100 text-xl font-black" 
                                        />
                                        <div className="ml-5">
                                            <div className="flex items-center gap-3">
                                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{student.name}</h1>
                                                <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                                    {student.rank}
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-xs font-medium mt-0.5">ID: {student.id} • Alumno desde: {student.joinDate}</p>
                                        </div>
                                    </div>

                                    {/* DERECHA: ACCIONES (ICONOS) */}
                                    <div className="flex items-center gap-1">
                                        {/* Botón Editar */}
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            title="Editar Expediente"
                                            className="p-2.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>

                                        {/* Botón Eliminar */}
                                        <button 
                                            onClick={handleDelete}
                                            title="Eliminar Alumno"
                                            className="p-2.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>

                                        <div className="w-px h-6 bg-slate-200 mx-2"></div>

                                        {/* Botón Cerrar */}
                                        <button 
                                            onClick={onClose}
                                            title="Cerrar"
                                            className="p-2.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                </div>

                                {/* --- TABS NAVIGATION --- */}
                                <div className="max-w-7xl mx-auto px-8">
                                    <nav className="flex gap-8">
                                        <TabBtn active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Expediente" />
                                        <TabBtn active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} label="Finanzas & Pagos" />
                                    </nav>
                                </div>
                            </header>

                            {/* --- CONTENIDO PRINCIPAL --- */}
                            <main className="max-w-7xl mx-auto p-8 pb-24">
                                {activeTab === 'info' ? (
                                    <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        
                                        {/* 1. PROGRESO DE GRADO (Col 1-8) */}
                                        <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Progreso de Grado</h3>
                                            <div className="flex items-end justify-between mb-4">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-5xl font-black text-slate-900">{student.attendance}</span>
                                                    <span className="text-slate-400 font-bold uppercase text-xs">Clases asistidas</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xl font-bold text-blue-600">{progressPercent}%</span>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Meta: {requiredAttendance} clases</p>
                                                </div>
                                            </div>
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progressPercent}%` }}
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* 2. BIOMETRÍA (Col 9-12) */}
                                        <div className="col-span-12 lg:col-span-4 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Biometría</h3>
                                            <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                                <BiometryField label="Edad" value={`${student.age} años`} />
                                                <BiometryField label="Peso" value={student.weight ? `${student.weight} kg` : '- kg'} />
                                                <BiometryField label="Estatura" value={student.height ? `${student.height} cm` : '- cm'} />
                                                <BiometryField label="Sangre" value={(student as any).bloodType || 'N/R'} />
                                            </div>
                                        </div>

                                        {/* 3. CONTACTO (Col 1-6) */}
                                        <div className="col-span-12 lg:col-span-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Información de Contacto</h3>
                                            <div className="space-y-6">
                                                <ContactRow label="Celular Alumno" value={student.cellPhone} isLink={`tel:${student.cellPhone}`} icon="smartphone" />
                                                <ContactRow label="Email Personal" value={student.email} icon="alternate_email" />
                                                <ContactRow label="Nacimiento" value={formatDateDisplay(student.birthDate)} icon="cake" />
                                                <div className="pt-4 border-t border-slate-50">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dirección Residencial</label>
                                                    <p className="text-slate-900 font-semibold mt-1">
                                                        {student.guardian.address.street} {student.guardian.address.exteriorNumber}
                                                        {student.guardian.address.interiorNumber ? `, Int. ${student.guardian.address.interiorNumber}` : ''}
                                                    </p>
                                                    <p className="text-slate-500 text-sm">{student.guardian.address.colony}, CP {student.guardian.address.zipCode}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. TUTOR LEGAL (Col 7-12) */}
                                        <div className="col-span-12 lg:col-span-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Responsable / Emergencias</h3>
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <BiometryField label="Tutor" value={student.guardian.fullName} />
                                                    <BiometryField label="Parentesco" value={student.guardian.relationship} />
                                                </div>
                                                
                                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                                                    <EmergencyPhone label="Teléfono Principal" value={student.guardian.phones.main} />
                                                    {student.guardian.phones.secondary && (
                                                        <EmergencyPhone label="Secundario" value={student.guardian.phones.secondary} />
                                                    )}
                                                    {student.guardian.phones.tertiary && (
                                                        <EmergencyPhone label="Contacto Extra" value={student.guardian.phones.tertiary} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                ) : (
                                    /* --- TAB 2: FINANZAS --- */
                                    <div className="space-y-8 animate-in fade-in duration-500">
                                        {/* Hero Saldo */}
                                        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Estado de Cuenta</p>
                                            <h2 className={`text-6xl font-black tracking-tighter tabular-nums ${student.balance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                                ${student.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </h2>
                                            <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${student.balance > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {student.balance > 0 ? 'Adeudo Pendiente' : 'Al corriente'}
                                            </div>
                                        </div>

                                        {/* Tabla de Pagos */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estatus</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {financialRecords.length > 0 ? (
                                                        financialRecords.map(record => (
                                                            <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-8 py-5 text-sm font-bold text-slate-700">{formatDateDisplay(record.dueDate)}</td>
                                                                <td className="px-6 py-5 text-sm text-slate-600 font-medium">{record.concept}</td>
                                                                <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">
                                                                    ${(record.amount + record.penaltyAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-8 py-5 text-center">
                                                                    <PaymentBadge status={record.status} />
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-medium">
                                                                No hay transacciones registradas para este alumno.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </main>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- COMPONENTES INTERNOS DE MODO EDICIÓN ---

const EditInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = 'text' }) => (
    <div className="relative group">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
        />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 group-hover:bg-slate-200 transition-colors rounded-full" />
    </div>
);

const EditSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: string[] }> = ({ label, value, onChange, options }) => (
    <div className="relative group">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none appearance-none"
        >
            <option value="">Seleccionar...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 group-hover:bg-slate-200 transition-colors rounded-full" />
    </div>
);

const SectionTitle: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="size-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
            <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">{title}</h3>
    </div>
);

// --- COMPONENTES INTERNOS DE VISTA LECTURA ---

const TabBtn: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button 
        onClick={onClick}
        className={`py-5 px-1 border-b-2 text-sm font-bold transition-all ${
            active ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
        }`}
    >
        {label}
    </button>
);

const BiometryField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
        <p className="text-xl font-bold text-slate-700 tracking-tight">{value}</p>
    </div>
);

const ContactRow: React.FC<{ label: string; value: string; isLink?: string; icon: string }> = ({ label, value, isLink, icon }) => (
    <div className="flex items-center gap-4">
        <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
            {isLink ? (
                <a href={isLink} className="text-slate-900 font-semibold hover:text-blue-600 transition-colors underline decoration-slate-200 underline-offset-4">{value}</a>
            ) : (
                <p className="text-slate-900 font-semibold">{value}</p>
            )}
        </div>
    </div>
);

const EmergencyPhone: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center">
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
        <a href={`tel:${value}`} className="size-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
            <span className="material-symbols-outlined text-xl filled">call</span>
        </a>
    </div>
);

const PaymentBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: any = {
        paid: { label: 'Pagado', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        pending: { label: 'Pendiente', class: 'bg-amber-50 text-amber-600 border-amber-100' },
        overdue: { label: 'Vencido', class: 'bg-red-50 text-red-600 border-red-100' },
        in_review: { label: 'En Revisión', class: 'bg-blue-50 text-blue-600 border-blue-100' },
    };
    const { label, class: cls } = config[status] || config.pending;
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
            {label}
        </span>
    );
};

export default StudentDetailModal;
