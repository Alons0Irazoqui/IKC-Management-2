
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
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void}>({
      isOpen: false, title: '', message: '', action: () => {}
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
              setConfirmModal(prev => ({...prev, isOpen: false}));
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
    <div className="max-w-5xl mx-auto p-6 md:p-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        type="danger"
      />

      <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Configuración</h1>
          <p className="text-text-secondary mt-2">Gestiona tu perfil, preferencias y seguridad.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex flex-col gap-1">
              {[
                  { id: 'profile', label: 'Perfil y Seguridad', icon: 'security' },
                  ...(currentUser?.role === 'master' ? [{ id: 'academy', label: 'Academia & Pagos', icon: 'domain' }] : []),
                  ...(student ? [{ id: 'emergency', label: 'Datos Personales y Contacto', icon: 'contact_emergency' }] : []),
              ].map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id as any)} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeTab === item.id 
                        ? 'bg-white text-primary shadow-sm ring-1 ring-black/5 font-bold' 
                        : 'text-text-secondary hover:bg-white/50 hover:text-text-main'
                    }`}
                  >
                      <span className={`material-symbols-outlined text-[20px] ${activeTab === item.id ? 'filled' : ''}`}>{item.icon}</span>
                      {item.label}
                  </button>
              ))}
          </nav>

          <div className="flex-1">
              {/* --- TAB: PROFILE --- */}
              {activeTab === 'profile' && (
                  <div className="flex flex-col gap-8">
                       <form onSubmit={handleProfileSave} className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                           <h3 className="text-lg font-bold text-text-main mb-6">Información Básica</h3>
                           <div className="flex items-center gap-6 mb-8">
                               <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                                   <Avatar 
                                        src={profileData.avatarUrl} 
                                        name={profileData.name} 
                                        className="size-24 rounded-full ring-4 ring-gray-50 text-2xl" 
                                   />
                                   <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                       <span className="material-symbols-outlined text-white">photo_camera</span>
                                   </div>
                               </div>
                               <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                               <button type="button" onClick={triggerFileInput} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">Cambiar Foto</button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-main">Nombre</label>
                                    <input value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-main">Email (Login)</label>
                                    <input value={profileData.email} disabled className="w-full rounded-xl border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
                                </div>
                           </div>
                           <div className="mt-8 flex justify-end">
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg hover:bg-primary-hover">Guardar Cambios</button>
                           </div>
                      </form>

                      {/* Password Form with Show Toggle */}
                      <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-bold text-text-main">Seguridad</h3>
                              <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-xs font-bold text-text-secondary flex items-center gap-1.5 hover:text-primary transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                              >
                                  <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                  {showPassword ? 'Ocultar' : 'Mostrar'}
                              </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Nueva Contraseña</label>
                                  <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={passwords.new} 
                                    onChange={e => setPasswords({...passwords, new: e.target.value})} 
                                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary" 
                                    placeholder="Mínimo 6 caracteres"
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Confirmar Contraseña</label>
                                  <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={passwords.confirm} 
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary" 
                                    placeholder="Repite la nueva contraseña"
                                  />
                              </div>
                          </div>
                          <div className="mt-8 flex justify-end">
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold shadow-lg hover:bg-black transition-all active:scale-95">Actualizar Contraseña</button>
                           </div>
                      </form>
                  </div>
              )}

              {/* --- TAB: ACADEMY (MASTER ONLY) --- */}
              {activeTab === 'academy' && currentUser?.role === 'master' && (
                  <form onSubmit={handleAcademySave} className="flex flex-col gap-8">
                      
                      {/* 1. ACADEMY INFO & LINK CODE */}
                      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h3 className="text-blue-100 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">vpn_key</span>
                                    Código de Vinculación
                                </h3>
                                <div className="flex items-center gap-4 bg-white/10 p-2 pr-4 rounded-xl border border-white/20 backdrop-blur-sm">
                                    <span className="text-4xl font-black tracking-widest font-mono pl-2">{academySettings.code}</span>
                                    <button type="button" onClick={copyCode} className="size-10 bg-white text-primary rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm"><span className="material-symbols-outlined">content_copy</span></button>
                                </div>
                            </div>
                            
                            <div className="w-full md:w-1/2">
                                <label className="text-blue-100 text-xs font-bold uppercase mb-2 block">Nombre de la Academia</label>
                                <input 
                                    value={academyData.name} 
                                    onChange={e => setAcademyData({...academyData, name: e.target.value})} 
                                    className="w-full rounded-xl border-white/30 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:bg-white/20 focus:border-white focus:ring-0 font-bold text-lg"
                                />
                            </div>
                        </div>
                      </div>

                      {/* 2. PAYMENT CONFIGURATION */}
                      <div className={`bg-white rounded-3xl p-8 shadow-card border transition-colors ${!isValidBillingDates ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}>
                          <div className="flex justify-between items-end mb-6">
                              <div>
                                  <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                                      <span className="material-symbols-outlined text-green-600">payments</span>
                                      Reglas de Cobro
                                  </h3>
                                  <p className="text-xs text-text-secondary mt-1">Define los montos y fechas automáticas para la facturación.</p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Amounts */}
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Mensualidad Estándar ($)</label>
                                  <input 
                                    type="number" 
                                    value={academyData.paymentSettings.monthlyTuition} 
                                    onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, monthlyTuition: parseFloat(e.target.value)}})} 
                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary font-bold" 
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Recargo por Mora ($)</label>
                                  <input 
                                    type="number" 
                                    value={academyData.paymentSettings.lateFeeAmount} 
                                    onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, lateFeeAmount: parseFloat(e.target.value)}})} 
                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary font-bold text-red-500" 
                                  />
                              </div>

                              {/* Dates */}
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Día de Corte (Generación de Recibo)</label>
                                  <select 
                                      value={academyData.paymentSettings.billingDay} 
                                      onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, billingDay: parseInt(e.target.value)}})}
                                      className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary"
                                  >
                                      {billingDays.map(day => <option key={`bill-${day}`} value={day}>Día {day} del mes</option>)}
                                  </select>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Día Límite (Aplicación Recargo)</label>
                                  <select 
                                      value={academyData.paymentSettings.lateFeeDay} 
                                      onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, lateFeeDay: parseInt(e.target.value)}})}
                                      className={`w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary ${!isValidBillingDates ? 'border-red-300 text-red-600 bg-red-50' : ''}`}
                                  >
                                      {billingDays.map(day => <option key={`late-${day}`} value={day}>Día {day} del mes</option>)}
                                  </select>
                              </div>
                          </div>

                          {!isValidBillingDates && (
                              <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-bold">
                                  <span className="material-symbols-outlined text-sm">error</span>
                                  El día límite debe ser posterior al día de corte.
                              </div>
                          )}
                      </div>

                      {/* 3. BANK DETAILS */}
                      <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                              <span className="material-symbols-outlined text-blue-600">account_balance</span>
                              Datos Bancarios
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Banco</label>
                                  <input 
                                    value={academyData.bankDetails?.bankName || ''} 
                                    onChange={e => setAcademyData({...academyData, bankDetails: {...academyData.bankDetails!, bankName: e.target.value}})} 
                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary" 
                                    placeholder="Ej. BBVA" 
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Titular</label>
                                  <input 
                                    value={academyData.bankDetails?.accountHolder || ''} 
                                    onChange={e => setAcademyData({...academyData, bankDetails: {...academyData.bankDetails!, accountHolder: e.target.value}})} 
                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary" 
                                  />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-semibold text-text-main">CLABE / Cuenta</label>
                                  <input 
                                    value={academyData.bankDetails?.clabe || ''} 
                                    onChange={e => setAcademyData({...academyData, bankDetails: {...academyData.bankDetails!, clabe: e.target.value}})} 
                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary font-mono" 
                                    placeholder="18 dígitos" 
                                  />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-semibold text-text-main">Instrucciones de Pago</label>
                                  <textarea 
                                    value={academyData.bankDetails?.instructions || ''} 
                                    onChange={e => setAcademyData({...academyData, bankDetails: {...academyData.bankDetails!, instructions: e.target.value}})} 
                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary" 
                                    placeholder="Ej. Enviar comprobante por WhatsApp..." 
                                    rows={2} 
                                  />
                              </div>
                          </div>
                      </div>

                      {/* 4. RANK MANAGEMENT (CRITICAL) */}
                      <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-600">workspace_premium</span>
                                    Gestión de Grados
                                </h3>
                                <p className="text-xs text-text-secondary mt-1">Define la jerarquía de cinturones y requisitos.</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                              {/* Table Header */}
                              <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                  <div className="col-span-1 text-center">#</div>
                                  <div className="col-span-4">Nombre del Grado</div>
                                  <div className="col-span-3">Color</div>
                                  <div className="col-span-3">Clases Req.</div>
                                  <div className="col-span-1 text-right"></div>
                              </div>

                              {/* Rank Rows */}
                              {academyData.ranks
                                .sort((a,b) => a.order - b.order)
                                .map((rank, idx) => (
                                  <div key={rank.id} className="grid grid-cols-12 gap-4 items-center group animate-in fade-in slide-in-from-left-2 duration-300">
                                      <div className="col-span-1 flex justify-center">
                                          <div className="size-8 rounded-full bg-gray-50 font-bold text-gray-500 flex items-center justify-center text-sm shadow-sm border border-gray-100">
                                              {idx + 1}
                                          </div>
                                      </div>
                                      
                                      <div className="col-span-4">
                                          <input 
                                            value={rank.name} 
                                            onChange={(e) => handleRankChange(rank.id, 'name', e.target.value)}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:bg-white focus:border-primary transition-all font-semibold"
                                            placeholder="Ej. Cinta Blanca"
                                          />
                                      </div>
                                      
                                      <div className="col-span-3">
                                          <select 
                                            value={rank.color}
                                            onChange={(e) => handleRankChange(rank.id, 'color', e.target.value)}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50/50 px-2 py-2 text-sm focus:bg-white focus:border-primary transition-all"
                                          >
                                              {beltColors.map(c => (
                                                  <option key={c.value} value={c.value}>{c.label}</option>
                                              ))}
                                          </select>
                                      </div>
                                      
                                      <div className="col-span-3 relative">
                                          <input 
                                            type="number"
                                            min="0"
                                            value={rank.requiredAttendance} 
                                            onChange={(e) => handleRankChange(rank.id, 'requiredAttendance', parseInt(e.target.value))}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:bg-white focus:border-primary text-center font-mono transition-all"
                                          />
                                          <span className="absolute right-3 top-2.5 text-[10px] text-gray-400 pointer-events-none uppercase font-bold">Clases</span>
                                      </div>
                                      
                                      <div className="col-span-1 flex justify-end">
                                          <button 
                                            type="button" 
                                            onClick={() => handleDeleteRank(rank.id)}
                                            className="size-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
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
                            className="mt-6 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group"
                          >
                              <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
                              <span className="font-semibold text-sm">Agregar Nuevo Grado</span>
                          </button>
                      </div>

                      {/* GLOBAL SAVE BUTTON */}
                      <div className="sticky bottom-6 flex justify-end pt-4 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7] to-transparent pb-4 -mx-6 px-6 md:-mx-10 md:px-10">
                          <button 
                            type="submit" 
                            disabled={!isValidBillingDates}
                            className={`px-8 py-4 rounded-2xl text-white font-bold shadow-xl transform transition-all active:scale-95 flex items-center gap-2 ${!isValidBillingDates ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-black hover:bg-gray-900 shadow-black/20'}`}
                          >
                              <span className="material-symbols-outlined">save</span>
                              Guardar Configuración Completa
                          </button>
                      </div>
                  </form>
              )}

              {/* --- TAB: EMERGENCY (STUDENT) --- */}
              {activeTab === 'emergency' && student && emergencyData && (
                  <div className="flex flex-col gap-8">
                      {/* Read-Only View of Current Data */}
                      <EmergencyCard student={emergencyData} />

                      <form onSubmit={handleEmergencySave} className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                <h3 className="text-lg font-bold text-text-main">Editar Datos Personales</h3>
                                <p className="text-sm text-text-secondary mt-1">Mantén esta información actualizada.</p>
                              </div>
                          </div>

                          <div className="space-y-6">
                              {/* DATOS FÍSICOS Y DE CONTACTO DEL ALUMNO */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-6 border-b border-gray-100">
                                  <label className="block">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Celular Alumno</span>
                                      <input value={emergencyData.cellPhone} onChange={e => setEmergencyData({...emergencyData, cellPhone: e.target.value})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                  </label>
                                  <label className="block">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Estatura (cm)</span>
                                      <input type="number" value={emergencyData.height || ''} onChange={e => setEmergencyData({...emergencyData, height: parseInt(e.target.value)})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                  </label>
                                  <label className="block">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Peso (kg)</span>
                                      <input type="number" step="0.1" value={emergencyData.weight || ''} onChange={e => setEmergencyData({...emergencyData, weight: parseFloat(e.target.value)})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                  </label>
                              </div>

                              {/* DATOS DEL TUTOR */}
                              <div>
                                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block">Información del Tutor</span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Nombre Tutor</span>
                                          <input value={emergencyData.guardian.fullName} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, fullName: e.target.value}})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </label>
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Email Tutor</span>
                                          <input value={emergencyData.guardian.email} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, email: e.target.value}})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </label>
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Parentesco</span>
                                          <select value={emergencyData.guardian.relationship} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, relationship: e.target.value as any}})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm">
                                              {['Padre', 'Madre', 'Tutor Legal', 'Familiar', 'Otro'].map(r => <option key={r} value={r}>{r}</option>)}
                                          </select>
                                      </label>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Tel. Principal</span>
                                          <input value={emergencyData.guardian.phones.main} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, phones: {...emergencyData.guardian.phones, main: e.target.value}}})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </label>
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Tel. 2 (Opcional)</span>
                                          <input value={emergencyData.guardian.phones.secondary || ''} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, phones: {...emergencyData.guardian.phones, secondary: e.target.value}}})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </label>
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Tel. 3 (Opcional)</span>
                                          <input value={emergencyData.guardian.phones.tertiary || ''} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, phones: {...emergencyData.guardian.phones, tertiary: e.target.value}}})} className="mt-1 w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </label>
                                  </div>
                              </div>
                              
                              {/* DIRECCIÓN */}
                              <div className="pt-4 border-t border-gray-100">
                                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block">Dirección</span>
                                  <div className="grid grid-cols-4 gap-3">
                                      <div className="col-span-3">
                                          <input placeholder="Calle" value={emergencyData.guardian.address.street} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, address: {...emergencyData.guardian.address, street: e.target.value}}})} className="block w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-1">
                                          <input placeholder="No. Ext" value={emergencyData.guardian.address.exteriorNumber} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, address: {...emergencyData.guardian.address, exteriorNumber: e.target.value}}})} className="block w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-1">
                                          <input placeholder="Int." value={emergencyData.guardian.address.interiorNumber || ''} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, address: {...emergencyData.guardian.address, interiorNumber: e.target.value}}})} className="block w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-2">
                                          <input placeholder="Colonia" value={emergencyData.guardian.address.colony} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, address: {...emergencyData.guardian.address, colony: e.target.value}}})} className="block w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-1">
                                          <input placeholder="CP" value={emergencyData.guardian.address.zipCode} onChange={e => setEmergencyData({...emergencyData, guardian: {...emergencyData.guardian, address: {...emergencyData.guardian.address, zipCode: e.target.value}}})} className="block w-full rounded-xl border-gray-200 p-2.5 text-sm" />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="mt-8 flex justify-end">
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg hover:bg-primary-hover transition-all active:scale-95">Actualizar Datos</button>
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
