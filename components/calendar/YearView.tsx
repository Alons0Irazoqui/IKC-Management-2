
import React, { useMemo } from 'react';
import { format, startOfYear, addMonths, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent } from '../../types';

interface YearViewProps {
    date: Date;
    events: CalendarEvent[];
    onNavigate: (date: Date) => void;
    onMonthClick: (date: Date) => void;
    onDayClick: (date: Date) => void;
}

const YearView: React.FC<YearViewProps> = ({ date, events, onNavigate, onMonthClick, onDayClick }) => {
    const yearStart = startOfYear(date);
    const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

    return (
        <div className="flex flex-col h-full overflow-y-auto animate-in fade-in duration-500 pr-2">
            {/* Grid of Months */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-16 pb-10">
                {months.map(month => (
                    <MonthCell 
                        key={month.toISOString()} 
                        month={month} 
                        events={events} 
                        onMonthClick={onMonthClick}
                        onDayClick={onDayClick}
                    />
                ))}
            </div>
        </div>
    );
};

interface MonthCellProps {
    month: Date;
    events: CalendarEvent[];
    onMonthClick: (date: Date) => void;
    onDayClick: (date: Date) => void;
}

const MonthCell: React.FC<MonthCellProps> = ({ month, events, onMonthClick, onDayClick }) => {
    const days = useMemo(() => {
        return eachDayOfInterval({
            start: month,
            end: endOfMonth(month)
        });
    }, [month]);

    const startDayIndex = month.getDay(); // 0 Sunday, 1 Monday...
    const isCurrentMonth = isSameMonth(new Date(), month);

    return (
        <div className="flex flex-col gap-4 group">
            {/* Interactive Header */}
            <button 
                onClick={() => onMonthClick(month)}
                className="text-left flex items-center gap-2 group/header hover:opacity-70 transition-opacity w-fit"
            >
                <h3 className={`text-xl font-bold capitalize tracking-tight ${isCurrentMonth ? 'text-red-600' : 'text-gray-900'}`}>
                    {format(month, 'MMMM', { locale: es })}
                </h3>
                <span className="material-symbols-outlined text-gray-400 text-sm opacity-0 -translate-x-2 transition-all group-hover/header:opacity-100 group-hover/header:translate-x-0">
                    open_in_full
                </span>
            </button>
            
            <div className="grid grid-cols-7 text-center gap-y-3">
                {['D','L','M','M','J','V','S'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-gray-300 uppercase">{d}</span>
                ))}
                
                {/* Empty slots for start of month */}
                {Array.from({ length: startDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {/* Days */}
                {days.map(day => {
                    // Check for events
                    const dayEvents = events.filter(e => isSameDay(e.start, day) && e.status !== 'cancelled');
                    const hasEvent = dayEvents.length > 0;
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                        <div 
                            key={day.toISOString()} 
                            onClick={() => onDayClick(day)} // Optional interaction in year view
                            className="relative flex flex-col items-center justify-start h-8 cursor-pointer group/day"
                        >
                            <span 
                                className={`
                                    flex items-center justify-center size-7 text-xs font-medium rounded-full transition-all z-10
                                    ${isToday 
                                        ? 'bg-red-600 text-white shadow-md shadow-red-200 font-bold' 
                                        : 'text-gray-700 group-hover/day:bg-gray-100'}
                                `}
                            >
                                {format(day, 'd')}
                            </span>
                            
                            {/* Heatmap Indicator (Red Dot) */}
                            {hasEvent && !isToday && (
                                <div className="absolute bottom-0.5 size-1 rounded-full bg-red-500"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default YearView;
