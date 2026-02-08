
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, Navigate } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAcademy } from '../../context/AcademyContext';
import { CalendarEvent } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';

// --- MODERN STYLES FOR RBC (Clean Productivity Tool) ---
const calendarStyles = `
@import url('https://cdn.jsdelivr.net/npm/react-big-calendar@1.8.5/lib/css/react-big-calendar.css');

/* Global Reset */
.rbc-calendar { font-family: 'Inter', sans-serif; color: #111827; }

/* Toolbar Hidden (We use custom header) */
.rbc-toolbar { display: none; }

/* Grid Structure - Ultra Clean */
.rbc-header { 
    padding: 20px 0; 
    font-weight: 800; 
    font-size: 11px; 
    text-transform: uppercase; 
    letter-spacing: 0.05em; 
    color: #9CA3AF; 
    border-bottom: 1px solid #F3F4F6; 
}
.rbc-time-view { border: none; }
.rbc-time-header.rbc-overflowing { border-right: none; }
.rbc-time-content { border-top: 1px solid #F3F4F6; border-left: none; }
.rbc-timeslot-group { border-bottom: 1px solid #F9FAFB; min-height: 60px; } /* Taller slots */
.rbc-day-slot { border-left: 1px solid #F3F4F6; }
.rbc-today { background-color: #FAFAFA; }
.rbc-time-view .rbc-row { min-height: 20px; }

/* Events - Floating Blocks */
.rbc-event {
    background: transparent;
    padding: 2px 4px;
    border: none;
    box-shadow: none;
    border-radius: 0;
    outline: none;
}
.rbc-event:focus { outline: none; }
.rbc-event-label { display: none; } 

/* Current Time Indicator */
.rbc-current-time-indicator { background-color: #DC2626; height: 2px; }
.rbc-current-time-indicator::before {
    content: '';
    position: absolute;
    left: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #DC2626;
}
`;

// --- LOCALIZER ---
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// --- CONSTANTS ---
const EVENT_COLORS = [
    { label: 'Clase Regular', value: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    { label: 'Avanzada', value: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50' },
    { label: 'Open Mat', value: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' },
    { label: 'Torneo', value: '#f97316', bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50' },
    { label: 'Privada', value: '#64748b', bg: 'bg-slate-500', text: 'text-slate-700', light: 'bg-slate-50' },
];

// --- COMPONENTS ---

// 1. Event Card (The Floating Block)
const EventCard = ({ event }: { event: CalendarEvent }) => {
    const isCancelled = event.status === 'cancelled';
    const theme = EVENT_COLORS.find(c => c.value === event.color) || EVENT_COLORS[0];
    
    return (
        <div 
            className={`
                h-full w-full rounded-lg border-l-[4px] shadow-sm hover:shadow-md transition-all p-2 flex flex-col justify-between overflow-hidden group cursor-pointer
                ${isCancelled ? 'bg-red-50 border-red-400 opacity-80' : `bg-white hover:bg-gray-50 border-[${event.color}]`}
            `}
            style={{ borderLeftColor: isCancelled ? '#F87171' : event.color }}
        >
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isCancelled ? 'text-red-400 line-through' : 'text-gray-400'}`}>
                        {format(event.start, 'HH:mm')}
                    </span>
                    {isCancelled && <span className="material-symbols-outlined text-red-500 text-[14px]">block</span>}
                </div>
                
                <h4 className={`text-xs font-bold leading-tight line-clamp-2 ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {event.title}
                </h4>
            </div>
            
            <div className={`flex items-center gap-1.5 text-[10px] font-bold mt-1 ${isCancelled ? 'text-red-400' : 'text-gray-500'}`}>
                <div className={`size-4 rounded-full flex items-center justify-center ${isCancelled ? 'bg-red-100' : theme.light}`}>
                    <span className={`material-symbols-outlined text-[10px] ${isCancelled ? 'text-red-500' : theme.text}`}>person</span>
                </div>
                <span className="truncate">{event.instructor || 'Sin instructor'}</span>
            </div>
        </div>
    );
};

// 2. Quick Edit Modal (Borderless)
const QuickEditModal: React.FC<{
    isOpen: boolean;
    event: Partial<CalendarEvent> | null;
    onClose: () => void;
    onSave: (evt: Partial<CalendarEvent>) => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, event, onClose, onSave, onDelete }) => {
    if (!isOpen || !event) return null;

    const [formData, setFormData] = useState({
        title: '',
        instructor: '',
        date: '',
        startTime: '',
        endTime: '',
        status: 'active' as 'active' | 'cancelled',
        color: '#3b82f6',
    });

    React.useEffect(() => {
        if (event) {
            const start = event.start ? new Date(event.start) : new Date();
            const end = event.end ? new Date(event.end) : addMinutes(start, 60);
            
            setFormData({
                title: event.title || '',
                instructor: event.instructor || event.instructorName || '',
                date: format(start, 'yyyy-MM-dd'),
                startTime: format(start, 'HH:mm'),
                endTime: format(end, 'HH:mm'),
                status: event.status === 'cancelled' ? 'cancelled' : 'active',
                color: event.color || '#3b82f6',
            });
        }
    }, [event]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const [y, m, d] = formData.date.split('-').map(Number);
        const [sh, sm] = formData.startTime.split(':').map(Number);
        const [eh, em] = formData.endTime.split(':').map(Number);

        const newStart = new Date(y, m - 1, d, sh, sm);
        const newEnd = new Date(y, m - 1, d, eh, em);

        onSave({ ...event, ...formData, start: newStart, end: newEnd });
    };

    const inputClass = "w-full bg-[#F9FAFB] border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all placeholder:text-gray-400";
    const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/10 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative border border-gray-100 animate-in zoom-in-95 duration-200" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header Actions */}
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    {event.id && (
                        <button 
                            type="button" 
                            onClick={() => onDelete(event.id!)}
                            className="size-10 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Eliminar sesión"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    )}
                    <button 
                        onClick={onClose}
                        className="size-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="p-8 pb-0">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">
                        {event.id ? 'Editar Sesión' : 'Nueva Clase'}
                    </h2>
                    <p className="text-xs font-medium text-gray-400">Detalles del bloque horario</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
                    
                    {/* Title Input */}
                    <div>
                        <label className={labelClass}>Actividad</label>
                        <input 
                            required
                            autoFocus={!event.id}
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className={inputClass} 
                            placeholder="Ej. Jiu-Jitsu Kids"
                        />
                    </div>

                    {/* Time & Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Fecha</label>
                            <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className={labelClass}>Inicio</label>
                                <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className={`${inputClass} px-2 text-center`} />
                            </div>
                            <div className="flex-1">
                                <label className={labelClass}>Fin</label>
                                <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className={`${inputClass} px-2 text-center`} />
                            </div>
                        </div>
                    </div>

                    {/* Instructor & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Instructor</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400 material-symbols-outlined text-[18px]">person</span>
                                <input 
                                    value={formData.instructor} 
                                    onChange={e => setFormData({...formData, instructor: e.target.value})}
                                    className={`${inputClass} pl-10`} 
                                    placeholder="Nombre"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Estado</label>
                            <select 
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value as any})}
                                className={`${inputClass} ${formData.status === 'cancelled' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}
                            >
                                <option value="active">Activa</option>
                                <option value="cancelled">Cancelada</option>
                            </select>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className={labelClass}>Etiqueta</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {EVENT_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setFormData({...formData, color: c.value})}
                                    className={`size-8 rounded-full flex items-center justify-center transition-all ${c.bg} ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'opacity-40 hover:opacity-100'}`}
                                    title={c.label}
                                >
                                    {formData.color === c.value && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="mt-4 w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm shadow-xl shadow-gray-900/20 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        Guardar Cambios
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
const ScheduleManager: React.FC = () => {
    const { scheduleEvents, updateCalendarEvent, addCalendarEvent, deleteCalendarEvent } = useAcademy();
    const { addToast } = useToast();
    const { confirm } = useConfirmation();

    // State
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<any>(Views.WEEK);
    const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- HANDLERS ---

    const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
        setSelectedEvent({
            start,
            end,
            title: '',
            instructor: '',
            status: 'active',
            color: '#3b82f6'
        });
        setIsModalOpen(true);
    }, []);

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    }, []);

    const handleSaveEvent = (evt: Partial<CalendarEvent>) => {
        if (evt.id) {
            updateCalendarEvent(evt.id, evt);
            addToast('Sesión actualizada', 'success');
        } else {
            addCalendarEvent({
                ...evt,
                id: '', // Generated by Context
                academyId: '', // Assigned by Context
                type: 'class'
            } as CalendarEvent);
            addToast('Clase creada', 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        const evt = scheduleEvents.find(e => e.id === id);
        const message = evt?.classId 
            ? 'Esta es una sesión de una clase recurrente. Se cancelará solo para esta fecha.'
            : '¿Eliminar este evento permanentemente?';

        confirm({
            title: 'Eliminar Sesión',
            message,
            type: 'danger',
            confirmText: 'Sí, Eliminar',
            onConfirm: () => {
                deleteCalendarEvent(id);
                setIsModalOpen(false);
                addToast('Sesión eliminada', 'info');
            }
        });
    };

    // Custom Toolbar Logic
    const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        let newDate = new Date(date);
        if (action === 'TODAY') newDate = new Date();
        else {
            const move = action === 'NEXT' ? 1 : -1;
            if (view === Views.MONTH) newDate.setMonth(newDate.getMonth() + move);
            else if (view === Views.WEEK) newDate.setDate(newDate.getDate() + (move * 7));
            else newDate.setDate(newDate.getDate() + move);
        }
        setDate(newDate);
    };

    const { components } = useMemo(() => ({
        components: {
            event: EventCard
        }
    }), []);

    return (
        <div className="flex flex-col h-full bg-white relative font-sans">
            <style>{calendarStyles}</style>
            
            {/* --- CUSTOM TOOLBAR --- */}
            <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white sticky top-0 z-20">
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 min-w-[200px] capitalize">
                        {format(date, view === Views.MONTH ? 'MMMM yyyy' : 'MMMM', { locale: es })}
                    </h1>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => handleNavigate('PREV')} className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                        <button onClick={() => handleNavigate('TODAY')} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-white hover:shadow-sm transition-all">Hoy</button>
                        <button onClick={() => handleNavigate('NEXT')} className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {[
                            { id: Views.MONTH, label: 'Mes' },
                            { id: Views.WEEK, label: 'Semana' },
                            { id: Views.DAY, label: 'Día' },
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    view === v.id 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                }`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => {
                            const now = new Date();
                            now.setMinutes(0,0,0);
                            handleSelectSlot({ start: now, end: addMinutes(now, 60) });
                        }}
                        className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-gray-900/10 flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span className="hidden md:inline">Nueva Clase</span>
                    </button>
                </div>
            </div>

            {/* --- CALENDAR --- */}
            <div className="flex-1 p-6 overflow-hidden">
                <Calendar
                    localizer={localizer}
                    events={scheduleEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    date={date}
                    view={view}
                    onNavigate={setDate}
                    onView={setView}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    components={components}
                    min={new Date(0, 0, 0, 6, 0, 0)}
                    max={new Date(0, 0, 0, 23, 0, 0)}
                    step={30}
                    timeslots={2}
                    toolbar={false} // Custom toolbar used
                    formats={{
                        dayHeaderFormat: (date) => format(date, 'EEEE d', { locale: es }),
                    }}
                />
            </div>

            {/* --- MODAL --- */}
            <QuickEditModal 
                isOpen={isModalOpen}
                event={selectedEvent}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
            />
        </div>
    );
};

export default ScheduleManager;
