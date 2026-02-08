
import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler, UseFormRegister, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentRegistrationSchema, StudentRegistrationForm } from '../../schemas/authSchemas';
import { useToast } from '../../context/ToastContext';
import { PulseService } from '../../services/pulseService';

// --- SUB-COMPONENTS ---

interface InputFieldProps {
  label: string;
  name: keyof StudentRegistrationForm;
  register: UseFormRegister<StudentRegistrationForm>;
  errors: FieldErrors<StudentRegistrationForm>;
  type?: string;
  placeholder?: string;
  cols?: 1 | 2;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  name, 
  register, 
  errors, 
  type = 'text', 
  placeholder, 
  cols = 1 
}) => (
  <div className={cols === 2 ? 'col-span-1' : 'col-span-1 md:col-span-2'}>
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">{label}</label>
    <div className="relative group">
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-lg bg-gray-100 text-sm font-medium text-gray-900 py-3.5 px-4 transition-all placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-0 focus:border-primary ${
          errors[name] ? 'bg-red-50 text-red-900' : ''
        }`}
      />
    </div>
    {errors[name] && (
      <p className="mt-1 ml-1 text-xs font-semibold text-red-500">
        {errors[name]?.message}
      </p>
    )}
  </div>
);

const STEPS = [
  { id: 1, title: 'Cuenta' },
  { id: 2, title: 'Alumno' },
  { id: 3, title: 'Tutor' },
];

const StudentRegistration: React.FC = () => {
  const { registerStudent } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    setValue,
    formState: { errors },
    watch
  } = useForm<StudentRegistrationForm>({
    resolver: zodResolver(studentRegistrationSchema),
    mode: 'onChange',
    defaultValues: {
        guardianRelationship: 'Padre',
        avatarUrl: ''
    }
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof StudentRegistrationForm)[] = [];
    if (currentStep === 1) fieldsToValidate = ['academyCode', 'email', 'password', 'confirmPassword'];
    else if (currentStep === 2) fieldsToValidate = ['name', 'age', 'birthDate', 'cellPhone', 'weight', 'height', 'bloodType'];

    const isStepValid = await trigger(fieldsToValidate);
    
    if (currentStep === 1 && isStepValid) {
        const email = watch('email');
        if (PulseService.checkEmailExists(email)) {
            setError('email', { type: 'manual', message: 'Este correo ya está registrado.' });
            return;
        }
    }

    if (isStepValid) setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        setValue('avatarUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit: SubmitHandler<StudentRegistrationForm> = async (data) => {
    setIsSubmitting(true);
    try {
        const success = await registerStudent(data);
        if (success) {
            addToast('Registro completado', 'success');
            navigate('/student/dashboard');
        } else {
            addToast('Error al registrar.', 'error');
        }
    } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error inesperado', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Alta de Alumno</h1>
            <div className="flex justify-center gap-2 mt-4">
                {STEPS.map((step) => (
                    <div key={step.id} className={`h-1 flex-1 rounded-full transition-all ${step.id <= currentStep ? 'bg-primary' : 'bg-gray-200'}`}></div>
                ))}
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Paso {currentStep} de 3: {STEPS[currentStep-1].title}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* STEP 1 */}
            {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField register={register} errors={errors} label="Código de Academia" name="academyCode" placeholder="Ej. ACAD-1234" cols={2} />
                    <InputField register={register} errors={errors} label="Email (Login)" name="email" type="email" placeholder="usuario@email.com" />
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField register={register} errors={errors} label="Contraseña" name="password" type="password" placeholder="Mínimo 6 caracteres" cols={2} />
                        <InputField register={register} errors={errors} label="Confirmar" name="confirmPassword" type="password" placeholder="Repite la contraseña" cols={2} />
                    </div>
                </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 flex justify-center mb-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="size-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-all overflow-hidden"
                        >
                            {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-3xl">add_a_photo</span>}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                    <InputField register={register} errors={errors} label="Nombre Completo" name="name" placeholder="Nombre y Apellidos" />
                    <InputField register={register} errors={errors} label="Celular" name="cellPhone" type="tel" placeholder="10 dígitos" />
                    
                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InputField register={register} errors={errors} label="Edad" name="age" type="number" placeholder="Años" cols={2} />
                        <InputField register={register} errors={errors} label="Peso (kg)" name="weight" type="number" placeholder="0" cols={2} />
                        <InputField register={register} errors={errors} label="Estatura" name="height" type="number" placeholder="0" cols={2} />
                        
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">T. Sangre</label>
                            <select {...register('bloodType')} className="w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 border-none focus:bg-white focus:ring-0 focus:border-primary">
                                <option value="">--</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <InputField register={register} errors={errors} label="Fecha Nacimiento" name="birthDate" type="date" />
                </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
                <div className="space-y-8">
                    <div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Datos del Tutor</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField register={register} errors={errors} label="Nombre Tutor" name="guardianName" placeholder="Nombre completo" />
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Parentesco</label>
                                <select {...register('guardianRelationship')} className="w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm font-medium text-gray-900 border-none focus:bg-white focus:ring-0 focus:border-primary">
                                    {['Padre', 'Madre', 'Tutor Legal', 'Familiar', 'Otro'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <InputField register={register} errors={errors} label="Email Tutor" name="guardianEmail" type="email" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Contacto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField register={register} errors={errors} label="Tel. Principal" name="guardianMainPhone" type="tel" cols={2} />
                            <InputField register={register} errors={errors} label="Tel. 2 (Opcional)" name="guardianSecondaryPhone" type="tel" cols={2} />
                            <InputField register={register} errors={errors} label="Tel. 3 (Opcional)" name="guardianTertiaryPhone" type="tel" cols={2} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Dirección</h3>
                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-4"><InputField register={register} errors={errors} label="Calle" name="street" cols={2} /></div>
                            <div className="col-span-2"><InputField register={register} errors={errors} label="No. Ext" name="exteriorNumber" cols={2} /></div>
                            <div className="col-span-2"><InputField register={register} errors={errors} label="Int" name="interiorNumber" cols={2} /></div>
                            <div className="col-span-2"><InputField register={register} errors={errors} label="Colonia" name="colony" cols={2} /></div>
                            <div className="col-span-2"><InputField register={register} errors={errors} label="CP" name="zipCode" cols={2} /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms Link (Step 3 only) */}
            {currentStep === 3 && (
                <div className="mt-8 mb-2 text-center text-xs text-gray-400 font-medium">
                    Al completar el registro, aceptas los <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">términos y condiciones</Link> de la plataforma.
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2">
                {currentStep > 1 ? (
                    <button type="button" onClick={prevStep} className="px-6 py-4 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all text-sm">Atrás</button>
                ) : (
                    <Link to="/login" className="px-6 py-4 rounded-lg bg-white text-gray-400 font-bold hover:text-gray-600 transition-all text-sm">Cancelar</Link>
                )}

                <button
                    type="button"
                    onClick={currentStep === 3 ? handleSubmit(onSubmit) : nextStep}
                    disabled={isSubmitting}
                    className="flex-1 bg-primary hover:bg-red-600 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-70"
                >
                    {isSubmitting ? 'Procesando...' : (currentStep === 3 ? 'Finalizar Registro' : 'Siguiente')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistration;