
import React, { useMemo, useRef } from 'react';

interface DateNavigatorProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    className?: string;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ currentDate, onDateChange, className = '' }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    
    // --- HELPERS ---

    // Maneja el cambio de día (+1 o -1) asegurando que no haya problemas de zona horaria
    const handleStep = (days: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        onDateChange(newDate);
    };

    // Maneja el cambio desde el input nativo (YYYY-MM-DD)
    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [year, month, day] = e.target.value.split('-').map(Number);
        // Creamos la fecha a mediodía para evitar saltos por diferencia horaria
        const newDate = new Date(year, month - 1, day, 12, 0, 0);
        onDateChange(newDate);
    };

    // --- FORMATTING ---

    // 1. Formato para el value del input nativo (YYYY-MM-DD)
    // Usamos 'en-CA' porque siempre devuelve formato ISO local YYYY-MM-DD
    const nativeInputValue = useMemo(() => {
        return currentDate.toLocaleDateString('en-CA');
    }, [currentDate]);

    // 2. Formato Visual (Ej: "Hoy, 12 Oct" o "Lunes, 12 Oct")
    const displayLabel = useMemo(() => {
        const today = new Date();
        const isToday = 
            today.getDate() === currentDate.getDate() &&
            today.getMonth() === currentDate.getMonth() &&
            today.getFullYear() === currentDate.getFullYear();

        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        
        if (isToday) {
            return (
                <>
                    <span className="font-black text-primary mr-1">Hoy,</span>
                    <span className="font-medium text-gray-600 capitalize">
                        {currentDate.toLocaleDateString('es-ES', options)}
                    </span>
                </>
            );
        }

        return (
            <span className="font-bold text-text-main capitalize">
                {currentDate.toLocaleDateString('es-ES', { weekday: 'long', ...options })}
            </span>
        );
    }, [currentDate]);

    return (
        <div className={`flex items-center bg-white rounded-2xl shadow-sm border border-gray-200 p-1 select-none gap-1 ${className}`}>
            {/* CSS Hack: Expande el icono del calendario nativo para cubrir todo el input */}
            <style>{`
                .date-navigator-input::-webkit-calendar-picker-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    opacity: 0;
                    cursor: pointer;
                }
            `}</style>

            {/* Botón Anterior */}
            <button 
                type="button"
                onClick={() => handleStep(-1)}
                className="size-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Día anterior"
            >
                <span className="material-symbols-outlined text-2xl">chevron_left</span>
            </button>

            {/* Área Central Interactiva (Trigger) */}
            <div className="relative flex-1 h-10 group">
                
                {/* Capa Visual */}
                <div className="absolute inset-0 flex items-center justify-center gap-2.5 rounded-xl transition-colors group-hover:bg-gray-50 border border-transparent group-hover:border-gray-100 pointer-events-none">
                    <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform duration-300">
                        calendar_month
                    </span>
                    <div className="text-sm truncate">
                        {displayLabel}
                    </div>
                </div>

                {/* Capa Funcional (Input Invisible con CSS Hack) */}
                <input 
                    ref={inputRef}
                    type="date"
                    value={nativeInputValue}
                    onChange={handleNativeChange}
                    className="date-navigator-input absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    aria-label="Seleccionar fecha"
                />
            </div>

            {/* Botón Siguiente */}
            <button 
                type="button"
                onClick={() => handleStep(1)}
                className="size-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Día siguiente"
            >
                <span className="material-symbols-outlined text-2xl">chevron_right</span>
            </button>
        </div>
    );
};

export default DateNavigator;
