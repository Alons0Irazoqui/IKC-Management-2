
/**
 * Returns current date in 'YYYY-MM-DD' format based on user's device timezone.
 * Critical: Avoids UTC conversion issues from toISOString().
 * Use this for ALL database date keys.
 */
export const getLocalDate = (): string => {
    const d = new Date();
    // Use local getters, not UTC getters
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Gets the current timestamp strictly in local time representation if needed,
 * or standard ISO. For logic consistency, we prefer standard ISO for timestamps,
 * but for 'Dates' (YYYY-MM-DD), we strictly use getLocalDate.
 */
export const getCurrentTimestamp = (): string => {
    return new Date().toISOString(); 
};

/**
 * Ensures a date string is interpreted as local midnight, preventing timezone shifts.
 * Returns a Date object that is safe to display.
 */
export const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Formats a 'YYYY-MM-DD' string to a readable format (e.g., 'Lunes, 10 de Oct')
 * safe from timezone shifts by constructing the date manually in local time.
 */
export const formatDateDisplay = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateStr) return '';
    
    // Split explicitly to avoid Date parsing timezone assumptions
    const [year, month, day] = dateStr.split('-').map(Number);
    
    if (!year || !month || !day) return dateStr; 

    const dateObj = new Date(year, month - 1, day);
    
    const defaultOptions: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'short' 
    };

    return dateObj.toLocaleDateString('es-ES', options || defaultOptions);
};
