
import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';

const MasterDashboard: React.FC = () => {
    // 1. Arquitectura de Datos (Local)
    const { students, monthlyRevenueData, rollingRevenueData, stats } = useStore();
    const navigate = useNavigate();

    // Selector de Tiempo
    const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');

    // --- LÓGICA DE NEGOCIO ---

    // 2. Lógica "Ingresos" (KPI Dinámico)
    const displayRevenue = useMemo(() => {
        if (timeRange === 'year') return stats.totalRevenue;
        // Si es mes, tomamos el último valor disponible en los datos rodantes (asumiendo mes actual)
        if (rollingRevenueData.length > 0) {
            return rollingRevenueData[rollingRevenueData.length - 1].total;
        }
        return 0;
    }, [timeRange, stats, rollingRevenueData]);

    // 3. Lógica "Alumnos Nuevos" (KPI Dinámico)
    const newStudentsCount = useMemo(() => {
        const now = new Date();
        const startOfPeriod = timeRange === 'month'
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), 0, 1);

        // Normalizar inicio del periodo a las 00:00:00 para comparación estricta
        startOfPeriod.setHours(0, 0, 0, 0);

        return students.filter(s => {
            if (!s.joinDate) return false;

            let joinDate = new Date(s.joinDate);

            // Corrección Robustez: Si el formato es DD/MM/YYYY (común en español) y falla el parser estándar
            // o da una fecha incorrecta (ej: interpreta 02/05 como Feb 5 en lugar de May 2), forzamos parse manual si hay barras.
            if ((isNaN(joinDate.getTime()) || s.joinDate.includes('/'))) {
                const parts = s.joinDate.split('/');
                if (parts.length === 3) {
                    // Intentamos asumir DD/MM/YYYY si el parsing directo falló o es ambiguo
                    const d = parseInt(parts[0]);
                    const m = parseInt(parts[1]) - 1; // Mes es base 0
                    const y = parseInt(parts[2]);

                    const fixedDate = new Date(y, m, d);
                    if (!isNaN(fixedDate.getTime())) {
                        joinDate = fixedDate;
                    }
                }
            }

            // Normalizar fecha de registro para comparación justa
            joinDate.setHours(0, 0, 0, 0);

            return joinDate >= startOfPeriod;
        }).length;
    }, [students, timeRange]);

    // 4. Datos Gráfica Principal (Ingresos)
    const revenueChartData = useMemo(() => {
        return timeRange === 'year' ? monthlyRevenueData : rollingRevenueData;
    }, [timeRange, monthlyRevenueData, rollingRevenueData]);

    // 5. Datos Donut (Grados con Colores Estáticos)
    const studentsByRank = useMemo(() => {
        // Fix: Include all non-inactive students (active, debtor, exam_ready)
        const activeStudents = students.filter(s => s.status !== 'inactive');
        const distribution: Record<string, number> = {};

        activeStudents.forEach(s => {
            distribution[s.rank] = (distribution[s.rank] || 0) + 1;
        });

        // Mapa de colores estáticos hexadecimales (Enterprise Palette)
        const getColor = (rankName: string) => {
            const lower = rankName.toLowerCase();
            if (lower.includes('white') || lower.includes('blanco')) return '#E5E7EB'; // Gray 200
            if (lower.includes('yellow') || lower.includes('amarillo')) return '#FCD34D'; // Amber 300
            if (lower.includes('orange') || lower.includes('naranja')) return '#FB923C'; // Orange 400
            if (lower.includes('green') || lower.includes('verde')) return '#4ADE80'; // Green 400
            if (lower.includes('blue') || lower.includes('azul')) return '#60A5FA'; // Blue 400
            if (lower.includes('purple') || lower.includes('morado')) return '#A78BFA'; // Violet 400
            if (lower.includes('brown') || lower.includes('marrón') || lower.includes('marron')) return '#78350F'; // Amber 900
            if (lower.includes('black') || lower.includes('negro')) return '#DC2626'; // Red 600 (Black Belt Highlight)
            return '#9CA3AF'; // Default Gray
        };

        // Orden lógico aproximado para la visualización
        const orderMap: Record<string, number> = {
            white: 1, yellow: 2, orange: 3, green: 4, blue: 5, purple: 6, brown: 7, black: 8
        };

        return Object.entries(distribution).map(([name, value]) => {
            const key = Object.keys(orderMap).find(k => name.toLowerCase().includes(k)) || 'z';
            return {
                name,
                value,
                fill: getColor(name),
                order: orderMap[key] || 99
            };
        }).sort((a, b) => a.order - b.order);
    }, [students]);

    // 6. Total Alumnos Visualizados (Corrección para Donut)
    const totalChartStudents = useMemo(() => {
        return students.filter(s => s.status !== 'inactive').length;
    }, [students]);

    // 7. Total Cuentas por Cobrar
    const totalReceivable = stats.pendingCollection + stats.overdueAmount;

    // 8. Top Deudores (Alertas)
    const topDebtors = useMemo(() => {
        return students
            .filter(s => s.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5);
    }, [students]);

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Dashboard</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Resumen general de rendimiento.</p>
                </div>
                {/* Selector de Tiempo */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex transition-all duration-300 hover:shadow-md">
                    <button
                        onClick={() => setTimeRange('month')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ease-out ${timeRange === 'month'
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                            : 'text-gray-400 hover:text-slate-900 hover:bg-gray-50'
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setTimeRange('year')}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ease-out ${timeRange === 'year'
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                            : 'text-gray-400 hover:text-slate-900 hover:bg-gray-50'
                            }`}
                    >
                        Anual
                    </button>
                </div>
            </div>

            {/* --- FILA 1: KPIs --- */}
            <div className="grid grid-cols-12 gap-6">

                {/* KPI 1: Ingresos */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col justify-between h-36 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-200">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingresos Totales</span>
                        <div className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">payments</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                            ${displayRevenue?.toLocaleString('es-MX') || 0}
                        </span>
                    </div>
                </div>

                {/* KPI 2: Alumnos */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col justify-between h-36 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all" onClick={() => navigate('/master/students')}>
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alumnos Activos</span>
                        <div className="size-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors">
                            <span className="material-symbols-outlined text-lg">groups</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                            {students?.length || 0}
                        </span>
                    </div>
                </div>

                {/* KPI 3: Nuevos */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col justify-between h-36 hover:-translate-y-1 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nuevos (Mes)</span>
                        <div className="size-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">person_add</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                            +{newStudentsCount || 0}
                        </span>
                    </div>
                </div>

                {/* KPI 4: Por Cobrar */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col justify-between h-36 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all" onClick={() => navigate('/master/finance')}>
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Por Cobrar</span>
                        <div className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                            ${totalReceivable?.toLocaleString('es-MX') || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* --- FILA 2: GRÁFICAS --- */}
            <div className="grid grid-cols-12 gap-6">
                {/* Gráfica Grande */}
                <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl shadow-soft border border-gray-100 min-h-[400px] flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Tendencia de Ingresos</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueChartData || []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="total" stroke="#DC2626" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfica Pequeña (Donut) */}
                <div className="col-span-12 lg:col-span-4 bg-white p-8 rounded-2xl shadow-soft border border-gray-100 min-h-[400px] flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Distribución</h3>
                    <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={studentsByRank || []} innerRadius={70} outerRadius={90} paddingAngle={4} dataKey="value">
                                    {/* Mapea tus colores aquí */}
                                    {(studentsByRank || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill || '#9CA3AF'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                            <span className="text-4xl font-black text-slate-900">{students?.length || 0}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MasterDashboard;
