
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { Student, StudentStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmptyState from '../../components/ui/EmptyState';
import { PulseService } from '../../services/pulseService';
import Avatar from '../../components/ui/Avatar';
import { getStatusLabel } from '../../utils/textUtils';
import StudentDetailModal from '../../components/ui/StudentDetailModal';

// Fix for type errors with motion components
const MotionDiv = motion.div as any;
const MotionTbody = motion.tbody as any;
const MotionTr = motion.tr as any;

const StudentsList: React.FC = () => {
  const { students, updateStudent, deleteStudent, addStudent, academySettings, promoteStudent, records, isLoading, purgeStudentDebts, refreshData } = useStore();
  const { addToast } = useToast();
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRank, setFilterRank] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); 
  
  useEffect(() => {
      refreshData();
  }, []);

  const [showModal, setShowModal] = useState(false); 
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null); 
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const initialFormState: Partial<Student> = {
      name: '', 
      email: '', 
      cellPhone: '',
      age: undefined,
      birthDate: '',
      weight: undefined,
      height: undefined,
      rank: 'White Belt', 
      status: 'active', 
      program: 'Adults', 
      balance: 0, 
      avatarUrl: '', 
      password: '',
      guardian: {
          fullName: '',
          email: '',
          relationship: 'Padre',
          phones: { main: '', secondary: '', tertiary: '' },
          address: { street: '', exteriorNumber: '', interiorNumber: '', colony: '', zipCode: '' }
      }
  };
  const [formData, setFormData] = useState<any>(initialFormState);

  const containerVariants = {
      hidden: { opacity: 0 },
      show: {
          opacity: 1,
          transition: { staggerChildren: 0.05 }
      }
  };

  const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const filteredStudents = useMemo(() => {
      const normalize = (text: string | undefined | null) => {
          return (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      };

      const term = normalize(searchTerm);

      return students.filter(student => {
        const matchName = normalize(student.name).includes(term);
        const matchEmail = normalize(student.email).includes(term);
        const matchGuardian = normalize(student.guardian?.fullName).includes(term);
        const matchPhone = normalize(student.cellPhone).includes(term);

        const matchesSearch = matchName || matchEmail || matchGuardian || matchPhone;
        const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
        const matchesRank = filterRank === 'all' || student.rankId === filterRank;
        
        return matchesSearch && matchesStatus && matchesRank;
      });
  }, [students, searchTerm, filterStatus, filterRank]);

  const isSearchActive = searchTerm !== '' || filterStatus !== 'all' || filterRank !== 'all';
  const emptyTitle = !isSearchActive && students.length === 0 ? "Aún no hay alumnos" : "Sin resultados";
  const emptyDesc = !isSearchActive && students.length === 0 
      ? "Comparte el código de tu academia para que se registren o agrégalos manualmente." 
      : "Intenta cambiar los filtros de búsqueda.";

  const reactiveViewingStudent = useMemo(() => {
      if (!viewingStudent) return null;
      return students.find(s => s.id === viewingStudent.id) || viewingStudent;
  }, [students, viewingStudent]);

  const studentFinancialRecords = useMemo(() => {
      if (!reactiveViewingStudent || !records) return [];
      return records
          .filter(r => r.studentId === reactiveViewingStudent.id)
          .sort((a, b) => {
              const dateA = new Date(a.paymentDate || a.dueDate).getTime();
              const dateB = new Date(b.paymentDate || b.dueDate).getTime();
              return dateB - dateA;
          });
  }, [reactiveViewingStudent, records]);

  const handleExport = () => {
      const dataToExport = filteredStudents.map(s => ({
          ID: s.id,
          Nombre: s.name,
          Email: s.email,
          Celular: s.cellPhone,
          Tutor: s.guardian.fullName,
          Tutor_Tel: s.guardian.phones.main,
          Rango: s.rank,
          Estado: getStatusLabel(s.status),
          Balance: s.balance,
          Peso_kg: s.weight || '-',
          Estatura_cm: s.height || '-'
      }));
      exportToCSV(dataToExport, 'Listado_Alumnos_Completo');
      addToast('Archivo CSV generado', 'success');
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'active': return 'bg-green-50 text-green-700 border-green-200'; 
          case 'debtor': return 'bg-red-50 text-red-700 border-red-200';
          case 'exam_ready': return 'bg-blue-50 text-blue-700 border-blue-200';
          default: return 'bg-gray-50 text-gray-500 border-gray-200';
      }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      confirm({
          title: 'Eliminar Alumno',
          message: '¿Estás seguro? Se eliminará TOTALMENTE el registro del alumno, incluyendo credenciales, clases, eventos y deudas pendientes.',
          type: 'danger',
          onConfirm: () => {
              deleteStudent(id); 
              purgeStudentDebts(id); 
          }
      });
  };

  const handleEdit = (student: Student, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingStudent(student);
      setFormData(JSON.parse(JSON.stringify(student)));
      setFormData((prev: any) => ({...prev, password: ''}));
      setShowModal(true);
  };

  const handleViewDetails = (student: Student, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setViewingStudent(student);
  };

  const handleCreate = () => {
      setEditingStudent(null);
      setFormData({ ...initialFormState, avatarUrl: '' });
      setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name || !formData.email || !formData.cellPhone || !formData.guardian.fullName || !formData.guardian.phones.main) {
          addToast("Por favor completa el los campos obligatorios (*)", 'error');
          return;
      }

      if (!editingStudent || (editingStudent && editingStudent.email !== formData.email)) {
          if (PulseService.checkEmailExists(formData.email)) {
              addToast("Este correo electrónico ya está registrado.", 'error');
              return;
          }
      }

      if (editingStudent) {
          updateStudent({ ...editingStudent, ...formData });
      } else {
          if (!formData.password) {
              addToast('La contraseña es obligatoria', 'error');
              return;
          }
          const selectedRank = academySettings.ranks.find(r => r.name === formData.rank);
          addStudent({
              id: '', userId: '', academyId: '', ...formData,
              rankId: selectedRank?.id || 'rank-1',
              rankColor: selectedRank?.color || 'white',
              stripes: 0, attendance: 0, totalAttendance: 0,
              joinDate: new Date().toLocaleDateString(),
              classesId: [], attendanceHistory: [],
              status: formData.status
          });
      }
      setShowModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 h-full">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
          <div>
              <h2 className="text-3xl font-bold text-text-main">Gestión de Alumnos</h2>
              <p className="text-text-secondary text-sm mt-1">Administra tu lista de estudiantes y contactos de emergencia.</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
              <button onClick={handleExport} className="p-3 bg-white border border-gray-200 rounded-xl text-text-secondary hover:text-text-main hover:bg-gray-50 transition-all" title="Exportar CSV">
                  <span className="material-symbols-outlined">download</span>
              </button>
              
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-primary shadow-sm' : 'text-text-secondary hover:bg-gray-50'}`}>
                      <span className="material-symbols-outlined">grid_view</span>
                  </button>
                  <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-gray-100 text-primary shadow-sm' : 'text-text-secondary hover:bg-gray-50'}`}>
                      <span className="material-symbols-outlined">table_rows</span>
                  </button>
              </div>

              <button onClick={handleCreate} className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95">
                <span className="material-symbols-outlined">person_add</span> 
                <span className="hidden sm:inline">Nuevo Alumno</span>
              </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 items-center">
                <div className="relative flex-1 w-full">
                    <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined">search</span>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, email, tutor o celular..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide items-center">
                    {['all', 'active', 'debtor', 'inactive'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                                filterStatus === status 
                                ? 'bg-black text-white border-black' 
                                : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {status === 'all' ? 'Todos' : getStatusLabel(status as StudentStatus)}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Content View */}
        {isLoading ? (
            <div className="p-10 text-center">Cargando...</div>
        ) : filteredStudents.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDesc} action={<button onClick={handleCreate} className="text-primary font-bold">Crear Alumno</button>} />
        ) : (
            <>
                {viewMode === 'grid' && (
                    <MotionDiv variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredStudents.map((student) => (
                            <MotionDiv key={student.id} variants={itemVariants} className="bg-white p-6 rounded-[1.5rem] shadow-card border border-gray-100 flex flex-col gap-4 group hover:-translate-y-1 transition-all relative overflow-hidden" onClick={() => handleViewDetails(student)}>
                                <div className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(student.status)}`}>
                                    {getStatusLabel(student.status)}
                                </div>
                                <div className="flex gap-4 items-center">
                                    <Avatar src={student.avatarUrl} name={student.name} className="size-16 rounded-2xl shadow-sm text-xl" />
                                    <div>
                                        <h3 className="text-lg font-bold text-text-main leading-tight line-clamp-1">{student.name}</h3>
                                        <p className="text-sm text-text-secondary font-medium">{student.rank}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-text-secondary space-y-1 bg-gray-50 p-3 rounded-xl">
                                    <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">smartphone</span> {student.cellPhone}</p>
                                    <p className="flex items-center gap-2 truncate"><span className="material-symbols-outlined text-[14px]">supervisor_account</span> {student.guardian.fullName}</p>
                                </div>
                            </MotionDiv>
                        ))}
                    </MotionDiv>
                )}

                {viewMode === 'table' && (
                    <div className="bg-white rounded-[1.5rem] shadow-card border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/80 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Alumno</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contacto</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Responsable</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Saldo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <MotionTbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-gray-50">
                                    {filteredStudents.map((student) => (
                                        <MotionTr variants={itemVariants} key={student.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => handleViewDetails(student)}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={student.avatarUrl} name={student.name} className="size-10 rounded-full" />
                                                    <div>
                                                        <p className="font-bold text-sm text-text-main">{student.name}</p>
                                                        <p className="text-xs text-text-secondary">{student.rank}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-text-main">{student.cellPhone}</p>
                                                <p className="text-xs text-text-secondary truncate max-w-[150px]">{student.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-text-main">{student.guardian.fullName}</p>
                                                <div className="flex items-center gap-1 text-xs text-text-secondary">
                                                    <span className="material-symbols-outlined text-[10px]">phone</span>
                                                    {student.guardian.phones.main}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(student.status)}`}>
                                                    {getStatusLabel(student.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-bold text-sm ${student.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    ${student.balance.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleEdit(student, e)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                    <button onClick={(e) => handleDelete(student.id, e)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                </div>
                                            </td>
                                        </MotionTr>
                                    ))}
                                </MotionTbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>

      {/* --- CREATE / EDIT MODAL --- */}
      {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-text-main">{editingStudent ? 'Editar Expediente' : 'Nuevo Ingreso'}</h2>
                      <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-text-main"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* --- DATOS DEL ALUMNO --- */}
                      <div className="space-y-6">
                          <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/20 pb-2 mb-4">Datos Personales del Alumno</h3>
                          
                          <div className="grid grid-cols-1 gap-5">
                              <label className="block">
                                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Nombre Completo *</span>
                                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm focus:ring-2 focus:ring-primary/10" placeholder="Nombre y Apellidos" />
                              </label>

                              <div className="grid grid-cols-2 gap-4">
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">F. Nacimiento</span>
                                      <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm" />
                                  </label>
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Edad</span>
                                      <input type="number" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="Años" />
                                  </label>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Peso (kg)</span>
                                      <input type="number" step="0.1" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="0.0" />
                                  </label>
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Estatura (cm)</span>
                                      <input type="number" value={formData.height || ''} onChange={e => setFormData({...formData, height: parseInt(e.target.value)})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="000" />
                                  </label>
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">T. Sangre</span>
                                      <select value={formData.bloodType || ''} onChange={e => setFormData({...formData, bloodType: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm bg-gray-50">
                                          <option value="">--</option>
                                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </label>
                              </div>

                              <label className="block">
                                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Email Principal *</span>
                                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="correo@ejemplo.com" />
                              </label>

                              <label className="block">
                                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Celular Personal *</span>
                                  <input required type="tel" value={formData.cellPhone} onChange={e => setFormData({...formData, cellPhone: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="10 dígitos" />
                              </label>

                              {!editingStudent && (
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Contraseña Inicial *</span>
                                      <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="Mínimo 6 caracteres" />
                                  </label>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Rango Académico</span>
                                      <select value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm bg-gray-50">
                                          {academySettings.ranks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                      </select>
                                  </label>
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Estado Administrativo</span>
                                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-200 p-3 text-sm bg-gray-50">
                                          <option value="active">Activo</option>
                                          <option value="debtor">Adeudo</option>
                                          <option value="exam_ready">Examen Listo</option>
                                          <option value="inactive">Inactivo</option>
                                      </select>
                                  </label>
                              </div>
                          </div>
                      </div>

                      {/* --- DATOS DEL TUTOR / RESPONSABLE --- */}
                      <div className="space-y-6">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-b border-gray-200 pb-2 mb-4">Información del Responsable</h3>
                          
                          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-5">
                              <label className="block">
                                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Nombre del Tutor *</span>
                                  <input required value={formData.guardian.fullName} onChange={e => setFormData({...formData, guardian: {...formData.guardian, fullName: e.target.value}})} className="mt-1 block w-full rounded-xl border-gray-300 p-3 text-sm focus:bg-white transition-all" placeholder="Nombre completo" />
                              </label>

                              <div className="grid grid-cols-2 gap-4">
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Parentesco</span>
                                      <select value={formData.guardian.relationship} onChange={e => setFormData({...formData, guardian: {...formData.guardian, relationship: e.target.value}})} className="mt-1 block w-full rounded-xl border-gray-300 p-3 text-sm bg-white">
                                          {['Padre', 'Madre', 'Tutor Legal', 'Familiar', 'Otro'].map(r => <option key={r} value={r}>{r}</option>)}
                                      </select>
                                  </label>
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Email Tutor</span>
                                      <input type="email" value={formData.guardian.email || ''} onChange={e => setFormData({...formData, guardian: {...formData.guardian, email: e.target.value}})} className="mt-1 block w-full rounded-xl border-gray-300 p-3 text-sm bg-white" placeholder="ejemplo@correo.com" />
                                  </label>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Tel. Principal *</span>
                                      <input required type="tel" value={formData.guardian.phones.main} onChange={e => setFormData({...formData, guardian: {...formData.guardian, phones: {...formData.guardian.phones, main: e.target.value}}})} className="mt-1 block w-full rounded-xl border-gray-300 p-3 text-sm bg-white" placeholder="10 dígitos" />
                                  </label>
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Tel. Secundario</span>
                                      <input type="tel" value={formData.guardian.phones.secondary || ''} onChange={e => setFormData({...formData, guardian: {...formData.guardian, phones: {...formData.guardian.phones, secondary: e.target.value}}})} className="mt-1 block w-full rounded-xl border-gray-300 p-3 text-sm bg-white" placeholder="Opcional" />
                                  </label>
                                  <label className="block">
                                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Tel. Extra</span>
                                      <input type="tel" value={formData.guardian.phones.tertiary || ''} onChange={e => setFormData({...formData, guardian: {...formData.guardian, phones: {...formData.guardian.phones, tertiary: e.target.value}}})} className="mt-1 block w-full rounded-xl border-gray-300 p-3 text-sm bg-white" placeholder="Emergencias" />
                                  </label>
                              </div>

                              <div className="pt-4 border-t border-gray-200">
                                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 block">Dirección de Domicilio</span>
                                  <div className="grid grid-cols-12 gap-3">
                                      <div className="col-span-8">
                                          <input placeholder="Calle" value={formData.guardian.address.street} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, street: e.target.value}}})} className="w-full rounded-xl border-gray-300 p-3 text-sm bg-white" />
                                      </div>
                                      <div className="col-span-4">
                                          <input placeholder="No. Ext" value={formData.guardian.address.exteriorNumber} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, exteriorNumber: e.target.value}}})} className="w-full rounded-xl border-gray-300 p-3 text-sm bg-white" />
                                      </div>
                                      <div className="col-span-4">
                                          <input placeholder="Int." value={formData.guardian.address.interiorNumber || ''} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, interiorNumber: e.target.value}}})} className="w-full rounded-xl border-gray-300 p-3 text-sm bg-white" />
                                      </div>
                                      <div className="col-span-5">
                                          <input placeholder="Colonia" value={formData.guardian.address.colony} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, colony: e.target.value}}})} className="w-full rounded-xl border-gray-300 p-3 text-sm bg-white" />
                                      </div>
                                      <div className="col-span-3">
                                          <input placeholder="CP" value={formData.guardian.address.zipCode} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, zipCode: e.target.value}}})} className="w-full rounded-xl border-gray-300 p-3 text-sm bg-white" />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="md:col-span-2 flex justify-end gap-4 pt-6 border-t border-gray-100">
                          <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3.5 rounded-xl border border-gray-300 font-bold text-text-secondary hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">Cancelar</button>
                          <button type="submit" className="px-10 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs">Finalizar y Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- FULL PAGE REDESIGNED STUDENT DETAIL --- */}
      <StudentDetailModal 
        isOpen={!!reactiveViewingStudent}
        student={reactiveViewingStudent}
        onClose={() => setViewingStudent(null)}
        onEdit={(s) => handleEdit(s)}
        onMessage={(id) => {
            navigate('/master/dashboard', { state: { recipientId: id } }); // Redirección ficticia para enviar mensaje
        }}
        financialRecords={studentFinancialRecords}
      />
    </div>
  );
};

export default StudentsList;
