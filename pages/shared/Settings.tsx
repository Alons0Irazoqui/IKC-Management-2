import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { RankColor, Rank, Student } from '../../types';
import ConfirmationModal from '../../components/ConfirmationModal';
import EmergencyCard from '../../components/ui/EmergencyCard';
import Avatar from '../../components/ui/Avatar';

const Settings: React.FC = () => {
    const { currentUser, students, academySettings, updateAcademySettings, updateUserProfile, changePassword, updateStudentProfile } = useStore();
    const { addToast } = useToast();

    // --- TABS & NAVIGATION ---
    const [activeTab, setActiveTab] = useState<'profile' | 'academy' | 'emergency'>('profile');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- DATA LOADING ---
    const student = students.find(s => s.id === currentUser?.studentId);

    // --- LOCAL STATE: PROFILE ---
    const [profileData, setProfileData] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        avatarUrl: currentUser?.avatarUrl || ''
    });

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar contraseña

    // --- LOCAL STATE: ACADEMY (MASTER ONLY) ---
    const [academyData, setAcademyData] = useState(academySettings);

    useEffect(() => {
        setAcademyData(academySettings);
    }, [academySettings]);

    // --- LOCAL STATE: EMERGENCY (STUDENT) ---
    const [emergencyData, setEmergencyData] = useState<Student | null>(student ? JSON.parse(JSON.stringify(student)) : null);

    useEffect(() => {
        if (student) {
            setEmergencyData(JSON.parse(JSON.stringify(student)));
        }
    }, [student]);

    // --- LOCAL STATE: MODALS ---
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => void }>({
        isOpen: false, title: '', message: '', action: () => { }
    });

    // --- HANDLERS: PROFILE ---

    const handleProfileSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateUserProfile({ name: profileData.name, avatarUrl: profileData.avatarUrl });
        addToast('Perfil actualizado correctamente', 'success');
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            addToast('Las contraseñas nuevas no coinciden', 'error');
            return;
        }
        if (passwords.new.length < 6) {
            addToast('La contraseña es muy corta', 'error');
            return;
        }
        changePassword(passwords.new);
        setPasswords({ current: '', new: '', confirm: '' });
        addToast('Contraseña actualizada con éxito', 'success');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData(prev => ({ ...prev, avatarUrl: reader.result as string }));
                // Auto-save image on select for better UX, or wait for save button. 
                // Keeping consistent with existing logic: wait for save button or just local state?
                // The original logic saved immediately.
                updateUserProfile({ avatarUrl: reader.result as string });
                addToast('Foto de perfil actualizada', 'success');
            };
            reader.readAsDataURL(file);
        }
    };
    const triggerFileInput = () => fileInputRef.current?.click();

    // --- HANDLERS: EMERGENCY ---
    const handleEmergencySave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!emergencyData || !student) return;

        updateStudentProfile(student.id, {
            cellPhone: emergencyData.cellPhone,
            height: emergencyData.height,
            weight: emergencyData.weight,
            guardian: emergencyData.guardian
        });
    };

    // --- HANDLERS: ACADEMY CONFIGURATION ---

    const isValidBillingDates = academyData.paymentSettings.lateFeeDay > academyData.paymentSettings.billingDay;

    const handleAcademySave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValidBillingDates) {
            addToast('Error: El día de recargo debe ser posterior al día de corte.', 'error');
            return;
        }

        if (academyData.ranks.length === 0) {
            addToast('Error: La academia debe tener al menos un grado.', 'error');
            return;
        }

        updateAcademySettings(academyData);
        addToast('Configuración de la academia guardada exitosamente', 'success');
    };

    const handleRankChange = (id: string, field: keyof Rank, value: any) => {
        setAcademyData(prev => ({
            ...prev,
            ranks: prev.ranks.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    };

    const handleAddRank = () => {
        const currentRanks = academyData.ranks;
        const nextOrder = currentRanks.length > 0
            ? Math.max(...currentRanks.map(r => r.order)) + 1
            : 1;

        const newRank: Rank = {
            id: `rank-${Date.now()}`,
            name: `Nuevo Grado ${nextOrder}`,
            color: 'white',
            order: nextOrder,
            requiredAttendance: 50
        };

        setAcademyData(prev => ({
            ...prev,
            ranks: [...prev.ranks, newRank]
        }));
    };

    const handleDeleteRank = (id: string) => {
        if (academyData.ranks.length <= 1) {
            addToast('No puedes eliminar el único grado existente.', 'error');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Grado',
            message: '¿Estás seguro? Los alumnos en este grado deberán ser reasignados manualmente. Esta acción se guardará al confirmar la configuración global.',
            action: () => {
                setAcademyData(prev => ({
                    ...prev,
                    ranks: prev.ranks.filter(r => r.id !== id)
                }));
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const copyCode = () => {
        navigator.clipboard.writeText(academySettings.code);
        addToast('Código copiado al portapapeles', 'success');
    };

    const beltColors: { value: RankColor; label: string; bg: string }[] = [
        { value: 'white', label: 'Blanco', bg: 'bg-gray-100' },
        { value: 'yellow', label: 'Amarillo', bg: 'bg-yellow-400' },
        { value: 'orange', label: 'Naranja', bg: 'bg-orange-500' },
        { value: 'green', label: 'Verde', bg: 'bg-green-600' },
        { value: 'blue', label: 'Azul', bg: 'bg-blue-600' },
        { value: 'purple', label: 'Morado', bg: 'bg-purple-600' },
        { value: 'brown', label: 'Marrón', bg: 'bg-amber-800' },
        { value: 'black', label: 'Negro', bg: 'bg-gray-900' },
    ];

    const billingDays = Array.from({ length: 28 }, (_, i) => i + 1);

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-500 pb-24">
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                type="danger"
            />

            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Configuración</h1>
                <p className="text-slate-500 font-medium text-sm">Administra tu cuenta, preferencias y seguridad.</p>
            </header>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar Navigation */}
                <nav className="lg:w-72 flex flex-col gap-2 w-full shrink-0">
                    {[
                        { id: 'profile', label: 'Perfil y Seguridad', icon: 'security', desc: 'Datos personales y contraseña' },
                        ...(currentUser?.role === 'master' ? [{ id: 'academy', label: 'Academia & Pagos', icon: 'domain', desc: 'Reglas de negocio y grados' }] : []),
                        ...(student ? [{ id: 'emergency', label: 'Datos de Contacto', icon: 'contact_emergency', desc: 'Información médica y tutores' }] : []),
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`flex items-start gap-4 p-4 rounded-xl text-left transition-all group border ${activeTab === item.id
                                ? 'bg-white border-gray-200 shadow-soft ring-1 ring-slate-900/5'
                                : 'border-transparent hover:bg-white/50 hover:border-gray-100 text-gray-500'
                                }`}
                        >
                            <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeTab === item.id ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-slate-600'
                                }`}>
                                <span className={`material-symbols-outlined text-[20px] ${activeTab === item.id ? 'filled' : ''}`}>{item.icon}</span>
                            </div>
                            <div>
                                <span className={`block text-sm font-bold ${activeTab === item.id ? 'text-slate-900' : 'text-gray-500 group-hover:text-slate-700'}`}>
                                    {item.label}
                                </span>
                                <span className="text-xs text-gray-400 mt-0.5 block font-medium">
                                    {item.desc}
                                </span>
                            </div>
                        </button>
                    ))}
                </nav>

                <div className="flex-1 w-full max-w-4xl">
                    {/* --- TAB: PROFILE --- */}
                    {activeTab === 'profile' && (
                        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <form onSubmit={handleProfileSave} className="bg-white rounded-2xl p-8 shadow-soft border border-gray-100 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                                    <h3 className="text-lg font-bold text-slate-900">Información Básica</h3>
                                    <button type="submit" className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-wide">
                                        Guardar Cambios
                                    </button>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="relative group cursor-pointer shrink-0 mx-auto md:mx-0" onClick={triggerFileInput}>
                                        <Avatar
                                            src={profileData.avatarUrl}
                                            name={profileData.name}
                                            className="size-32 rounded-full ring-4 ring-gray-50 text-3xl shadow-sm"
                                        />
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 gap-6 w-full">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Completo</label>
                                            <input
                                                value={profileData.name}
                                                onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                                                className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all placeholder:text-gray-300"
                                                placeholder="Tu nombre"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email (Login)</label>
                                            <input
                                                value={profileData.email}
                                                disabled
                                                className="w-full rounded-xl border-transparent bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-400 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Password Form with Show Toggle */}
                            <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl p-8 shadow-soft border border-gray-100">
                                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-50">
                                    <h3 className="text-lg font-bold text-slate-900">Seguridad</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-xs font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-900 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-transparent hover:bg-gray-100"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        {showPassword ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nueva Contraseña</label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={passwords.new}
                                            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                            className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Confirmar Contraseña</label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={passwords.confirm}
                                            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                            className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all"
                                            placeholder="Repite la nueva contraseña"
                                        />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button type="submit" className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-bold shadow-sm hover:bg-gray-50 hover:border-slate-300 transition-all active:scale-95 uppercase tracking-wide">
                                        Actualizar Contraseña
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* --- TAB: ACADEMY (MASTER ONLY) --- */}
                    {activeTab === 'academy' && currentUser?.role === 'master' && (
                        <form onSubmit={handleAcademySave} className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* 1. ACADEMY INFO & LINK CODE */}
                            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">

                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                    <div className="flex-1">
                                        <label className="text-white/60 text-xs font-bold uppercase mb-2 block tracking-wider">Nombre de la Academia</label>
                                        <input
                                            value={academyData.name}
                                            onChange={e => setAcademyData({ ...academyData, name: e.target.value })}
                                            className="w-full bg-transparent border-0 border-b-2 border-white/20 px-0 py-2 text-3xl font-black text-white placeholder-white/20 focus:border-white focus:ring-0 transition-all"
                                            placeholder="Nombre de tu academia"
                                        />
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[200px]">
                                        <h3 className="text-white/80 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">vpn_key</span>
                                            Código de Vinculación
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-3xl font-black tracking-widest font-mono text-white">{academySettings.code}</span>
                                            <button type="button" onClick={copyCode} className="ml-auto size-8 bg-white text-slate-900 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm">
                                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. PAYMENT CONFIGURATION */}
                            <div className={`bg-white rounded-2xl p-8 shadow-soft border transition-colors ${!isValidBillingDates ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}>
                                <div className="flex justify-between items-end mb-8 border-b border-gray-50 pb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-green-600">payments</span>
                                            Reglas de Cobro
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">Define los montos y fechas automáticas para la facturación mensual.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Amounts */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mensualidad Estándar ($)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                value={academyData.paymentSettings.monthlyTuition}
                                                onChange={e => setAcademyData({ ...academyData, paymentSettings: { ...academyData.paymentSettings, monthlyTuition: parseFloat(e.target.value) } })}
                                                className="w-full rounded-xl border-transparent bg-gray-50 pl-8 pr-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Recargo por Mora ($)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                value={academyData.paymentSettings.lateFeeAmount}
                                                onChange={e => setAcademyData({ ...academyData, paymentSettings: { ...academyData.paymentSettings, lateFeeAmount: parseFloat(e.target.value) } })}
                                                className="w-full rounded-xl border-transparent bg-red-50 pl-8 pr-4 py-3 text-sm font-bold text-red-600 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Día de Corte (Generación)</label>
                                        <select
                                            value={academyData.paymentSettings.billingDay}
                                            onChange={e => setAcademyData({ ...academyData, paymentSettings: { ...academyData.paymentSettings, billingDay: parseInt(e.target.value) } })}
                                            className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all appearance-none cursor-pointer"
                                        >
                                            {billingDays.map(day => <option key={`bill-${day}`} value={day}>Día {day} del mes</option>)}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Día Límite (Recargo)</label>
                                        <select
                                            value={academyData.paymentSettings.lateFeeDay}
                                            onChange={e => setAcademyData({ ...academyData, paymentSettings: { ...academyData.paymentSettings, lateFeeDay: parseInt(e.target.value) } })}
                                            className={`w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all appearance-none cursor-pointer ${!isValidBillingDates ? 'bg-red-50 text-red-600 ring-2 ring-red-100' : ''}`}
                                        >
                                            {billingDays.map(day => <option key={`late-${day}`} value={day}>Día {day} del mes</option>)}
                                        </select>
                                    </div>
                                </div>

                                {!isValidBillingDates && (
                                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-xs font-bold">
                                        <span className="material-symbols-outlined text-lg">error</span>
                                        El día límite debe ser posterior al día de corte para calcular la mora correctamente.
                                    </div>
                                )}
                            </div>

                            {/* 3. BANK DETAILS */}
                            <div className="bg-white rounded-2xl p-8 shadow-soft border border-gray-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-gray-50 pb-6">
                                    <span className="material-symbols-outlined text-blue-600">account_balance</span>
                                    Datos Bancarios
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Banco</label>
                                        <input
                                            value={academyData.bankDetails?.bankName || ''}
                                            onChange={e => setAcademyData({ ...academyData, bankDetails: { ...academyData.bankDetails!, bankName: e.target.value } })}
                                            className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all"
                                            placeholder="Ej. BBVA"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Titular</label>
                                        <input
                                            value={academyData.bankDetails?.accountHolder || ''}
                                            onChange={e => setAcademyData({ ...academyData, bankDetails: { ...academyData.bankDetails!, accountHolder: e.target.value } })}
                                            className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">CLABE / Cuenta</label>
                                        <input
                                            value={academyData.bankDetails?.clabe || ''}
                                            onChange={e => setAcademyData({ ...academyData, bankDetails: { ...academyData.bankDetails!, clabe: e.target.value } })}
                                            className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all tracking-wide"
                                            placeholder="18 dígitos"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Instrucciones de Pago (WhatsApp)</label>
                                        <textarea
                                            value={academyData.bankDetails?.instructions || ''}
                                            onChange={e => setAcademyData({ ...academyData, bankDetails: { ...academyData.bankDetails!, instructions: e.target.value } })}
                                            className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all"
                                            placeholder="Ej. Enviar comprobante por WhatsApp..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. RANK MANAGEMENT (CRITICAL) */}
                            <div className="bg-white rounded-2xl p-8 shadow-soft border border-gray-100">
                                <div className="flex justify-between items-end mb-6 border-b border-gray-50 pb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-purple-600">workspace_premium</span>
                                            Gestión de Grados
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">Define la jerarquía de cinturones y requisitos de asistencia.</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 gap-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-4">
                                        <div className="col-span-1 text-center font-black">#</div>
                                        <div className="col-span-4 font-black">Nombre</div>
                                        <div className="col-span-3 font-black">Color</div>
                                        <div className="col-span-3 font-black text-center">Clases Req.</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {/* Rank Rows */}
                                    {academyData.ranks
                                        .sort((a, b) => a.order - b.order)
                                        .map((rank, idx) => (
                                            <div key={rank.id} className="grid grid-cols-12 gap-4 items-center group bg-gray-50/50 p-2 rounded-xl border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all">
                                                <div className="col-span-1 flex justify-center">
                                                    <div className="size-6 rounded-full bg-slate-200 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                                                        {idx + 1}
                                                    </div>
                                                </div>

                                                <div className="col-span-4">
                                                    <input
                                                        value={rank.name}
                                                        onChange={(e) => handleRankChange(rank.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 placeholder:text-gray-300"
                                                        placeholder="Nombre del grado"
                                                    />
                                                </div>

                                                <div className="col-span-3">
                                                    <select
                                                        value={rank.color}
                                                        onChange={(e) => handleRankChange(rank.id, 'color', e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-xs font-bold text-slate-600 uppercase tracking-wide focus:ring-0 cursor-pointer"
                                                    >
                                                        {beltColors.map(c => (
                                                            <option key={c.value} value={c.value}>{c.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-span-3 flex justify-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={rank.requiredAttendance}
                                                        onChange={(e) => handleRankChange(rank.id, 'requiredAttendance', parseInt(e.target.value))}
                                                        className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-center text-slate-900 focus:border-slate-300 focus:ring-0"
                                                    />
                                                </div>

                                                <div className="col-span-1 flex justify-end pr-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteRank(rank.id)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Eliminar grado"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddRank}
                                    className="mt-6 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:bg-gray-50 transition-all group font-bold text-sm uppercase tracking-wide"
                                >
                                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
                                    Agregar Nuevo Grado
                                </button>
                            </div>

                            {/* GLOBAL SAVE BUTTON */}
                            <div className="sticky bottom-6 flex justify-end pt-4 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7] to-transparent pb-4 -mx-6 px-6 md:-mx-10 md:px-10 z-20 pointer-events-none">
                                <div className="pointer-events-auto">
                                    <button
                                        type="submit"
                                        disabled={!isValidBillingDates}
                                        className={`px-8 py-4 rounded-2xl text-white font-bold shadow-xl transform transition-all active:scale-95 flex items-center gap-2 ${!isValidBillingDates ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}
                                    >
                                        <span className="material-symbols-outlined">save</span>
                                        Guardar Configuración
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* --- TAB: EMERGENCY (STUDENT) --- */}
                    {activeTab === 'emergency' && student && emergencyData && (
                        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Read-Only View of Current Data */}
                            <EmergencyCard student={emergencyData} />

                            <form onSubmit={handleEmergencySave} className="bg-white rounded-2xl p-8 shadow-soft border border-gray-100">
                                <div className="flex justify-between items-start mb-8 border-b border-gray-50 pb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Editar Datos Personales</h3>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">Mantén esta información actualizada para emergencias.</p>
                                    </div>
                                    <button type="submit" className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-wide">
                                        Actualizar Datos
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* DATOS FÍSICOS Y DE CONTACTO DEL ALUMNO */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Celular Alumno</span>
                                            <input value={emergencyData.cellPhone} onChange={e => setEmergencyData({ ...emergencyData, cellPhone: e.target.value })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estatura (cm)</span>
                                            <input type="number" value={emergencyData.height || ''} onChange={e => setEmergencyData({ ...emergencyData, height: parseInt(e.target.value) })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Peso (kg)</span>
                                            <input type="number" step="0.1" value={emergencyData.weight || ''} onChange={e => setEmergencyData({ ...emergencyData, weight: parseFloat(e.target.value) })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                        </div>
                                    </div>

                                    {/* DATOS DEL TUTOR */}
                                    <div>
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 block border-b border-gray-100 pb-2">Información del Tutor</span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Tutor</span>
                                                <input value={emergencyData.guardian.fullName} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, fullName: e.target.value } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Tutor</span>
                                                <input value={emergencyData.guardian.email} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, email: e.target.value } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Parentesco</span>
                                                <select value={emergencyData.guardian.relationship} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, relationship: e.target.value as any } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all appearance-none cursor-pointer">
                                                    {['Padre', 'Madre', 'Tutor Legal', 'Familiar', 'Otro'].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tel. Principal</span>
                                                <input value={emergencyData.guardian.phones.main} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, phones: { ...emergencyData.guardian.phones, main: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tel. 2 (Opcional)</span>
                                                <input value={emergencyData.guardian.phones.secondary || ''} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, phones: { ...emergencyData.guardian.phones, secondary: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tel. 3 (Opcional)</span>
                                                <input value={emergencyData.guardian.phones.tertiary || ''} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, phones: { ...emergencyData.guardian.phones, tertiary: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* DIRECCIÓN */}
                                    <div>
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 block border-b border-gray-100 pb-2">Dirección</span>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="col-span-3">
                                                <input placeholder="Calle" value={emergencyData.guardian.address.street} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, address: { ...emergencyData.guardian.address, street: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="col-span-1">
                                                <input placeholder="No. Ext" value={emergencyData.guardian.address.exteriorNumber} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, address: { ...emergencyData.guardian.address, exteriorNumber: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="col-span-1">
                                                <input placeholder="Int." value={emergencyData.guardian.address.interiorNumber || ''} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, address: { ...emergencyData.guardian.address, interiorNumber: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="col-span-2">
                                                <input placeholder="Colonia" value={emergencyData.guardian.address.colony} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, address: { ...emergencyData.guardian.address, colony: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                            <div className="col-span-1">
                                                <input placeholder="CP" value={emergencyData.guardian.address.zipCode} onChange={e => setEmergencyData({ ...emergencyData, guardian: { ...emergencyData.guardian, address: { ...emergencyData.guardian.address, zipCode: e.target.value } } })} className="w-full rounded-xl border-transparent bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
