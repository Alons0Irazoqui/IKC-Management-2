
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

const StudentClassDetail: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { classes, students, currentUser } = useStore();

  const currentClass = classes.find(c => c.id === classId);
  const me = students.find(s => s.id === currentUser?.studentId);

  if (!currentClass || !me) {
      return <div className="p-10 text-center">Clase no encontrada</div>;
  }

  // Find classmates (excluding self)
  const classmates = students.filter(s => currentClass.studentIds.includes(s.id) && s.id !== me.id);

  // Filter attendance history strictly for this class
  const myHistory = (me.attendanceHistory || [])
      .filter(r => r.classId === classId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalClasses = myHistory.length;
  const presentCount = myHistory.filter(r => r.status === 'present' || r.status === 'late').length;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100;

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7] overflow-y-auto">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-gray-900 to-slate-800 text-white p-8 md:p-12 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <span className="material-symbols-outlined text-[200px]">sports_martial_arts</span>
            </div>
            <div className="relative z-10 max-w-[1400px] mx-auto w-full">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors text-sm font-bold uppercase tracking-wider"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Volver a mis clases
                </button>
                <h1 className="text-3xl md:text-5xl font-black mb-2 leading-tight">{currentClass.name}</h1>
                <div className="flex flex-wrap gap-4 items-center text-white/80 font-medium">
                    <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {currentClass.schedule}
                    </span>
                    <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {currentClass.instructor}
                    </span>
                </div>
            </div>
        </div>

        <div className="max-w-[1400px] mx-auto w-full p-6 md:p-10 flex flex-col gap-8">
            
            {/* Stats & Classmates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Attendance Stats Card */}
                <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-100 flex flex-col justify-between">
                    <h3 className="font-bold text-text-main mb-4">Resumen de Asistencia</h3>
                    <div className="flex items-center gap-6">
                        <div className="relative size-24">
                            <svg className="size-full" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#E5E7EB"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={attendanceRate > 80 ? '#10B981' : attendanceRate > 50 ? '#F59E0B' : '#EF4444'}
                                    strokeWidth="3"
                                    strokeDasharray={`${attendanceRate}, 100`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-xl font-black text-text-main">{attendanceRate}%</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm text-text-secondary">Asistencias: <span className="font-bold text-text-main">{presentCount}</span></p>
                            <p className="text-sm text-text-secondary">Total Clases: <span className="font-bold text-text-main">{totalClasses}</span></p>
                        </div>
                    </div>
                </div>

                {/* Classmates Card */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-card border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-text-main">Mis Compañeros</h3>
                        <span className="bg-gray-100 text-text-secondary text-xs font-bold px-2 py-1 rounded-full">{classmates.length}</span>
                    </div>
                    
                    {classmates.length === 0 ? (
                        <p className="text-text-secondary text-sm py-4">No hay otros alumnos inscritos aún.</p>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {classmates.map(buddy => (
                                <div key={buddy.id} className="flex flex-col items-center gap-1 w-16">
                                    <img src={buddy.avatarUrl} title={buddy.name} className="size-12 rounded-full object-cover border-2 border-white shadow-sm bg-gray-100" />
                                    <span className="text-[10px] text-text-secondary text-center truncate w-full font-medium">{buddy.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance History Table */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex-1">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-text-main text-lg">Mi Historial en esta Clase</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {myHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-text-secondary">
                                        Sin registros de asistencia para esta clase.
                                    </td>
                                </tr>
                            ) : (
                                myHistory.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-text-main text-sm capitalize">
                                                {new Date(record.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                            <p className="text-xs text-text-secondary font-mono mt-0.5">
                                                {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border ${
                                                record.status === 'present' ? 'bg-green-50 text-green-700 border-green-200' :
                                                record.status === 'late' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                record.status === 'excused' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {record.status === 'present' ? 'Presente' :
                                                 record.status === 'late' ? 'Retardo' :
                                                 record.status === 'excused' ? 'Justificada' : 'Falta'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {record.status === 'excused' && record.reason ? (
                                                <div className="inline-block text-left bg-blue-50 border border-blue-100 rounded-lg p-2 max-w-xs">
                                                    <p className="text-[10px] font-bold text-blue-800 uppercase mb-0.5 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">info</span> Motivo:
                                                    </p>
                                                    <p className="text-xs text-blue-700 leading-tight">{record.reason}</p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StudentClassDetail;
