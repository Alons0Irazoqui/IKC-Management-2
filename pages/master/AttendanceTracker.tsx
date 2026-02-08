
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { getLocalDate, formatDateDisplay } from '../../utils/dateUtils';
import { Student } from '../../types';
import DateNavigator from '../../components/ui/DateNavigator';

const AttendanceTracker: React.FC = () => {
  const { classes, students, markAttendance, bulkMarkPresent } = useStore();
  const { addToast } = useToast();

  // --- STATE ---
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDate());
  
  // Visual Feedback State (Flash effect on row update)
  const [lastUpdatedId, setLastUpdatedId] = useState<string | null>(null);

  // Initialize selected class if available
  useEffect(() => {
      if (classes.length > 0 && !selectedClassId) {
          setSelectedClassId(classes[0].id);
      }
  }, [classes]);

  // --- DATA DERIVATION ---
  const currentClass = classes.find(c => c.id === selectedClassId);

  const filteredStudents = useMemo(() => {
      if (!currentClass) return [];
      return students
          .filter(s => currentClass.studentIds.includes(s.id) && s.status !== 'inactive')
          .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentClass, students]);

  // Derived Stats for the Header
  const stats = useMemo(() => {
      let present = 0, late = 0, absent = 0, excused = 0, total = filteredStudents.length;
      
      filteredStudents.forEach(s => {
          const record = s.attendanceHistory?.find(r => r.date === selectedDate && r.classId === selectedClassId);
          if (record?.status === 'present') present++;
          if (record?.status === 'late') late++;
          if (record?.status === 'absent') absent++;
          if (record?.status === 'excused') excused++;
      });

      return { present, late, absent, excused, total, unmarked: total - (present + late + absent + excused) };
  }, [filteredStudents, selectedDate, selectedClassId]);

  // --- HANDLERS ---

  const handleStatusChange = (studentId: string, status: 'present' | 'late' | 'absent' | 'excused') => {
      if (!selectedClassId) return;
      
      // 1. Trigger Animation
      setLastUpdatedId(studentId);
      setTimeout(() => setLastUpdatedId(null), 600); // Clear after animation

      // 2. Update Data
      markAttendance(studentId, selectedClassId, selectedDate, status);
  };

  const handleBulkPresent = () => {
      if (!selectedClassId) return;
      // Optimistic visual feedback could be added here, but context handles logic
      bulkMarkPresent(selectedClassId, selectedDate);
      addToast(`Se marcaron ${stats.unmarked} alumnos como presentes`, 'success');
  };

  // Date conversion helpers for DateNavigator
  const handleDateChange = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
  };

  const currentDateObj = useMemo(() => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
  }, [selectedDate]);

  // --- RENDER HELPERS ---

  const getRowBackground = (student: Student, currentStatus?: string) => {
      // Priority 1: Animation Flash
      if (lastUpdatedId === student.id) {
          return 'bg-blue-50 border-blue-200 shadow-md transform scale-[1.01] z-10 transition-all duration-300';
      }
      
      // Priority 2: Static Status State
      switch (currentStatus) {
          case 'present': return 'bg-green-50/30 border-green-100';
          case 'late': return 'bg-yellow-50/30 border-yellow-100';
          case 'absent': return 'bg-red-50/30 border-red-100';
          case 'excused': return 'bg-blue-50/30 border-blue-100';
          default: return 'bg-white border-gray-100';
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-hidden">
        {/* --- CONTROL BAR (Sticky) --- */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 md:py-6 sticky top-0 z-30 shadow-sm">
            <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-4">
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="w-full md:flex-1 flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider pl-1">Clase</label>
                        <select 
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full text-lg font-bold text-text-main border-gray-200 rounded-2xl focus:ring-primary focus:border-primary py-3 pl-4 bg-gray-50/50"
                        >
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="w-full md:w-auto flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider pl-1">Fecha de Asistencia</label>
                        <DateNavigator 
                            currentDate={currentDateObj}
                            onDateChange={handleDateChange}
                            className="w-full md:w-72"
                        />
                    </div>
                </div>

                {/* Quick Stats & Bulk Action */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                    <div className="flex gap-3 text-xs md:text-sm font-medium">
                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md">{stats.present} Presentes</span>
                        <span className="text-red-500 bg-red-50 px-2 py-1 rounded-md">{stats.absent} Faltas</span>
                        <span className="text-gray-400 hidden sm:inline">{stats.unmarked} Pendientes</span>
                    </div>
                    
                    <button 
                        onClick={handleBulkPresent}
                        disabled={stats.unmarked === 0}
                        className="bg-primary disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none hover:bg-primary-hover text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">done_all</span>
                        Marcar Restantes
                    </button>
                </div>
            </div>
        </div>

        {/* --- STUDENT LIST --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 touch-manipulation">
            <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-3">
                
                {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-3 opacity-30">groups</span>
                        <p className="text-lg font-medium">No hay alumnos en esta clase.</p>
                    </div>
                ) : (
                    filteredStudents.map(student => {
                        const record = student.attendanceHistory?.find(r => r.date === selectedDate && r.classId === selectedClassId);
                        const status = record?.status;

                        return (
                            <div 
                                key={student.id} 
                                className={`rounded-2xl border p-4 transition-all duration-300 ${getRowBackground(student, status)}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Student Info */}
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img src={student.avatarUrl} className="size-14 rounded-full object-cover bg-gray-200 border-2 border-white shadow-sm" alt={student.name} />
                                            {status === 'present' && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white animate-in zoom-in"><span className="material-symbols-outlined text-sm block">check</span></div>}
                                            {status === 'absent' && <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-white animate-in zoom-in"><span className="material-symbols-outlined text-sm block">close</span></div>}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-text-main leading-tight">{student.name}</h3>
                                            <p className="text-xs text-text-secondary font-medium mt-0.5">{student.rank}</p>
                                            {student.status === 'debtor' && <span className="inline-block mt-1 text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">ADEUDO</span>}
                                        </div>
                                    </div>

                                    {/* Action Buttons (Large Touch Targets) */}
                                    <div className="grid grid-cols-4 gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        <button 
                                            onClick={() => handleStatusChange(student.id, 'present')}
                                            className={`h-12 md:w-24 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 ${
                                                status === 'present' 
                                                ? 'bg-green-500 text-white border-green-600 shadow-md' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-600'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-2xl md:text-xl">check_circle</span>
                                            <span className="text-[10px] font-bold hidden md:block">Presente</span>
                                        </button>

                                        <button 
                                            onClick={() => handleStatusChange(student.id, 'late')}
                                            className={`h-12 md:w-20 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 ${
                                                status === 'late' 
                                                ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-600'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-2xl md:text-xl">schedule</span>
                                            <span className="text-[10px] font-bold hidden md:block">Tarde</span>
                                        </button>

                                        <button 
                                            onClick={() => handleStatusChange(student.id, 'excused')}
                                            className={`h-12 md:w-20 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 ${
                                                status === 'excused' 
                                                ? 'bg-blue-500 text-white border-blue-600 shadow-md' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-2xl md:text-xl">medical_services</span>
                                            <span className="text-[10px] font-bold hidden md:block">Justif.</span>
                                        </button>

                                        <button 
                                            onClick={() => handleStatusChange(student.id, 'absent')}
                                            className={`h-12 md:w-20 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 ${
                                                status === 'absent' 
                                                ? 'bg-red-500 text-white border-red-600 shadow-md' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-600'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-2xl md:text-xl">cancel</span>
                                            <span className="text-[10px] font-bold hidden md:block">Falta</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                
                {/* Spacer for bottom scrolling */}
                <div className="h-10"></div>
            </div>
        </div>
    </div>
  );
};

export default AttendanceTracker;