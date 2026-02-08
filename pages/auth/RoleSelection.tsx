
import React from 'react';
import { Link } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="max-w-3xl w-full flex flex-col items-center gap-10">
        <div className="text-center space-y-2">
            <h1 className="text-5xl font-black text-primary tracking-tighter">IKC</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Selecciona tu perfil</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Master Option */}
            <Link to="/register/verify-pin" className="group bg-gray-50 hover:bg-gray-100 p-8 rounded-2xl transition-all duration-300 flex flex-col gap-4 cursor-pointer">
                <div className="size-14 bg-white text-gray-400 group-hover:text-primary rounded-xl flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-3xl">sports_martial_arts</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">Soy Maestro</h3>
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                        Acceso administrativo para gestión del dojo.
                    </p>
                </div>
            </Link>

            {/* Student Option */}
            <Link to="/register/student" className="group bg-gray-50 hover:bg-gray-100 p-8 rounded-2xl transition-all duration-300 flex flex-col gap-4 cursor-pointer">
                <div className="size-14 bg-white text-gray-400 group-hover:text-primary rounded-xl flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-3xl">person</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">Soy Alumno</h3>
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                        Acceso a clases, perfil y pagos.
                    </p>
                </div>
            </Link>
        </div>
        
        <Link to="/" className="text-gray-400 font-bold hover:text-gray-800 transition-colors flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver
        </Link>
      </div>
    </div>
  );
};

export default RoleSelection;
