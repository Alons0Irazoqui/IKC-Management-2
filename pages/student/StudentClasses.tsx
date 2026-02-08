
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDate } from '../../utils/dateUtils';
import { Event, CalendarEvent } from '../../types';
import { useToast } from '../../context/ToastContext';

// --- SUB-COMPONENT: EVENT MODAL (Inline for self-containment) ---
const EventDetailModal: React.FC<{
    event: Event | null;
    onClose: () => void;
    isRegistered: boolean;
    onRegister: () => void;
}> = ({ event, onClose, isRegistered, onRegister }) => {
    if (!event) return null;

    const getIcon = (type: string) => {
        switch(type) {
            case 'exam': return 'stars';
            case 'tournament': return 'emoji_events';
            default: return 'event';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className={`p-8 pb-10 relative shrink-0 ${
                    event.type === 'exam' ? 'bg-gray-900 text-white' : 
                    event.type === 'tournament' ? 'bg-orange-600 text-white' : 
                    'bg-blue-600 text-white'
                }`}>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    
                    <div className="flex items-center gap-2 mb-3 opacity-90">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">{getIcon(event.type)}</span>
                            {event.type === 'exam' ? 'Examen' : event.type === 'tournament' ? 'Torneo' : 'Evento'}
                        </span>
                        {isRegistered && (
                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <span className="material-symbols-outlined text-sm">check</span> Inscrito
                            </span>
                        )}
                    </div>
                    <h2 className="text-3xl font-black leading-tight">{event.title}</h2>
                </div>

                {/* Content */}
                <div className="p-8 -mt-6 bg-white rounded-t-[2rem] relative z-10 flex flex-col gap-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Fecha</p>
                            <p className="font-bold text-gray-900 capitalize">
                                {new Date(event.date + 'T12:00:00').toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'long'})}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Horario</p>
                            <p className="font-bold text-gray-900">{event.time}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Acerca del evento</h4>
                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                            {event.description}
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                    {!isRegistered ? (
                        <button 
                            onClick={onRegister}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <span>Confirmar Asistencia</span>
                            <span className="material-symbols-outlined">how_to_reg</span>
                        </button>
                    ) : (
                        <button disabled className="w-full py-4 bg-gray-100 text-gray-400 font-bold rounded-xl flex items-center justify-center gap-2 cursor-default">
                            <span>Ya estás registrado</span>
                            <span className="material-symbols-outlined">check_circle</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
const StudentClasses: React.FC = () => {
  const { classes, students, currentUser, events, registerForEvent } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'classes' | 'events'>('classes');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Data
  const student = students.find(s => s.id === currentUser?.studentId);
  const myClasses = classes.filter(c => student?.classesId?.includes(c.id));

  // Logic: Filter Events
  // 1. Registered events (Any date)
  // 2. Public events (Future only)
  const visibleEvents = useMemo(() => {
      if (!student) return [];
      const today = getLocalDate();
      
      return events.filter(e => {
          const isRegistered = e.registrants?.includes(student.id);
          const isFuturePublic = e.date >= today && e.isVisibleToStudents !== false;
          return isRegistered || isFuturePublic;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, student]);

  // Actions
  const handleRegister = () => {
      if (selectedEvent && student) {
          registerForEvent(student.id, selectedEvent.id);
          addToast('¡Inscripción exitosa!', 'success');
          setSelectedEvent(null);
      }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 w-full min-h-screen flex flex-col">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Mis Clases y Eventos</h1>
                <p className="text-gray-500 mt-2 font-medium">Gestiona tu entrenamiento académico y actividades especiales.</p>
            </div>

            {/* --- TABS UI (iOS Style) --- */}
            <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 relative w-full md:w-auto overflow-hidden">
                <button
                    onClick={() => setActiveTab('classes')}
                    className={`relative z-10 flex-1 md:w-40 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 ${activeTab === 'classes' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Clases Regulares
                    {activeTab === 'classes' && (
                        <motion.div layoutId="tab-bg" className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`relative z-10 flex-1 md:w-40 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 ${activeTab === 'events' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Eventos y Seminarios
                    {activeTab === 'events' && (
                        <motion.div layoutId="tab-bg" className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                    )}
                </button>
            </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="flex-1">
            <AnimatePresence mode='wait'>
                
                {/* VIEW 1: CLASSES */}
                {activeTab === 'classes' && (
                    <motion.div 
                        key="classes"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {myClasses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-dashed border-gray-200 text-center min-h-[400px]">
                                <div className="size-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-5xl text-gray-300">class</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Sin clases asignadas</h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    Actualmente no estás inscrito en ningún grupo regular. Contacta a tu instructor para asignarte un horario.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myClasses.map(cls => (
                                    <div 
                                        key={cls.id} 
                                        onClick={() => navigate(`/student/classes/${cls.id}`)}
                                        className="bg-white rounded-[2rem] p-6 shadow-card border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="absolute -right-6 -top-6 size-32 bg-gray-50 rounded-full z-0 group-hover:scale-125 transition-transform duration-500"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="size-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-sm">
                                                    <span className="material-symbols-outlined text-3xl">sports_martial_arts</span>
                                                </div>
                                                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-gray-100 text-gray-500">
                                                    Grupo Regular
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{cls.name}</h3>
                                            <p className="text-sm text-gray-500 mb-6">{cls.instructor}</p>

                                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                                                <span className="material-symbols-outlined text-[20px] text-gray-400">schedule</span>
                                                <span className="font-bold">{cls.schedule}</span>
                                            </div>

                                            <button className="mt-6 w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 group-hover:shadow-indigo-500/20 active:scale-95">
                                                <span>Ver Detalles</span>
                                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* VIEW 2: EVENTS */}
                {activeTab === 'events' && (
                    <motion.div 
                        key="events"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {visibleEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-dashed border-gray-200 text-center min-h-[400px]">
                                <div className="size-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-5xl text-gray-300">event_busy</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No hay eventos próximos</h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    Mantente atento a nuevas convocatorias de torneos, exámenes y seminarios.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visibleEvents.map(evt => {
                                    const isRegistered = student && evt.registrants?.includes(student.id);
                                    const dateObj = new Date(evt.date + 'T12:00:00');
                                    const day = dateObj.getDate();
                                    const month = dateObj.toLocaleDateString('es-ES', { month: 'short' });

                                    return (
                                        <div 
                                            key={evt.id}
                                            onClick={() => setSelectedEvent(evt)}
                                            className="bg-white rounded-[2rem] p-6 shadow-card border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer flex flex-col h-full"
                                        >
                                            <div className="flex gap-5 mb-4">
                                                {/* Date Badge */}
                                                <div className="flex flex-col items-center justify-center w-16 h-16 bg-gray-50 rounded-2xl border border-gray-200 shrink-0 shadow-sm group-hover:border-gray-300 transition-colors">
                                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wide">{month}</span>
                                                    <span className="text-2xl font-black text-gray-900 leading-none">{day}</span>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isRegistered ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                                                                <span className="material-symbols-outlined text-[10px] filled">check_circle</span> Inscrito
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                                                                Disponible
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                        {evt.title}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                                                    <span className="font-medium">{evt.time}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {evt.type === 'exam' ? 'stars' : evt.type === 'tournament' ? 'emoji_events' : 'event'}
                                                    </span>
                                                    <span className="capitalize">{evt.type === 'exam' ? 'Examen' : evt.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Modal */}
        <EventDetailModal 
            event={selectedEvent} 
            onClose={() => setSelectedEvent(null)}
            isRegistered={!!(selectedEvent && student && selectedEvent.registrants?.includes(student.id))}
            onRegister={handleRegister}
        />
    </div>
  );
};

export default StudentClasses;
