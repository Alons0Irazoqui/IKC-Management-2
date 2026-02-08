
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Forbidden: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-light p-6 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-card border border-red-100 max-w-lg w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="size-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-5xl">gpp_bad</span>
        </div>
        
        <div>
            <h1 className="text-3xl font-black text-text-main mb-2">Acceso Denegado</h1>
            <p className="text-text-secondary">
                No tienes los permisos necesarios para acceder a esta área. Esta acción ha sido registrada por motivos de seguridad.
            </p>
        </div>

        <div className="w-full h-px bg-gray-100 my-2"></div>

        <div className="flex gap-4 w-full">
            <button 
                onClick={() => navigate(-1)}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-text-secondary hover:bg-gray-50 transition-colors"
            >
                Volver
            </button>
            <button 
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-colors"
            >
                Ir al Inicio
            </button>
        </div>
        
        <p className="text-xs text-gray-400 mt-2 font-mono">Error 403: Forbidden_RBAC_Violation</p>
      </div>
    </div>
  );
};

export default Forbidden;
