
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const MasterPinEntry: React.FC = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const correctPin = "24332433";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === correctPin) {
      navigate('/register/master');
    } else {
      setError('Código no autorizado.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        
        <div className="flex flex-col items-center mb-10 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-900 mb-4">lock</span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Acceso Restringido</h1>
            <p className="text-gray-500 mt-2 text-sm">
                Solo personal autorizado de IKC.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-1">
                <input 
                    type="password" 
                    autoFocus
                    required 
                    className="w-full rounded-lg bg-gray-100 px-4 py-4 text-center text-3xl font-black tracking-[0.5em] text-gray-900 placeholder:text-gray-300 focus:bg-white transition-all outline-none" 
                    placeholder="••••••••"
                    value={pin}
                    onChange={(e) => {
                        setPin(e.target.value);
                        setError('');
                    }}
                    maxLength={8}
                />
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg text-center">
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-lg transition-all"
            >
                Verificar
            </button>
        </form>

        <div className="mt-8 text-center">
            <Link to="/role-selection" className="text-gray-400 font-bold hover:text-gray-600 text-xs uppercase tracking-wider transition-colors">
                Cancelar
            </Link>
        </div>
      </div>
    </div>
  );
};

export default MasterPinEntry;
