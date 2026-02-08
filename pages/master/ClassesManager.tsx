
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { ClassCategory, SessionModification, Event } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ClassesManager: React.FC = () => {
  const { classes, events, addClass, updateClass, deleteClass, modifyClassSession, addEvent } = useStore();
  const { addToast } = useToast();
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  
  // -- GLOBAL STATES --
  const [activeTab, setActiveTab] = useState<'classes' | 'events'>('classes');
  
  // -- CLASS MODALS --
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // -- EVENT MANAGEMENT STATES --
  const [showEventModal, setShowEventModal] = useState(false);
  
  // -- CALENDAR MANAGER STATES --
  const [managingClassId, setManagingClassId] = useState<string | null>(null);
  const managingClass = classes.find(c => c.id === managingClassId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Session Detail Modal State (Calendar)
  const [selectedSession, setSelectedSession] = useState<{date: string, modification?: SessionModification, isGhost?: boolean} | null>(null);
  const [sessionAction, setSessionAction] = useState<'edit' | 'move' | null>(null);

  // Forms - Class
  const [classForm, setClassForm] = useState({
      name: '', instructor: '', selectedDays: [] as string[], startTime: '17:00', endTime: '18:15'
  });

  const [sessionForm, setSessionForm] = useState({
      newInstructor: '',
      newStartTime: '',
      newEndTime: '',
      newDate: ''
  });

  // Forms - Event
  const [eventForm, setEventForm] = useState({
      title: '', 
      date: '', 
      time: '', 
      type: 'exam' as Event['type'], 
      description: '', 
      capacity: 50,
      isVisibleToStudents: true // Default to true
  });

  const daysOptions = [
      { key: 'Monday', label: 'Lun', full: 'Lunes' },
      { key: 'Tuesday', label: 'Mar', full: 'Martes' },
      { key: 'Wednesday', label: 'Mie', full: 'Miércoles' },
      { key: 'Thursday', label: 'Jue', full: 'Jueves' },
      { key: 'Friday', label: 'Vie', full: 'Viernes' },
      { key: 'Saturday', label: 'Sab', full: 'Sábado' },
      { key: 'Sunday', label: 'Dom', full: 'Domingo' },
  ];

  // --- CRUD HELPERS ---

  const resetClassForm = () => {
      setClassForm({ name: '', instructor: '', selectedDays: [], startTime: '17:00', endTime: '18:15' });
      setEditingClassId(null);
  };

  const handleOpenEditClass = (cls: ClassCategory) => {
      setClassForm({
          name: cls.name,
          instructor: cls.instructor,
          selectedDays: cls.days,
          startTime: cls.startTime,
          endTime: cls.endTime
      });
      setEditingClassId(cls.id);
      setShowCreateModal(true);
  };

  const toggleDay = (dayKey: string) => {
      if (classForm.selectedDays.includes(dayKey)) {
          setClassForm(prev => ({...prev, selectedDays: prev.selectedDays.filter(d => d !== dayKey)}));
      } else {
          setClassForm(prev => ({...prev, selectedDays: [...prev.selectedDays, dayKey]}));
      }
  };

  const handleSaveClass = (e: React.FormEvent) => {
      e.preventDefault();
      if (classForm.selectedDays.length === 0) return addToast("Selecciona al menos un día.", 'error');
      if (classForm.startTime >= classForm.endTime) return addToast("Hora inicio debe ser antes del fin.", 'error');

      const dayLabels = classForm.selectedDays.map(d => daysOptions.find(opt => opt.key === d)?.label).join('/');
      const scheduleString = `${dayLabels} ${classForm.startTime}`;

      const commonData = {
          name: classForm.name,
          schedule: scheduleString,
          days: classForm.selectedDays,
          startTime: classForm.startTime,
          endTime: classForm.endTime,
          instructor: classForm.instructor,
      };

      if (editingClassId) {
          const original = classes.find(c => c.id === editingClassId);
          if (original) {
              updateClass({ ...original, ...commonData });
          }
      } else {
          addClass({
              id: '', academyId: '', studentCount: 0, studentIds: [], modifications: [],
              ...commonData
          });
      }
      setShowCreateModal(false);
      resetClassForm();
  };

  const handleCreateEvent = (e: React.FormEvent) => {
      e.preventDefault();
      if (!eventForm.title || !eventForm.date) return;
      
      const start = new Date(`${eventForm.date}T${eventForm.time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration default

      let color = '#3b82f6'; // class blue
      if (eventForm.type === 'exam') color = '#8b5cf6'; // purple
      else if (eventForm.type === 'tournament') color = '#f97316'; // orange
      else if (eventForm.type === 'seminar') color = '#db2777'; // pink

      addEvent({
          id: '', // generated by store
          academyId: '',
          title: eventForm.title,
          date: eventForm.date,
          time: eventForm.time,
          type: eventForm.type,
          description: eventForm.description,
          registeredCount: 0,
          capacity: eventForm.capacity,
          isVisibleToStudents: eventForm.isVisibleToStudents, // Pass visibility
          // Missing props from Event (extends CalendarEvent)
          start,
          end,
          color,
          instructorName: 'Evento', // Optional/Default
          instructor: 'Evento',
          status: 'active'
      });
      
      setEventForm({ title: '', date: '', time: '', type: 'exam', description: '', capacity: 50, isVisibleToStudents: true });
      setShowEventModal(false);
  };

  const handleDeleteClass = (id: string) => {
      confirm({
          title: 'Eliminar Clase',
          message: '¿Estás seguro de eliminar esta clase? Se perderá el historial de sesiones futuras.',
          type: 'danger',
          onConfirm: () => deleteClass(id)
      });
  };

  // --- CALENDAR LOGIC ---

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
      return days;
  };

  const getSessionsForCalendar = () => {
      if (!managingClass) return [];
      const days = getDaysInMonth(currentMonth);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const sessions: any[] = [];

      days.forEach(day => {
          const dateStr = day.toISOString().split('T')[0];
          const dayName = dayNames[day.getDay()];
          
          const modification = managingClass.modifications.find(m => m.date === dateStr);
          const isRegularDay = managingClass.days.includes(dayName);
          const isMovedHere = managingClass.modifications.find(m => m.newDate === dateStr && m.type === 'move');

          const isCancelled = modification?.type === 'cancel';
          const isMovedAway = modification?.type === 'move';

          // Session Data Construction
          const baseSession = {
              date: dateStr,
              dayObj: day,
              startTime: modification?.newStartTime || managingClass.startTime,
              endTime: modification?.newEndTime || managingClass.endTime,
              instructor: modification?.newInstructor || managingClass.instructor,
              modification: modification
          };

          if (isMovedHere) {
              sessions.push({
                  ...baseSession,
                  type: 'moved_here',
                  startTime: isMovedHere.newStartTime || managingClass.startTime, // Respect overrides if any
                  endTime: isMovedHere.newEndTime || managingClass.endTime,
                  instructor: isMovedHere.newInstructor || managingClass.instructor,
                  originalDate: isMovedHere.date
              });
          } else if (isRegularDay) {
              if (isCancelled) {
                  sessions.push({ ...baseSession, type: 'cancelled' });
              } else if (isMovedAway) {
                  sessions.push({ ...baseSession, type: 'ghost', note: `Movida al ${modification?.newDate}` });
              } else {
                  sessions.push({ 
                      ...baseSession, 
                      type: modification ? 'modified' : 'normal' 
                  });
              }
          }
      });
      return sessions;
  };

  // --- SESSION ACTIONS ---

  const handleSessionClick = (session: any) => {
      if (session.type === 'ghost') return;
      setSelectedSession(session);
      // Pre-fill form
      setSessionForm({
          newInstructor: session.instructor,
          newStartTime: session.startTime,
          newEndTime: session.endTime,
          newDate: ''
      });
      setSessionAction(null); // Reset to selection menu
  };

  const saveSessionChanges = (type: 'cancel' | 'move' | 'edit') => {
      if (!managingClass || !selectedSession) return;

      const mod: SessionModification = {
          date: selectedSession.date,
          type: type === 'edit' ? 'time' : type as any, 
          newInstructor: type !== 'cancel' ? sessionForm.newInstructor : undefined,
          newStartTime: type !== 'cancel' ? sessionForm.newStartTime : undefined,
          newEndTime: type !== 'cancel' ? sessionForm.newEndTime : undefined,
          newDate: type === 'move' ? sessionForm.newDate : undefined
      };

      modifyClassSession(managingClass.id, mod);
      setSelectedSession(null);
  };

  const getEventTypeLabel = (type: string) => {
      switch(type) {
          case 'exam': return { label: 'Examen de Grado', color: 'bg-purple-100 text-purple-700', icon: 'workspace_premium' };
          case 'tournament': return { label: 'Torneo', color: 'bg-orange-100 text-orange-700', icon: 'emoji_events' };
          case 'seminar': return { label: 'Seminario', color: 'bg-blue-100 text-blue-700', icon: 'school' };
          default: return { label: 'Evento', color: 'bg-gray-100 text-gray-700', icon: 'event' };
      }
  };

  // --- RENDER ---

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full h-full flex flex-col font-sans relative">
        {/* Header with Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-text-main">Gestión de Horarios</h1>
                <p className="text-text-secondary mt-1 text-lg">Define clases regulares y eventos especiales.</p>
            </div>
            
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200">
                <button 
                    onClick={() => setActiveTab('classes')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'classes' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-main hover:bg-gray-50'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    Clases
                </button>
                <button 
                    onClick={() => setActiveTab('events')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'events' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-main hover:bg-gray-50'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">trophy</span>
                    Eventos y Torneos
                </button>
            </div>
        </div>

        {/* --- CLASSES TAB CONTENT --- */}
        {activeTab === 'classes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex justify-end mb-6">
                    <button 
                        onClick={() => { resetClassForm(); setShowCreateModal(true); }}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/25 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Nueva Clase
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {classes.map(cls => (
                        <div key={cls.id} className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative flex flex-col">
                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => handleOpenEditClass(cls)} className="size-9 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-full flex items-center justify-center transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button onClick={() => handleDeleteClass(cls.id)} className="size-9 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full flex items-center justify-center transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                            
                            <div className="mb-5 mt-2">
                                <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-primary flex items-center justify-center shadow-sm mb-4">
                                    <span className="material-symbols-outlined text-4xl">sports_martial_arts</span>
                                </div>
                                <h3 className="text-2xl font-bold text-text-main mb-1 truncate leading-tight">{cls.name}</h3>
                                <p className="text-sm text-text-secondary font-medium">{cls.instructor}</p>
                            </div>
                            
                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 text-sm text-text-secondary">
                                    <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">schedule</span></div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-text-main">{cls.days.map(d => d.substring(0,3)).join(', ')}</span>
                                        <span className="text-xs">{cls.startTime} - {cls.endTime}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-text-secondary">
                                    <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">groups</span></div>
                                    <span className="font-medium">{cls.studentIds?.length || 0} Alumnos Inscritos</span>
                                </div>
                            </div>
                            
                            <div className="mt-auto flex flex-col gap-3">
                                {/* BUTTON 1: ALUMNOS / ASISTENCIA */}
                                <button 
                                    onClick={() => navigate(`/master/attendance/${cls.id}`)}
                                    className="w-full py-3.5 rounded-xl border-2 border-gray-100 bg-white text-text-main font-bold hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined text-primary">groups</span>
                                    Alumnos y Asistencia
                                </button>

                                {/* BUTTON 2: CALENDARIO */}
                                <button 
                                    onClick={() => setManagingClassId(cls.id)}
                                    className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined">calendar_month</span>
                                    Gestionar Calendario
                                </button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {/* --- EVENTS TAB CONTENT (Updated Card Design) --- */}
        {activeTab === 'events' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-end mb-6">
                    <button 
                        onClick={() => setShowEventModal(true)}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/25 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Publicar Nuevo Evento
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-text-secondary bg-white rounded-3xl border border-dashed border-gray-300">
                            <span className="material-symbols-outlined text-6xl opacity-20 mb-4">emoji_events</span>
                            <h3 className="text-xl font-bold text-text-main">No hay eventos programados</h3>
                            <p className="max-w-md text-center mt-2">Crea torneos, exámenes de grado o seminarios para que tus alumnos se inscriban.</p>
                        </div>
                    ) : (
                        events.map(event => {
                            const typeInfo = getEventTypeLabel(event.type);
                            const percentFull = Math.min(((event.registeredCount || 0) / event.capacity) * 100, 100);
                            
                            return (
                                <div key={event.id} className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100 flex flex-col relative group hover:shadow-xl transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-gray-50 rounded-2xl border border-gray-200 shrink-0">
                                                <span className="text-xs font-bold text-red-500 uppercase">{new Date(event.date).toLocaleString('es-ES', { month: 'short' })}</span>
                                                <span className="text-2xl font-black text-text-main leading-none">{new Date(event.date).getDate()}</span>
                                            </div>
                                            <div>
                                                <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1 ${typeInfo.color}`}>
                                                    <span className="material-symbols-outlined text-[12px]">{typeInfo.icon}</span>
                                                    {typeInfo.label}
                                                </div>
                                                <h3 className="text-xl font-bold text-text-main leading-tight line-clamp-1">{event.title}</h3>
                                                <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span> {event.time}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Privacy Badge */}
                                        {event.isVisibleToStudents === false && (
                                            <div className="absolute top-6 right-6" title="Evento Privado (Solo Invitación)">
                                                <span className="bg-gray-100 text-gray-500 p-1.5 rounded-full flex items-center justify-center border border-gray-200">
                                                    <span className="material-symbols-outlined text-sm">visibility_off</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Capacity Progress */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-xs font-bold text-text-secondary mb-1">
                                            <span>Cupo</span>
                                            <span className={`${percentFull >= 100 ? 'text-red-500' : 'text-text-main'}`}>{event.registeredCount || 0} / {event.capacity}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${percentFull >= 100 ? 'bg-red-500' : 'bg-primary'}`} 
                                                style={{ width: `${percentFull}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Updated: Button Navigates to Full Page */}
                                    <button 
                                        onClick={() => navigate(`/master/event/${event.id}`)}
                                        className="mt-auto w-full py-3 rounded-xl border border-gray-200 bg-white text-text-main font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <span className="material-symbols-outlined">settings</span>
                                        Gestionar Evento
                                    </button>
                                </div>
                            );
                        })
                    )}
                 </div>
            </div>
        )}

        {/* --- FULL SCREEN CALENDAR OVERLAY (Apple Style) --- */}
        {managingClass && (
            <div className="fixed inset-0 z-50 bg-white/30 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
                {/* Overlay Header */}
                <div className="bg-white/80 border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setManagingClassId(null)} className="size-10 rounded-full bg-gray-100 hover:bg-gray-200 text-text-main flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-text-main flex items-center gap-3">
                                {managingClass.name} 
                                <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-text-secondary">{managingClass.schedule}</span>
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center bg-gray-100 rounded-full p-1 shadow-inner">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="size-9 rounded-full bg-white text-text-main shadow-sm hover:scale-105 transition-transform flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <span className="w-40 text-center font-bold text-text-main capitalize">{currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="size-9 rounded-full bg-white text-text-main shadow-sm hover:scale-105 transition-transform flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#F5F5F7]">
                    <div className="grid grid-cols-7 gap-4 max-w-[1600px] mx-auto">
                        {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(d => (
                            <div key={d} className="text-center text-xs font-bold text-text-secondary uppercase mb-2 tracking-widest">{d}</div>
                        ))}
                        
                        {/* Empty Slots */}
                        {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[160px]"></div>
                        ))}

                        {/* Session Cards */}
                        {getDaysInMonth(currentMonth).map(day => {
                            const dateStr = day.toISOString().split('T')[0];
                            const sessions = getSessionsForCalendar().filter(s => s.date === dateStr);
                            const isToday = dateStr === new Date().toISOString().split('T')[0];

                            return (
                                <div key={dateStr} className={`min-h-[160px] p-3 rounded-[1.5rem] flex flex-col gap-2 transition-all ${isToday ? 'bg-white shadow-glow border border-primary/20' : 'bg-white/60 hover:bg-white border border-transparent hover:shadow-card'}`}>
                                    <span className={`text-sm font-bold ml-1 ${isToday ? 'text-primary' : 'text-text-secondary'}`}>{day.getDate()}</span>
                                    
                                    {sessions.map((s, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => handleSessionClick(s)}
                                            onDoubleClick={() => { handleSessionClick(s); setSessionAction('edit'); }}
                                            className={`p-3 rounded-xl cursor-pointer transition-all border shadow-sm group relative overflow-hidden ${
                                                s.type === 'cancelled' ? 'bg-red-50 border-red-100 opacity-60' :
                                                s.type === 'ghost' ? 'bg-gray-100 border-dashed border-gray-300 opacity-50' :
                                                s.type === 'moved_here' ? 'bg-purple-50 border-purple-200 hover:bg-purple-100' :
                                                s.type === 'modified' ? 'bg-green-50 border-green-200 hover:bg-green-100' :
                                                'bg-blue-50/50 border-blue-100 hover:bg-blue-100 hover:border-blue-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`text-xs font-bold ${s.type === 'cancelled' ? 'text-red-500 line-through' : 'text-text-main'}`}>
                                                    {s.startTime} - {s.endTime}
                                                </span>
                                                {s.type === 'moved_here' && <span className="material-symbols-outlined text-purple-500 text-xs">event_available</span>}
                                                {s.type === 'modified' && <span className="material-symbols-outlined text-green-600 text-xs">edit</span>}
                                            </div>
                                            
                                            <p className={`text-xs mt-1 truncate ${s.type === 'cancelled' ? 'text-red-400' : 'text-text-secondary'}`}>
                                                {s.type === 'ghost' ? s.note : s.instructor}
                                            </p>

                                            {s.type === 'cancelled' && <div className="mt-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded w-fit">CANCELADA</div>}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- SESSION EDIT MODAL (Floating) --- */}
                {selectedSession && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedSession(null)}>
                        <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-gray-100" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-text-main">Editar Sesión</h3>
                                    <p className="text-text-secondary font-medium">{selectedSession.date}</p>
                                </div>
                                <button onClick={() => setSelectedSession(null)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
                            </div>

                            {/* Selection Menu */}
                            {!sessionAction ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setSessionAction('edit')} className="col-span-2 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 hover:scale-[1.02] transition-all flex items-center gap-4 text-left group">
                                        <div className="size-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-2xl">edit_calendar</span></div>
                                        <div>
                                            <span className="font-bold block text-lg">Editar Detalles</span>
                                            <span className="text-xs opacity-70">Hora, duración o instructor</span>
                                        </div>
                                    </button>
                                    <button onClick={() => setSessionAction('move')} className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100 hover:scale-[1.02] transition-all flex flex-col gap-2 group">
                                        <div className="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-xl">event_repeat</span></div>
                                        <span className="font-bold">Mover de Día</span>
                                    </button>
                                    <button onClick={() => saveSessionChanges('cancel')} className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 hover:bg-red-100 hover:scale-[1.02] transition-all flex flex-col gap-2 group">
                                        <div className="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-xl">event_busy</span></div>
                                        <span className="font-bold">Cancelar Clase</span>
                                    </button>
                                </div>
                            ) : (
                                /* Edit Form */
                                <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                                    {sessionAction === 'move' && (
                                        <div>
                                            <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Nueva Fecha</label>
                                            <input type="date" className="w-full rounded-xl border-gray-200 p-3 font-medium text-text-main focus:ring-purple-500 focus:border-purple-500" value={sessionForm.newDate} onChange={e => setSessionForm({...sessionForm, newDate: e.target.value})} />
                                        </div>
                                    )}

                                    {sessionAction === 'edit' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Inicio</label>
                                                    <input type="time" className="w-full rounded-xl border-gray-200 p-3 font-medium text-text-main" value={sessionForm.newStartTime} onChange={e => setSessionForm({...sessionForm, newStartTime: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Fin</label>
                                                    <input type="time" className="w-full rounded-xl border-gray-200 p-3 font-medium text-text-main" value={sessionForm.newEndTime} onChange={e => setSessionForm({...sessionForm, newEndTime: e.target.value})} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Instructor</label>
                                                <input className="w-full rounded-xl border-gray-200 p-3 font-medium text-text-main" value={sessionForm.newInstructor} onChange={e => setSessionForm({...sessionForm, newInstructor: e.target.value})} placeholder="Nombre del Instructor" />
                                            </div>
                                        </>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setSessionAction(null)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-text-secondary hover:bg-gray-50 transition-colors">Atrás</button>
                                        <button onClick={() => saveSessionChanges(sessionAction)} className="flex-1 py-3 rounded-xl bg-black text-white font-bold hover:opacity-90 shadow-lg transition-colors">Guardar Cambios</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- GLOBAL EDIT CLASS MODAL --- */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                    <h2 className="text-2xl font-bold mb-6 text-text-main">
                        {editingClassId ? 'Configuración General de Clase' : 'Crear Nueva Clase'}
                    </h2>
                    <form onSubmit={handleSaveClass} className="flex flex-col gap-5">
                        <input required value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" placeholder="Nombre de la Clase" />
                        
                        <div>
                            <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Días Recurrentes</label>
                            <div className="flex flex-wrap gap-2">
                                {daysOptions.map(day => (
                                    <button
                                        key={day.key}
                                        type="button"
                                        onClick={() => toggleDay(day.key)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                            classForm.selectedDays.includes(day.key)
                                            ? 'bg-primary text-white border-primary shadow-md'
                                            : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input required type="time" value={classForm.startTime} onChange={e => setClassForm({...classForm, startTime: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" />
                            <input required type="time" value={classForm.endTime} onChange={e => setClassForm({...classForm, endTime: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" />
                        </div>

                        <input required value={classForm.instructor} onChange={e => setClassForm({...classForm, instructor: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" placeholder="Instructor por Defecto" />

                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={() => { setShowCreateModal(false); resetClassForm(); }} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-text-secondary">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg transition-all">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* --- GLOBAL NEW EVENT MODAL --- */}
        {showEventModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                    <h2 className="text-2xl font-bold mb-6 text-text-main">
                        Publicar Nuevo Evento
                    </h2>
                    <form onSubmit={handleCreateEvent} className="flex flex-col gap-5">
                        <input required value={eventForm.title} onChange={e => setEventForm({...eventForm,title: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" placeholder="Nombre del Evento (ej. Torneo de Invierno)" />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <select value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value as any})} className="w-full rounded-xl border-gray-300 p-3 text-sm bg-white">
                                <option value="exam">Examen de Grado</option>
                                <option value="tournament">Torneo</option>
                                <option value="seminar">Seminario</option>
                            </select>
                            <input required type="number" min="1" value={eventForm.capacity} onChange={e => setEventForm({...eventForm, capacity: parseInt(e.target.value)})} className="w-full rounded-xl border-gray-300 p-3 text-sm" placeholder="Capacidad Max" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input required type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" />
                            <input required type="time" value={eventForm.time} onChange={e => setEventForm({...eventForm, time: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" />
                        </div>

                        <textarea required value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className="w-full rounded-xl border-gray-300 p-3 text-sm" placeholder="Detalles del evento, requisitos, ubicación..." rows={3} />

                        {/* VISIBILITY TOGGLE */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <span className="block text-sm font-bold text-text-main">Visible para Alumnos</span>
                                <span className="text-xs text-gray-500">Permitir que los alumnos se inscriban desde su dashboard.</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={eventForm.isVisibleToStudents}
                                    onChange={e => setEventForm({...eventForm, isVisibleToStudents: e.target.checked})}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={() => setShowEventModal(false)} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-text-secondary">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg transition-all">Publicar Evento</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default ClassesManager;
