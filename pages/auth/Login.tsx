
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

const Login: React.FC = () => {
  const { login } = useStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      const success = await login(formData.email, formData.password);
      if (success) {
          const user = JSON.parse(localStorage.getItem('pulse_current_session') || '{}');
          if (user.role === 'master') navigate('/master/dashboard');
          else navigate('/student/dashboard');
      }
      setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white font-sans text-slate-900 p-6 selection:bg-red-100 selection:text-red-900">

      {/* Main Container - Paper Surface */}
      <div className="w-full max-w-[400px] bg-white border border-gray-100 rounded-2xl p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* 1. BRANDING */}
        <div className="flex flex-col items-center text-center mb-10">
            <h1 className="text-5xl font-black text-red-600 tracking-tighter select-none leading-none">
                IKC
            </h1>
            <p className="text-[10px] font-bold text-gray-500 tracking-[0.3em] uppercase mt-2 ml-1">
                MANAGEMENT
            </p>
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Accede a tu cuenta</h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">Ingresa tus credenciales para continuar.</p>
        </div>

        {/* 2. FORMULARIO CORPORATIVO (Outlined Style) */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 ml-1 mb-1">Correo electrónico</label>
                <input 
                    type="email" 
                    required 
                    className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all duration-200"
                    placeholder="nombre@ejemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between items-center ml-1 mb-1">
                    <label className="block text-xs font-bold text-gray-700">Contraseña</label>
                    <button type="button" className="text-xs font-bold text-red-600 hover:text-red-700">¿Olvidaste tu contraseña?</button>
                </div>
                <input 
                    type="password" 
                    required 
                    className="w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all duration-200"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            {/* 3. ACTION BUTTON (Solid) */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 mt-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm tracking-wide"
            >
                {loading ? (
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    'Ingresar'
                )}
            </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-gray-50">
            <p className="text-sm text-gray-600">
                ¿No tienes cuenta?{' '}
                <Link to="/role-selection" className="font-bold text-red-600 hover:text-red-700 transition-colors">
                    Crear cuenta
                </Link>
            </p>
        </div>

      </div>
      
      {/* System Footer */}
      <div className="fixed bottom-6 text-[10px] font-bold text-gray-300 tracking-wider uppercase select-none">
          Secure System v2.0
      </div>
    </div>
  );
};

export default Login;
