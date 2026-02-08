
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext'; // Importar ConfirmationContext
import { Student } from '../../types';
import { getLocalDate, formatDateDisplay } from '../../utils/dateUtils';
import DateNavigator from '../../components/ui/DateNavigator';
import Avatar from '../../components/ui/Avatar';

const MasterAttendanceDetail: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { classes, students, markAttendance, bulkMarkPresent, enrollStudent, unenrollStudent } = useStore();
  const { addToast } = useToast();
  const { confirm } = useConfirmation(); // Hook de confirmación

  const currentClass = classes.find(c => c.id === classId);

  // States - Initialize with safe local date string
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDate());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals States
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [studentForReason, setStudentForReason] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [studentForHistory, setStudentForHistory] = useState<Student | null>(null);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollSearchQuery, setEnrollSearchQuery] = useState('');

  // --- DATE ADAPTERS FOR DateNavigator ---
  const handleDateChange = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
  };

  const currentDateObj = useMemo(() => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
  }, [selectedDate]);

  // Derived Data
  const enrolledStudents = useMemo(() => {
      if (!currentClass) return [];
      return students
        .filter(s => currentClass.studentIds.includes(s.id) && s.status !== 'inactive')
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentClass, students, searchQuery]);

  const availableStudents = useMemo(() => {
      if (!currentClass) return [];
      return students
        .filter(s => !currentClass.studentIds.includes(s.id) && s.status !== 'inactive')
        .filter(s => s.name.toLowerCase().includes(enrollSearchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentClass, students, enrollSearchQuery]);

  // Helpers
  const getAttendanceRecord = (student: Student) => {
      return student.attendanceHistory?.find(r => r.date === selectedDate && r.classId === classId);
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'active': return <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Activo</span>;
          case 'debtor': return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Adeudo</span>;
          case 'exam_ready': return <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Listo Examen</span>;
          default: return null;
      }
  };

  // Actions
  const handleStatusChange = (studentId: string, status: 'present' | 'late' | 'absent' | 'excused') => {
      if (!classId) return;

      if (status === 'excused') {
          setStudentForReason(studentId);
          const student = students.find(s => s.id === studentId);
          const record = getAttendanceRecord(student!);
          setReasonText(record?.reason || '');
          setShowReasonModal(true);
      } else {
          markAttendance(studentId, classId, selectedDate, status);
          addToast('Asistencia registrada', 'success');
      }
  };

  const saveReason = () => {
      if (studentForReason && classId) {
          markAttendance(studentForReason, classId, selectedDate, 'excused', reasonText);
          setShowReasonModal(false);
          setStudentForReason(null);
          setReasonText('');
          addToast('Justificante guardado', 'success');
      }
  };

  const handleMarkAllPresent = () => {
      if (!classId) return;
      bulkMarkPresent(classId, selectedDate);
      addToast('Todos marcados como presentes', 'success');
  };

  // --- NUEVA LÓGICA DE ELIMINACIÓN CON CONFIRMACIÓN ---
  const handleUnenroll = (student: Student) => {
      confirm({
          title: 'Eliminar Alumno de Clase',
          message: `¿Estás seguro que deseas eliminar a ${student.name} de la clase de ${currentClass?.name}?`,
          type: 'danger',
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
          onConfirm: () => {
              if (classId) {
                  unenrollStudent(student.id, classId);
                  // El toast ya lo maneja el context, pero podemos añadir uno específico si quieres
              }
          }
      });
  };

  const openHistory = (student: Student) => {
      setStudentForHistory(student);
      setShowHistoryModal(true);
  };

  if (!currentClass) return <div className="p-10 text-center">Clase no encontrada</div>;

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] relative">
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                  <h1 className="text-2xl font-black text-text-main leading-none">{currentClass.name}</h1>
                  <p className="text-sm text-text-secondary mt-1">{currentClass.schedule}</p>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <DateNavigator 
                  currentDate={currentDateObj}
                  onDateChange={handleDateChange}
                  className="w-full md:w-64"
              />
              
              <button 
                  onClick={handleMarkAllPresent}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 transition-all flex items-center gap-2 active:scale-95 h-12 md:h-auto"
              >
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                  <span className="hidden sm:inline">Poner Presente a Todos</span>
              </button>
          </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col gap-6">
          
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-96">
                  <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                  <input 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar alumno..." 
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                  />
              </div>
              <button 
                  onClick={() => { setShowEnrollModal(true); setEnrollSearchQuery(''); }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-200 text-text-main font-bold rounded-xl hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                  <span className="material-symbols-outlined text-primary">person_add</span>
                  Inscribir Alumno
              </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex-1">
              <div className="overflow-x-auto h-full">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
                          <tr>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Alumno</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                                Asistencia ({formatDateDisplay(selectedDate, {weekday: 'short', day: 'numeric'})})
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {enrolledStudents.map(student => {
                              const record = getAttendanceRecord(student);
                              const status = record?.status;
                              const isDebtor = student.status === 'debtor';

                              return (
                                  <tr key={student.id} className={`group transition-colors ${isDebtor ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-blue-50/30'}`}>
                                      <td className="px-6 py-3">
                                          <div className="flex items-center gap-4">
                                              <div className="relative">
                                                  <Avatar src={student.avatarUrl} name={student.name} className="size-12 rounded-full border border-gray-100 shadow-sm" />
                                                  <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white ${student.balance > 0 ? 'bg-red-500' : 'bg-green-500'}`} title={student.balance > 0 ? 'Con Adeudo' : 'Al Corriente'}></div>
                                              </div>
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <p className="font-bold text-text-main">{student.name}</p>
                                                      {isDebtor && <span className="text-[10px] font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-red-100">ADEUDO</span>}
                                                  </div>
                                                  <p className="text-xs text-text-secondary font-medium">{student.rank}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-3">
                                          <div className="flex items-center justify-center gap-2 bg-gray-100/50 p-1.5 rounded-xl w-fit mx-auto border border-gray-200/50">
                                              <button 
                                                  onClick={() => handleStatusChange(student.id, 'present')}
                                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${status === 'present' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-green-600'}`}
                                              >
                                                  Presente
                                              </button>
                                              <button 
                                                  onClick={() => handleStatusChange(student.id, 'late')}
                                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${status === 'late' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'text-gray-500 hover:bg-white hover:text-yellow-600'}`}
                                              >
                                                  Tarde
                                              </button>
                                              <button 
                                                  onClick={() => handleStatusChange(student.id, 'absent')}
                                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${status === 'absent' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-red-600'}`}
                                              >
                                                  Falta
                                              </button>
                                              <button 
                                                  onClick={() => handleStatusChange(student.id, 'excused')}
                                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${status === 'excused' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-blue-600'}`}
                                                  title={record?.reason || "Justificar"}
                                              >
                                                  {status === 'excused' && <span className="material-symbols-outlined text-[10px]">edit_note</span>}
                                                  Justif.
                                              </button>
                                          </div>
                                      </td>
                                      <td className="px-6 py-3 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => openHistory(student)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-blue-50 transition-colors" title="Ver Historial">
                                                  <span className="material-symbols-outlined text-[20px]">history</span>
                                              </button>
                                              <button onClick={() => handleUnenroll(student)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar de Clase">
                                                  <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                          {enrolledStudents.length === 0 && (
                              <tr>
                                  <td colSpan={3} className="py-20 text-center text-text-secondary">
                                      <span className="material-symbols-outlined text-4xl opacity-30 mb-2">groups</span>
                                      <p>No hay alumnos inscritos o que coincidan con la búsqueda.</p>
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- MODAL: REASON (JUSTIFICANTE) --- */}
      {showReasonModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
                  <h3 className="text-xl font-bold text-text-main mb-4">Motivo de Justificación</h3>
                  <textarea 
                      autoFocus
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      className="w-full border-gray-200 rounded-xl p-3 text-sm focus:ring-primary focus:border-primary min-h-[100px]"
                      placeholder="Escribe el motivo (ej. Enfermedad, Trabajo...)"
                  ></textarea>
                  <div className="flex justify-end gap-3 mt-4">
                      <button onClick={() => setShowReasonModal(false)} className="px-4 py-2 rounded-lg text-gray-500 font-bold hover:bg-gray-100">Cancelar</button>
                      <button onClick={saveReason} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30">Guardar</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: ENROLL --- */}
      {showEnrollModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-8 w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="flex flex-col gap-4 mb-4 border-b border-gray-100 pb-4">
                      <div className="flex justify-between items-center">
                          <h3 className="text-2xl font-bold text-text-main">Inscribir Alumno</h3>
                          <button onClick={() => setShowEnrollModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-symbols-outlined">close</span></button>
                      </div>
                      <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>
                          <input 
                              autoFocus
                              value={enrollSearchQuery}
                              onChange={(e) => setEnrollSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-primary transition-all font-medium"
                              placeholder="Buscar alumno para inscribir..."
                          />
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                      {availableStudents.map(student => (
                          <div key={student.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer group" onClick={() => { enrollStudent(student.id, classId!); addToast('Alumno inscrito', 'success'); }}>
                              <div className="flex items-center gap-3">
                                  <Avatar src={student.avatarUrl} name={student.name} className="size-12 rounded-full border border-gray-100" />
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <p className="font-bold text-base text-text-main">{student.name}</p>
                                          {getStatusBadge(student.status)}
                                      </div>
                                      <p className="text-xs text-text-secondary font-medium">{student.rank}</p>
                                  </div>
                              </div>
                              <button className="size-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="material-symbols-outlined text-xl">add</span>
                              </button>
                          </div>
                      ))}
                      {availableStudents.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
                              <p>No se encontraron alumnos disponibles.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* --- SLIDE-OVER: HISTORY --- */}
      {showHistoryModal && studentForHistory && (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setShowHistoryModal(false)}></div>
              <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50">
                      <button onClick={() => setShowHistoryModal(false)}><span className="material-symbols-outlined">close</span></button>
                      <div>
                          <h3 className="font-bold text-lg text-text-main">{studentForHistory.name}</h3>
                          <p className="text-xs text-text-secondary">Historial de Asistencia</p>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="border-l-2 border-gray-100 pl-6 space-y-8 relative">
                          {studentForHistory.attendanceHistory
                            ?.filter(r => r.classId === classId || !r.classId) 
                            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((record, idx) => (
                              <div key={idx} className="relative">
                                  <div className={`absolute -left-[31px] top-0 size-4 rounded-full border-2 border-white shadow-sm ${
                                      record.status === 'present' ? 'bg-green-500' :
                                      record.status === 'late' ? 'bg-yellow-400' :
                                      record.status === 'excused' ? 'bg-blue-500' : 'bg-red-500'
                                  }`}></div>
                                  <div className="flex justify-between items-start">
                                      <p className="font-bold text-text-main text-sm capitalize">
                                          {formatDateDisplay(record.date)}
                                      </p>
                                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                          record.status === 'present' ? 'bg-green-50 text-green-700' :
                                          record.status === 'late' ? 'bg-yellow-50 text-yellow-700' :
                                          record.status === 'excused' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                                      }`}>
                                          {record.status === 'excused' ? 'Justificado' : record.status}
                                      </span>
                                  </div>
                                  {record.reason && (
                                      <div className="mt-2 bg-blue-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-100">
                                          <span className="font-bold block mb-1">Motivo:</span>
                                          {record.reason}
                                      </div>
                                  )}
                              </div>
                          ))}
                          {(!studentForHistory.attendanceHistory || studentForHistory.attendanceHistory.length === 0) && (
                              <p className="text-gray-400 text-sm italic">Sin historial registrado.</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MasterAttendanceDetail;
