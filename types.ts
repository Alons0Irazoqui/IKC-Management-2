
export type RankColor = 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'brown' | 'black';

// Data Architecture Update: Removed 'exam_ready_debt'. Financial status is now decoupled from academic status.
export type StudentStatus = 'active' | 'inactive' | 'debtor' | 'exam_ready';

export interface Rank {
    id: string;
    name: string;
    color: RankColor;
    order: number;
    requiredAttendance: number; // Field confirmed for Exam Logic
}

export interface BankDetails {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    clabe: string;
    instructions?: string;
}

export interface PaymentSettings {
    lateFeeAmount: number;
    lateFeeGracePeriod: number;
    monthlyTuition: number;
    billingDay: number;
    lateFeeDay: number;
}

export interface AcademySettings {
    id: string;
    name: string;
    code: string;
    ownerId: string;
    modules: {
        library: boolean;
        payments: boolean;
        attendance: boolean;
    };
    paymentSettings: PaymentSettings;
    bankDetails?: BankDetails;
    ranks: Rank[];
}

export interface PromotionHistoryItem {
    rank: string;
    date: string;
    notes?: string;
}

export interface AttendanceRecord {
    date: string; // YYYY-MM-DD
    classId: string;
    status: 'present' | 'late' | 'excused' | 'absent';
    timestamp: string;
    reason?: string;
}

// --- EXTENDED DATA STRUCTURES ---

export interface Address {
    street: string;
    exteriorNumber: string;
    interiorNumber?: string;
    colony: string;
    zipCode: string;
    city?: string;
    state?: string;
}

export interface ContactPhones {
    main: string;
    secondary?: string;
    tertiary?: string;
}

export interface GuardianProfile {
    fullName: string;
    email: string;
    phones: ContactPhones;
    relationship: 'Padre' | 'Madre' | 'Tutor Legal' | 'Familiar' | 'Otro';
    address: Address;
}

export interface Note {
    id: string;
    date: string;
    content: string;
    author: string;
}

export interface Student {
    id: string;
    userId: string;
    academyId: string;
    
    // Auth & Identity
    email: string;
    password?: string;
    
    // Alumno Profile
    name: string;
    age: number;
    birthDate: string;
    cellPhone: string;
    avatarUrl?: string;
    
    // Physical Data
    weight?: number;
    height?: number;
    bloodType?: string; // Added field
    
    // Guardian / Responsible Party
    guardian: GuardianProfile;

    // Academic Data
    rank: string;
    rankId: string;
    rankColor: RankColor;
    stripes: number;
    status: StudentStatus;
    program: string;
    
    // Computed / Activity Data
    attendance: number;
    totalAttendance: number;
    lastAttendance?: string;
    attendanceHistory: AttendanceRecord[];
    joinDate: string;
    balance: number; 
    classesId: string[];
    promotionHistory?: PromotionHistoryItem[];
    notes?: Note[];
}

export interface SessionModification {
    date: string; // YYYY-MM-DD
    type: 'cancel' | 'move' | 'instructor' | 'time' | 'rescheduled';
    newDate?: string;
    newStartTime?: string;
    newEndTime?: string;
    newInstructor?: string;
}

export interface ClassException extends SessionModification {
    id?: string;
    reason?: string;
}

// Legacy Interface
export interface ClassCategory {
    id: string;
    academyId: string;
    name: string;
    schedule: string;
    days: string[]; // e.g. ['Monday', 'Wednesday']
    startTime: string; // "19:00"
    endTime: string; // "20:30"
    instructor: string;
    studentCount: number;
    studentIds: string[];
    modifications: ClassException[];
}

// --- NEW ARCHITECTURE: REAL CALENDAR (Standardized) ---
export interface CalendarEvent {
    id: string;
    academyId: string;
    title: string;
    start: Date; // ISO Date Object
    end: Date;   // ISO Date Object
    
    // Core Props
    instructor: string;
    status: 'active' | 'cancelled' | 'rescheduled';
    color: string;
    description?: string;
    
    // Linking to Class System
    classId?: string; // ID of the ClassCategory if this is a generated class instance
    isRecurring?: boolean; 
    
    // Legacy / Extended Support
    instructorName?: string; // Optional for backward compatibility, mapped to instructor
    resourceId?: string;
    type: 'class' | 'workshop' | 'exam' | 'tournament' | 'private' | 'seminar';
    relatedClassId?: string;
    attendees?: string[];
    maxCapacity?: number;
    isCancelled?: boolean; // Legacy flag, mapped to status === 'cancelled'
    
    // UI Helpers (Optional)
    isRegistered?: boolean;
    icon?: string;
}

export interface Event extends CalendarEvent {
    // Extended Interface for Marketplace Events (legacy compatibility)
    date: string; // string YYYY-MM-DD
    time: string; // string HH:MM
    registrants?: string[];
    registeredCount: number;
    capacity: number;
    eligibleRanks?: string[];
    isVisibleToStudents?: boolean; // Control visibility in student dashboard
}

// --- NEW FINANCIAL ARCHITECTURE (Single Record / Mutable State) ---

// 'partial' added for waterfall logic
export type TuitionStatus = 'pending' | 'overdue' | 'in_review' | 'paid' | 'charged' | 'partial';
export type ChargeCategory = 'Mensualidad' | 'Torneo' | 'Examen/Promoción' | 'Equipo/Uniforme' | 'Otro' | 'Late Fee';

export interface PaymentHistoryItem {
    date: string; // ISO String
    amount: number;
    method?: string; // 'Efectivo', 'Transferencia', etc.
}

export interface TuitionRecord {
    id: string;
    academyId: string;
    studentId: string;
    studentName?: string; // Denormalized for easier display
    
    concept: string; // "Mensualidad Enero", "Uniforme"
    month?: string; // "2024-01" (Optional context)
    
    amount: number; // Current remaining debt
    originalAmount?: number; // Audit trail: initial debt before partial payments
    
    penaltyAmount: number; // Applied Late fee
    customPenaltyAmount?: number; // Config: Specific penalty for this record if overdue
    
    dueDate: string; // ISO String (YYYY-MM-DD)
    paymentDate: string | null; // ISO String (YYYY-MM-DDTHH:mm:ss) - Frozen on upload
    
    status: TuitionStatus;
    proofUrl: string | null;
    proofType?: string; // 'image/png', 'application/pdf'
    
    method?: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'System';

    // Optional fields for extended functionality
    type?: 'charge' | 'payment';
    description?: string;
    category?: ChargeCategory; // Strongly typed now
    
    // New Fields for Batch & Waterfall Logic
    batchPaymentId?: string; // Links multiple records to one single proof/transaction
    canBePaidInParts: boolean; // Priority flag: False = Must be paid fully (e.g. Tuition)
    relatedEventId?: string; // Links to an Event ID (Tournament/Exam)
    declaredAmount?: number; // What the student claims to have paid in total for this batch

    // --- ARCHITECTURAL UPDATE: TRANSACTION DETAILS ---
    // Allows storing a breakdown of what was covered in this specific record/payment.
    details?: { 
        description: string; 
        amount: number; 
    }[];

    // --- NEW: Payment History for Partial/Full Tracking ---
    paymentHistory?: PaymentHistoryItem[];
}

export interface ManualChargeData {
    studentId: string;
    category: ChargeCategory;
    title: string; // Maps to concept
    description?: string;
    amount: number;
    dueDate: string;
    canBePaidInParts: boolean;
    relatedEventId?: string;
    customPenaltyAmount?: number;
}

export interface UserProfile {
    id: string;
    email: string;
    role: 'master' | 'student';
    name: string;
    avatarUrl: string;
    academyId: string; 
    studentId?: string; 
    password?: string; 
    paymentMethods?: { id: string; brand: string; last4: string; expMonth: number; expYear: number }[];
}

export interface LibraryResource {
    id: string;
    academyId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    duration: string;
    category: 'Technique' | 'Sparring' | 'Mindset' | 'History';
    level: string;
    videoUrl: string;
    completedBy: string[];
}

export interface ClassSession {
    id: string;
    name: string;
    time: string;
    instructor: string;
    totalStudents: number;
    enrolled: number;
    attendees: {
        studentId: string;
        name: string;
        rank: string;
        status: 'present' | 'absent' | 'late' | 'unmarked';
        avatarUrl: string;
        note?: string;
    }[];
}

export interface ScheduleItem {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    title: string;
    instructor: string;
    level: string;
    type: 'gi' | 'nogi' | 'striking';
    enrolled: boolean;
}

export interface Message {
    id: string;
    academyId: string;
    senderId: string;
    senderName: string;
    recipientId: string | 'all'; 
    recipientName: string;
    subject: string;
    content: string;
    date: string;
    read: boolean;
    type: 'announcement' | 'personal';
}