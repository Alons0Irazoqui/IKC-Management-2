
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { ClassException } from '../../types';

const CalendarManager: React.FC = () => {
  const { classes, modifyClassSession } = useStore();
  const { addToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modal State
  const [selectedSession, setSelectedSession] = useState<{
      classId: string, 
      date: string, 
      currentInfo: any,
      exception?: ClassException 
  } | null>(null);
  
  const [editForm, setEditForm] = useState({ instructor: '', startTime: '', endTime: '' });

  // --- CALENDAR LOGIC REWRITE ---

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const days = [];
      
      // Pad with empty days for start of week (Sunday start)
      for (let i = 0; i < firstDay.getDay(); i++) {
          days.push(null);
      }
      
      // Fill actual days
      for (let i = 1; i <= lastDay.getDate(); i++) {
          days.push(new Date(year, month, i));
      }
      
      return days;
  };

  const getDayNameEnglish = (date: Date) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
  };

  const generateEventsForDay = (day: Date) => {
      if (!day) return [];
      const dateStr = day.toISOString().split('T')[0];
      const dayName = getDayNameEnglish(day);
      const events: any[] = [];

      classes.forEach(cls => {
          // 1. Is it a regular schedule day?
          const isScheduled = cls.days.includes(dayName);
          
          // 2. Check exceptions
          const exception = cls.modifications.find(m => m.date === dateStr);
          const movedHere = cls.modifications.find(m => m.newDate === dateStr && m.type === 'move');

          if (movedHere) {
               events.push({
                  id: `move-${cls.id}-${dateStr}`,
                  classId: cls.id,
                  name: cls.name,
                  date: dateStr,
                  startTime: movedHere.newStartTime || cls.startTime,
                  endTime: movedHere.newEndTime || cls.endTime,
                  instructor: movedHere.newInstructor || cls.instructor,
                  type: 'moved_here'
               });
          } else if (isScheduled) {
              if (exception?.type === 'cancel') {
                   events.push({
                      id: `cancel-${cls.id}-${dateStr}`,
                      classId: cls.id,
                      name: cls.name,
                      startTime: cls.startTime,
                      type: 'cancelled'
                   });
              } else if (exception?.type === 'move') {
                   // Ghost event (moved away)
                   events.push({
                      id: `ghost-${cls.id}-${dateStr}`,
                      name: cls.name,
                      type: 'ghost'
                   });
              } else {
                   // Regular or Modified time/instructor
                   events.push({
                      id: `reg-${cls.id}-${dateStr}`,
                      classId: cls.id,
                      name: cls.name,
                      date: dateStr,
                      startTime: exception?.newStartTime || cls.startTime,
                      endTime: exception?.newEndTime || cls.endTime,
                      instructor: exception?.newInstructor || cls.instructor,
                      type: exception ? 'modified' : 'regular',
                      exception
                   });
              }
          }
      });
      
      return events.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  };

  // --- ACTIONS ---

  const handleSessionClick = (event: any) => {
      if (event.type === 'ghost' || event.type === 'cancelled') return;
      setSelectedSession({
          classId: event.classId,
          date: event.date,
          currentInfo: event,
          exception: event.exception
      });
      setEditForm({
          instructor: event.instructor,
          startTime: event.startTime,
          endTime: event.endTime
      });
  };

  const handleSaveChanges = () => {
      if (!selectedSession) return;
      const exception: ClassException = {
          date: selectedSession.date,
          type: 'time', 
          newInstructor: editForm.instructor,
          newStartTime: editForm.startTime,
          newEndTime: editForm.endTime
      };
      modifyClassSession(selectedSession.classId, exception);
      addToast('Sesión actualizada', 'success');
      setSelectedSession(null);
  };

  const handleCancelSession = () => {
      if (!selectedSession) return;
      if (confirm('¿Cancelar esta clase para esta fecha?')) {
          modifyClassSession(selectedSession.classId, {
              date: selectedSession.date,
              type: 'cancel'
          });
          addToast('Clase cancelada', 'info');
          setSelectedSession(null);
      }
  };

  const calendarDays = getDaysInMonth(currentMonth);

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-text-main">Calendario Maestro</h1>
                <p className="text-text-secondary mt-1">Vista global de todas las clases.</p>
            </div>
            
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="w-48 text-center font-bold text-text-main capitalize">
                    {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-soft overflow-hidden flex flex-col">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="py-4 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                    if (!day) {
                        return <div key={`empty-${idx}`} className="border-b border-r border-gray-100 bg-gray-50/20"></div>;
                    }

                    const dateStr = day.toISOString().split('T')[0];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const events = generateEventsForDay(day);

                    return (
                        <div key={dateStr} className={`border-b border-r border-gray-100 p-2 min-h-[120px] flex flex-col gap-1 transition-colors ${isToday ? 'bg-blue-50/20' : 'hover:bg-gray-50'}`}>
                            <span className={`text-xs font-bold mb-1 ml-1 ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                {day.getDate()}
                            </span>
                            
                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[140px] no-scrollbar">
                                {events.map(evt => (
                                    <div 
                                        key={evt.id}
                                        onClick={() => handleSessionClick(evt)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer truncate transition-all border ${
                                            evt.type === 'cancelled' ? 'bg-red-50 text-red-400 border-red-100 line-through opacity-70' :
                                            evt.type === 'ghost' ? 'bg-gray-50 text-gray-400 border-dashed border-gray-200 opacity-50' :
                                            evt.type === 'moved_here' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                            evt.type === 'modified' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                                        }`}
                                    >
                                        <div className="flex justify-between">
                                            <span>{evt.startTime}</span>
                                            {evt.type === 'modified' && <span className="size-1.5 bg-amber-500 rounded-full"></span>}
                                        </div>
                                        <div className="truncate">{evt.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Edit Modal */}
        {selectedSession && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-text-main">Editar Sesión</h3>
                            <p className="text-sm text-text-secondary">{selectedSession.date}</p>
                        </div>
                        <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-symbols-outlined">close</span></button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Instructor</label>
                            <input className="w-full rounded-xl border-gray-200 p-3 text-sm font-medium" value={editForm.instructor} onChange={e => setEditForm({...editForm, instructor: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Inicio</label>
                                <input type="time" className="w-full rounded-xl border-gray-200 p-3 text-sm font-medium" value={editForm.startTime} onChange={e => setEditForm({...editForm, startTime: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Fin</label>
                                <input type="time" className="w-full rounded-xl border-gray-200 p-3 text-sm font-medium" value={editForm.endTime} onChange={e => setEditForm({...editForm, endTime: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={handleCancelSession} className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100">Cancelar Clase</button>
                            <button onClick={handleSaveChanges} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CalendarManager;
