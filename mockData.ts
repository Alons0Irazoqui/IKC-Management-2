
import { Student, ClassSession, ScheduleItem, Message, LibraryResource, AcademySettings, CalendarEvent, TuitionRecord } from './types';

// Updated Ranks with granular attendance requirements for testing
export const defaultRanks = [
    { id: 'rank-1', name: 'White Belt', color: 'white' as const, order: 1, requiredAttendance: 0 },
    { id: 'rank-2', name: 'Yellow Belt', color: 'yellow' as const, order: 2, requiredAttendance: 24 },
    { id: 'rank-3', name: 'Orange Belt', color: 'orange' as const, order: 3, requiredAttendance: 48 },
    { id: 'rank-4', name: 'Green Belt', color: 'green' as const, order: 4, requiredAttendance: 72 },
    { id: 'rank-5', name: 'Blue Belt', color: 'blue' as const, order: 5, requiredAttendance: 96 },
    { id: 'rank-6', name: 'Purple Belt', color: 'purple' as const, order: 6, requiredAttendance: 120 },
    { id: 'rank-7', name: 'Brown Belt', color: 'brown' as const, order: 7, requiredAttendance: 150 },
    { id: 'rank-8', name: 'Black Belt', color: 'black' as const, order: 8, requiredAttendance: 200 },
];

export const defaultAcademySettings: AcademySettings = {
    id: 'acad-1',
    code: 'DEMO-123',
    ownerId: 'm1',
    name: 'Pulse Academy',
    modules: {
        library: true,
        payments: true,
        attendance: true,
    },
    paymentSettings: {
        lateFeeAmount: 150,
        lateFeeGracePeriod: 5,
        monthlyTuition: 800,
        billingDay: 1,
        lateFeeDay: 10
    },
    bankDetails: {
        bankName: 'BBVA Bancomer',
        accountHolder: 'Pulse Academy S.A. de C.V.',
        accountNumber: '1234567890',
        clabe: '012345678901234567',
        instructions: 'Por favor incluye tu nombre completo en la referencia del pago.'
    },
    ranks: defaultRanks
};

export const mockStudents: Student[] = [
    {
        id: '8821',
        userId: 'u-8821',
        academyId: 'acad-1',
        name: 'Mateo Silva',
        age: 8,
        birthDate: '2015-05-10',
        email: 'mateo.student@example.com',
        cellPhone: '5551234567',
        password: 'password123',
        rank: 'White Belt',
        rankId: 'rank-1',
        rankColor: 'white',
        status: 'active',
        program: 'Kids Program',
        attendance: 35,
        totalAttendance: 35,
        joinDate: 'Aug 15, 2023',
        avatarUrl: 'https://i.pravatar.cc/150?u=mateo',
        stripes: 2,
        balance: 0,
        classesId: [],
        attendanceHistory: [],
        promotionHistory: [
            { rank: 'White Belt', date: 'Aug 15, 2023', notes: 'Joined Academy' }
        ],
        guardian: {
            fullName: 'Roberto Silva',
            email: 'roberto.padre@example.com',
            relationship: 'Padre',
            phones: {
                main: '5559876543',
                secondary: '5551112222'
            },
            address: {
                street: 'Av. Reforma',
                exteriorNumber: '123',
                colony: 'Centro',
                zipCode: '06600',
                city: 'CDMX'
            }
        }
    },
    {
        id: '7442',
        userId: 'u-7442',
        academyId: 'acad-1',
        name: 'Lucia Mendez',
        age: 24,
        birthDate: '1999-11-22',
        email: 'lucia@example.com',
        cellPhone: '5559876543',
        password: 'password123',
        rank: 'Blue Belt',
        rankId: 'rank-5',
        rankColor: 'blue',
        status: 'debtor',
        program: 'Adults',
        attendance: 45,
        totalAttendance: 165,
        joinDate: 'Jan 10, 2022',
        avatarUrl: 'https://i.pravatar.cc/150?u=lucia',
        stripes: 1,
        balance: 950, // Updated to reflect mockTuitionRecords
        classesId: [],
        attendanceHistory: [],
        promotionHistory: [
            { rank: 'White Belt', date: 'Jan 10, 2022', notes: 'Joined Academy' },
            { rank: 'Blue Belt', date: 'Dec 05, 2022', notes: 'Exceptional performance in Guard Passing' }
        ],
        guardian: {
            fullName: 'Lucia Mendez (Self)',
            email: 'lucia@example.com',
            relationship: 'Otro', // Self-responsible
            phones: {
                main: '5559876543'
            },
            address: {
                street: 'Calle Pino',
                exteriorNumber: '45',
                interiorNumber: '3B',
                colony: 'Del Valle',
                zipCode: '03100',
                city: 'CDMX'
            }
        }
    }
];

// --- MOCK FINANCIAL RECORDS (Single Record Model) ---
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const getRelativeDate = (monthsOffset: number, day: number) => {
    const d = new Date(currentYear, currentMonth + monthsOffset, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
};

export const mockTuitionRecords: TuitionRecord[] = [
    // 1. PAID: Historical record for Mateo
    {
        id: 'tx-001',
        academyId: 'acad-1',
        studentId: '8821', // Mateo
        studentName: 'Mateo Silva',
        concept: 'Mensualidad Enero',
        month: `${currentYear}-01`,
        amount: 800,
        penaltyAmount: 0,
        dueDate: getRelativeDate(-1, 5), // Due last month
        paymentDate: getRelativeDate(-1, 4), // Paid on time
        status: 'paid',
        proofUrl: null,
        method: 'Transferencia',
        type: 'charge',
        canBePaidInParts: false
    },
    // 2. OVERDUE: Record for Lucia (Late)
    {
        id: 'tx-002',
        academyId: 'acad-1',
        studentId: '7442', // Lucia
        studentName: 'Lucia Mendez',
        concept: 'Mensualidad Febrero',
        month: `${currentYear}-02`,
        amount: 800,
        penaltyAmount: 150, // Penalty Applied
        dueDate: getRelativeDate(0, 1), // Due 1st of this month (assume we are mid-month)
        paymentDate: null,
        status: 'overdue', // SYSTEM SETS THIS
        proofUrl: null,
        type: 'charge',
        canBePaidInParts: false
    },
    // 3. IN_REVIEW: Record for Mateo (Just uploaded)
    {
        id: 'tx-003',
        academyId: 'acad-1',
        studentId: '8821', // Mateo
        studentName: 'Mateo Silva',
        concept: 'Uniforme Gi',
        amount: 1500,
        penaltyAmount: 0,
        dueDate: getRelativeDate(0, 15),
        paymentDate: new Date().toISOString(), // Uploaded Just Now
        status: 'in_review',
        proofUrl: 'https://via.placeholder.com/150', // Mock Proof
        method: 'Transferencia',
        type: 'charge',
        canBePaidInParts: true
    },
    // 4. PENDING: Future record for Lucia
    {
        id: 'tx-004',
        academyId: 'acad-1',
        studentId: '7442', // Lucia
        studentName: 'Lucia Mendez',
        concept: 'Torneo Estatal',
        amount: 500,
        penaltyAmount: 0,
        dueDate: getRelativeDate(1, 10), // Next Month
        paymentDate: null,
        status: 'pending',
        proofUrl: null,
        type: 'charge',
        canBePaidInParts: true
    }
];

export const mockLibraryResources: LibraryResource[] = [
    {
        id: 'lib-1',
        academyId: 'acad-1',
        title: 'Armbar Fundamentals',
        description: 'Master the basics of the armbar from closed guard. Key details for leverage and control.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop',
        duration: '12:45',
        category: 'Technique',
        level: 'White Belt',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
        completedBy: []
    },
    {
        id: 'lib-2',
        academyId: 'acad-1',
        title: 'Advanced Guard Passing',
        description: 'Dynamic passing sequences combining toreando and knee slice passes.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2072&auto=format&fit=crop',
        duration: '18:20',
        category: 'Technique',
        level: 'Blue Belt',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
        completedBy: ['8821']
    }
];

export const mockClassSession: ClassSession = {
    id: 'c1',
    name: 'Jiu-Jitsu Intermedio',
    time: '18:00 - 19:30',
    instructor: 'Master Kenji',
    totalStudents: 30,
    enrolled: 24,
    attendees: []
};

export const mockSchedule: ScheduleItem[] = [
    { id: '1', day: 'Monday', startTime: '07:00 AM', endTime: '08:00 AM', title: 'Morning Drilling', instructor: 'Prof. Miguel', level: 'All Levels', type: 'gi', enrolled: true },
    { id: '2', day: 'Monday', startTime: '06:00 PM', endTime: '07:30 PM', title: 'Fundamentals', instructor: 'Coach Sarah', level: 'White Belt', type: 'gi', enrolled: false },
];

export const mockMessages: Message[] = [
    { 
        id: '1', 
        academyId: 'acad-1',
        senderId: 'm1',
        senderName: 'Pulse Academy', 
        recipientId: 'all', 
        recipientName: 'Everyone',
        subject: 'Holiday Schedule Changes', 
        content: 'Please note that the academy will be closed on December 25th...', 
        date: '2 days ago', 
        read: false, 
        type: 'announcement' 
    },
];

// --- DYNAMIC CALENDAR GENERATION ---
const generateDynamicEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const today = new Date();
    
    // Helper to generate dates relative to today
    const getDate = (dayOffset: number, hours: number, minutes: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + dayOffset);
        d.setHours(hours, minutes, 0, 0);
        return d;
    };

    // Generate events for the current week (from 2 days ago to 12 days ahead)
    for (let i = -2; i <= 12; i++) {
        const date = getDate(i, 0, 0);
        const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon...

        // Mon/Wed/Fri: Fundamentals (17:00 - 18:00)
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
            events.push({
                id: `evt-fund-${i}`,
                academyId: 'acad-1',
                title: 'BJJ Fundamentals',
                start: getDate(i, 17, 0),
                end: getDate(i, 18, 0),
                instructor: 'Sensei Miguel',
                instructorName: 'Sensei Miguel', // Legacy support
                color: '#3b82f6', // Blue
                type: 'class',
                status: 'active',
                description: 'Técnicas básicas y drills de posición.'
            });
        }

        // Tue/Thu: Advanced (19:00 - 20:30)
        if (dayOfWeek === 2 || dayOfWeek === 4) {
            events.push({
                id: `evt-adv-${i}`,
                academyId: 'acad-1',
                title: 'Advanced Gi',
                start: getDate(i, 19, 0),
                end: getDate(i, 20, 30),
                instructor: 'Master Kenji',
                instructorName: 'Master Kenji',
                color: '#8b5cf6', // Purple
                type: 'class',
                status: 'active',
                description: 'Sparring específico y técnicas avanzadas.'
            });
        }

        // Sat: Open Mat (10:00 - 12:00)
        if (dayOfWeek === 6) {
            events.push({
                id: `evt-open-${i}`,
                academyId: 'acad-1',
                title: 'Open Mat',
                start: getDate(i, 10, 0),
                end: getDate(i, 12, 0),
                instructor: 'All Instructors',
                instructorName: 'All Instructors',
                color: '#10b981', // Emerald
                type: 'class',
                status: 'active',
                description: 'Entrenamiento libre supervisado.'
            });
        }
    }

    // Add a Special Tournament next Saturday
    const nextSaturdayOffset = 6 - today.getDay() + 7;
    events.push({
        id: 'evt-tournament-1',
        academyId: 'acad-1',
        title: 'Torneo Interno Verano',
        start: getDate(nextSaturdayOffset, 9, 0),
        end: getDate(nextSaturdayOffset, 14, 0),
        instructor: 'Staff',
        instructorName: 'Staff',
        color: '#f97316', // Orange
        type: 'tournament',
        status: 'active',
        description: 'Torneo interno para todos los cinturones.',
        maxCapacity: 100
    });

    // Add an Exam this Friday
    const fridayOffset = 5 - today.getDay();
    events.push({
        id: 'evt-exam-1',
        academyId: 'acad-1',
        title: 'Examen de Grado',
        start: getDate(fridayOffset > 0 ? fridayOffset : fridayOffset + 7, 18, 0),
        end: getDate(fridayOffset > 0 ? fridayOffset : fridayOffset + 7, 20, 0),
        instructor: 'Grand Master',
        instructorName: 'Grand Master',
        color: '#db2777', // Pink
        type: 'exam',
        status: 'active',
        description: 'Examen de promoción de cintas.',
        maxCapacity: 20
    });

    return events;
};

export const mockCalendarEvents: CalendarEvent[] = generateDynamicEvents();