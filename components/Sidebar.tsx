
import React, { memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAcademy } from '../context/AcademyContext';
import Avatar from './ui/Avatar';

interface SidebarProps {
  role: 'master' | 'student';
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { academySettings } = useAcademy();

  const masterLinks = [
    { name: 'Dashboard', icon: 'grid_view', path: '/master/dashboard' },
    { name: 'Estudiantes', icon: 'groups', path: '/master/students' },
    { name: 'Calendario', icon: 'calendar_today', path: '/master/schedule' },
    { name: 'Biblioteca', icon: 'video_library', path: '/master/library' },
    { name: 'Finanzas', icon: 'payments', path: '/master/finance' },
    { name: 'Configuración', icon: 'settings', path: '/master/settings' },
  ];

  const studentLinks = [
    { name: 'Mi Progreso', icon: 'dashboard', path: '/student/dashboard' },
    { name: 'Clases', icon: 'class', path: '/student/classes' },
    ...(academySettings.modules.library ? [{ name: 'Biblioteca', icon: 'school', path: '/student/library' }] : []),
    { name: 'Horarios', icon: 'calendar_month', path: '/student/schedule' },
    ...(academySettings.modules.payments ? [{ name: 'Pagos', icon: 'credit_card', path: '/student/payments' }] : []),
    { name: 'Ajustes', icon: 'settings', path: '/student/settings' },
  ];

  const links = role === 'master' ? masterLinks : studentLinks;
  const displayName = currentUser?.name || (role === 'master' ? 'Sensei' : 'Alumno');
  
  const handleLogout = () => {
      logout();
      navigate('/');
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-gray-900/10 backdrop-blur-[2px] z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-72 h-full
          bg-[#F9FAFB] /* Structured Minimalism: Gray Surface */
          transform transition-transform duration-300 ease-out 
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          /* No border-r. The contrast between #F9FAFB and #FFFFFF (content) creates the structure. */
        `}
      >
        {/* LOGO SECTION */}
        <div className="px-8 pt-10 pb-8 flex items-center justify-between">
            <div className="flex flex-col justify-center leading-none">
                <span className="text-3xl font-black text-red-600 tracking-tight">IKC</span>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.25em] mt-1">Management</span>
            </div>
            
            <button 
                onClick={onClose} 
                className="md:hidden text-slate-400 hover:text-slate-600 p-1"
            >
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 no-scrollbar">
            {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
                <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 group ${
                        isActive
                            ? 'bg-white text-slate-900 shadow-sm shadow-gray-200/50' /* Active state pops out as white card */
                            : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'
                        }`}
                >
                    <span className={`material-symbols-outlined text-[22px] transition-colors ${isActive ? 'text-red-600 filled' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {link.icon}
                    </span>
                    <span>
                        {link.name}
                    </span>
                </Link>
            );
            })}
        </nav>

        {/* FOOTER / USER PROFILE */}
        <div className="p-5 mt-auto">
            <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-2xl bg-white border border-gray-100 shadow-sm cursor-pointer group hover:border-gray-200 transition-all">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-9 rounded-full text-xs font-bold ring-2 ring-gray-50" 
                />
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                        {displayName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {role === 'master' ? 'Administrador' : 'Alumno'}
                    </span>
                </div>
            </div>

            <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-400 hover:text-red-600 transition-colors w-full rounded-lg hover:bg-red-50 group uppercase tracking-wider justify-center"
            >
                <span>Cerrar Sesión</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
