
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { masterRegistrationSchema, MasterRegistrationForm } from '../../schemas/authSchemas';
import { PulseService } from '../../services/pulseService';

const MasterRegistration: React.FC = () => {
  const { registerMaster } = useStore();
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setError
  } = useForm<MasterRegistrationForm>({
    resolver: zodResolver(masterRegistrationSchema),
    defaultValues: { termsAccepted: false }
  });

  const onSubmit = async (data: MasterRegistrationForm) => {
    if (PulseService.checkEmailExists(data.email)) {
        setError("email", { type: "manual", message: "Correo ya registrado." });
        return;
    }
    const success = await registerMaster({
        name: data.name,
        email: data.email,
        academyName: data.academyName,
        password: data.password
    });
    if (success) {
        alert("Bienvenido Sensei.");
        navigate('/master/dashboard');
    } else {
        setError("root", { message: "Error al registrar." });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[480px]">
          
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
                Registro IKC
            </h1>
            <p className="text-gray-500 text-sm font-medium">
                Alta de nueva academia.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nombre Maestro</label>
              <input 
                {...register('name')}
                className="w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 border-none focus:bg-white focus:ring-0 focus:border-primary"
                placeholder="Sensei Alejandro" 
                type="text" 
              />
              {errors.name && <p className="text-xs text-red-500 font-bold ml-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
              <input 
                {...register('email')}
                className="w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 border-none focus:bg-white focus:ring-0 focus:border-primary"
                placeholder="ejemplo@ikc.com" 
                type="email"
              />
              {errors.email && <p className="text-xs text-red-500 font-bold ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nombre Academia</label>
              <input 
                {...register('academyName')}
                className="w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 border-none focus:bg-white focus:ring-0 focus:border-primary"
                placeholder="IKC Central" 
                type="text" 
              />
              {errors.academyName && <p className="text-xs text-red-500 font-bold ml-1">{errors.academyName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Contraseña</label>
                    <input 
                        {...register('password')}
                        className="w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 border-none focus:bg-white focus:ring-0 focus:border-primary"
                        placeholder="••••••••" 
                        type="password" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirmar</label>
                    <input 
                        {...register('confirmPassword')}
                        className="w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 border-none focus:bg-white focus:ring-0 focus:border-primary"
                        placeholder="••••••••" 
                        type="password" 
                    />
                </div>
            </div>
            {(errors.password || errors.confirmPassword) && <p className="text-xs text-red-500 font-bold ml-1">Revisa las contraseñas.</p>}

            <div className="flex items-start gap-3 mt-2">
              <input 
                type="checkbox" 
                {...register('termsAccepted')}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" 
              />
              <label className="text-xs text-gray-500 font-medium leading-snug cursor-pointer select-none">
                  Acepto los <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">términos y condiciones</Link> de IKC Management.
              </label>
            </div>
            {errors.termsAccepted && <p className="text-xs text-red-500 font-bold ml-1">{errors.termsAccepted.message}</p>}

            <button type="submit" disabled={isSubmitting} className="mt-4 w-full rounded-lg bg-primary py-4 px-4 text-white font-bold hover:bg-red-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
              {isSubmitting ? 'Registrando...' : 'Crear Academia'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors" to="/login">Volver al inicio</Link>
          </div>
        </div>
    </div>
  );
};

export default MasterRegistration;