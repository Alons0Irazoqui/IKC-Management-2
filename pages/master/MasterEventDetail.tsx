
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { getLocalDate } from '../../utils/dateUtils';
import StudentSearch from '../../components/ui/StudentSearch';

const MasterEventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { events, students, updateEvent, deleteEvent, updateEventRegistrants, registerForEvent } = useStore();
  const { addToast } = useToast();

  const event = events.find(e => e.id === eventId);

  // --- LOCAL STATE ---
  const [activeTab, setActiveTab] = useState<'attendees' | 'settings'>('attendees');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState(event ? {
      title: event.title,
      date: event.date,
      time: event.time,
      description: event.description,
      capacity: event.capacity,
      isVisibleToStudents: event.isVisibleToStudents
  } : null);

  // Enroll Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [studentToEnroll, setStudentToEnroll] = useState('');

  // --- DERIVED DATA ---
  const registeredStudents = useMemo(() => {
      if (!event) return [];
      return students.filter(s => event.registrants?.includes(s.id));
  }, [event, students]);

  const filteredRegistrants = useMemo(() => {
      return registeredStudents.filter(s => 
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.email.toLowerCase().includes(searchQuery.toLowerCase())
      ).sort((a,b) => a.name.localeCompare(b.name));
  }, [registeredStudents, searchQuery]);

  const stats = useMemo(() => {
      if (!event) return { fill: 0, spots: 0 };
      const count = event.registrants?.length || 0;
      return {
          fill: Math.round((count / event.capacity) * 100),
          spots: Math.max(0, event.capacity - count)
      };
  }, [event]);

  // --- ACTIONS ---

  const handleUpdateEvent = (e: React.FormEvent) => {
      e.preventDefault();
      if (!event || !editForm) return;
      updateEvent({ ...event, ...editForm });
      setIsEditing(false);
      addToast('Evento actualizado correctamente', 'success');
  };

  const handleEnrollStudent = () => {
      if (!event || !studentToEnroll) return;
      if (event.registrants?.includes(studentToEnroll)) {
          addToast('El alumno ya está inscrito', 'error');
          return;
      }
      registerForEvent(studentToEnroll, event.id);
      setStudentToEnroll('');
      setShowEnrollModal(false);
      addToast('Alumno inscrito', 'success');
  };

  const handleRemoveStudent = (studentId: string) => {
      if (!event) return;
      const newRegistrants = event.registrants?.filter(id => id !== studentId) || [];
      updateEventRegistrants(event.id, newRegistrants);
      addToast('Alumno removido del evento', 'info');
  };

  const handleDeleteEvent = () => {
      if (!event) return;
      if (window.confirm('¿Estás seguro de eliminar este evento? Esta acción no se puede deshacer.')) {
          deleteEvent(event.id);
          navigate('/master/schedule');
      }
  };

  if (!event) return <div className="p-10 text-center">Evento no encontrado</div>;

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-hidden">
        
        {/* --- HEADER HERO --- */}
        <div className={`relative px-8 py-10 text-white shadow-lg shrink-0 ${
            event.type === 'exam' ? 'bg-gradient-to-r from-gray-900 to-slate-800' :
            event.type === 'tournament' ? 'bg-gradient-to-r from-orange-600 to-amber-700' :
            'bg-gradient-to-r from-blue-600 to-indigo-700'
        }`}>
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[200px]">
                    {event.type === 'exam' ? 'stars' : event.type === 'tournament' ? 'emoji_events' : 'event'}
                </span>
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto w-full">
                <button onClick={() => navigate('/master/schedule')} className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors text-sm font-bold uppercase tracking-wider w-fit">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Volver al Calendario
                </button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">
                                {event.type === 'exam' ? 'Examen de Grado' : event.type === 'tournament' ? 'Torneo' : 'Evento'}
                            </span>
                            {event.isVisibleToStudents === false && (
                                <span className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">lock</span> Privado
                                </span>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight mb-4">{event.title}</h1>
                        <div className="flex flex-wrap gap-6 text-sm font-medium text-white/90">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">calendar_month</span>
                                {new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">schedule</span>
                                {event.time}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[120px]">
                            <p className="text-xs text-white/60 uppercase font-bold mb-1">Inscritos</p>
                            <p className="text-3xl font-black">{event.registrants?.length || 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[120px]">
                            <p className="text-xs text-white/60 uppercase font-bold mb-1">Cupos Libres</p>
                            <p className="text-3xl font-black">{stats.spots}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-[1600px] mx-auto w-full p-6 md:p-8 gap-8">
            
            {/* --- LEFT COL: ATTENDEES (MAIN) --- */}
            <div className="flex-1 bg-white rounded-3xl shadow-card border border-gray-100 flex flex-col overflow-hidden">
                {/* Tabs / Toolbar */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('attendees')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'attendees' ? 'bg-white shadow-sm text-text-main' : 'text-text-secondary hover:text-text-main'}`}
                        >
                            Lista de Inscritos
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-text-main' : 'text-text-secondary hover:text-text-main'}`}
                        >
                            Configuración
                        </button>
                    </div>

                    {activeTab === 'attendees' && (
                        <div className="flex gap-3">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                                <input 
                                    type="text" 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all"
                                    placeholder="Buscar alumno..." 
                                />
                            </div>
                            <button 
                                onClick={() => { setShowEnrollModal(true); setStudentToEnroll(''); }}
                                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                                Inscribir
                            </button>
                        </div>
                    )}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30 p-0">
                    {activeTab === 'attendees' && (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Alumno</th>
                                    <th className="px-6 py-4">Rango</th>
                                    <th className="px-6 py-4">Estado Cuenta</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRegistrants.map(student => (
                                    <tr key={student.id} className="hover:bg-white transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-4">
                                                <img src={student.avatarUrl} className="size-10 rounded-full object-cover bg-gray-200" />
                                                <div>
                                                    <p className="font-bold text-text-main text-sm">{student.name}</p>
                                                    <p className="text-xs text-text-secondary">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm font-medium text-text-secondary">
                                            {student.rank}
                                        </td>
                                        <td className="px-6 py-3">
                                            {student.balance > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                                    Adeudo ${student.balance}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                                    Al corriente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={() => handleRemoveStudent(student.id)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remover del evento"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRegistrants.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-text-secondary">
                                            <span className="material-symbols-outlined text-4xl opacity-20 mb-2">groups</span>
                                            <p>No hay alumnos inscritos.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'settings' && editForm && (
                        <div className="p-8 max-w-2xl mx-auto">
                            <form onSubmit={handleUpdateEvent} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Nombre del Evento</label>
                                    <input 
                                        value={editForm.title} 
                                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                                        className="w-full rounded-xl border-gray-200 p-3 text-sm focus:border-primary focus:ring-primary font-bold text-text-main"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Fecha</label>
                                        <input 
                                            type="date"
                                            value={editForm.date} 
                                            onChange={e => setEditForm({...editForm, date: e.target.value})}
                                            className="w-full rounded-xl border-gray-200 p-3 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Hora</label>
                                        <input 
                                            type="time"
                                            value={editForm.time} 
                                            onChange={e => setEditForm({...editForm, time: e.target.value})}
                                            className="w-full rounded-xl border-gray-200 p-3 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Descripción</label>
                                    <textarea 
                                        rows={4}
                                        value={editForm.description} 
                                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                                        className="w-full rounded-xl border-gray-200 p-3 text-sm focus:border-primary focus:ring-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Capacidad Máxima</label>
                                        <input 
                                            type="number"
                                            value={editForm.capacity} 
                                            onChange={e => setEditForm({...editForm, capacity: parseInt(e.target.value)})}
                                            className="w-full rounded-xl border-gray-200 p-3 text-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-gray-200 rounded-xl w-full hover:bg-gray-50 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={editForm.isVisibleToStudents !== false}
                                                onChange={e => setEditForm({...editForm, isVisibleToStudents: e.target.checked})}
                                                className="size-5 rounded text-primary focus:ring-primary border-gray-300"
                                            />
                                            <div>
                                                <span className="block text-sm font-bold text-text-main">Visible para Alumnos</span>
                                                <span className="text-xs text-text-secondary">Mostrar en dashboard estudiantil</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
                                    <button 
                                        type="button"
                                        onClick={handleDeleteEvent}
                                        className="text-red-500 font-bold text-sm hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Eliminar Evento
                                    </button>
                                    <button 
                                        type="submit"
                                        className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* --- RIGHT COL: QUICK SUMMARY --- */}
            <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
                <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                    <h3 className="text-lg font-bold text-text-main mb-4">Estado del Evento</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-text-secondary mb-1">
                                <span>Ocupación</span>
                                <span>{stats.fill}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${stats.fill}%` }}></div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-text-secondary">Capacidad</span>
                                <span className="font-bold text-text-main">{event.capacity}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-text-secondary">Confirmados</span>
                                <span className="font-bold text-green-600">{event.registrants?.length || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-text-secondary">Disponibles</span>
                                <span className="font-bold text-text-main">{stats.spots}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- ENROLL MODAL --- */}
        {showEnrollModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                    <h3 className="text-2xl font-bold text-text-main mb-6">Inscribir Alumno</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Seleccionar Alumno</label>
                            <StudentSearch 
                                students={students} 
                                value={studentToEnroll} 
                                onChange={setStudentToEnroll} 
                                placeholder="Buscar por nombre..."
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setShowEnrollModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-text-secondary hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleEnrollStudent} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg">Inscribir</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default MasterEventDetail;
