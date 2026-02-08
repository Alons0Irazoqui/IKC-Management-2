
import React from 'react';

const TermsAndConditions: React.FC = () => {
  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-600 selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-3xl mx-auto py-16 px-6">
        
        {/* --- HEADER --- */}
        <div className="text-center border-b border-gray-100 pb-10 mb-12">
          {/* Logo Brand */}
          <div className="flex flex-col items-center justify-center leading-none mb-8 select-none">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">IKC</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1.5">Management</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3">
            Términos de Uso de la Plataforma
          </h1>
          <p className="text-sm font-medium text-gray-400">
            Última actualización: Febrero 2026
          </p>
        </div>

        {/* --- CONTENT --- */}
        <div className="space-y-8 text-base leading-relaxed">
          
          {/* INTRO */}
          <p className="text-lg text-slate-600">
            Bienvenido a la App de <span className="font-semibold text-slate-900">[Nombre de tu Academia/Dojo]</span>. 
            Esta plataforma es nuestra herramienta interna para llevar el control de tu progreso, asistencias y pagos. 
            Al entrar, estás de acuerdo con lo siguiente:
          </p>

          {/* SECTION 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mt-12 mb-4">1. Tu Información</h2>
            <p>
              Los datos que registraste (nombre, teléfonos, contactos de emergencia) deben ser reales y estar actualizados. 
              Es por tu seguridad y para poder contactarte. Tu contraseña es personal. 
              <strong className="text-slate-800"> No la compartas.</strong>
            </p>
          </section>

          {/* SECTION 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mt-12 mb-4">2. Sobre los Pagos (Importante)</h2>
            <p className="mb-6">
              Esta plataforma lleva el registro oficial de tus colegiaturas y abonos.
            </p>

            {/* Highlighted Sub-point */}
            <div className="bg-slate-50 border-l-4 border-blue-600 p-6 rounded-r-xl my-6">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">priority_high</span>
                Prioridad de Pago
              </h3>
              <p className="text-slate-700 text-sm">
                El sistema está configurado para que, al recibir un pago, se cubra siempre primero la 
                <span className="font-bold"> mensualidad actual o vencida</span>. 
                El saldo restante (si sobra) se abonará a otros conceptos como equipo, eventos, etc.
              </p>
            </div>

            <p>
              Los recibos que descargas aquí son tus comprobantes digitales oficiales ante la academia.
            </p>
          </section>

          {/* SECTION 3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mt-12 mb-4">3. Privacidad</h2>
            <p>
              Tus datos (incluyendo fotos, teléfonos y datos de salud) son exclusivamente para uso interno del Dojo. 
              No se venden ni se comparten con nadie externo.
            </p>
          </section>

          {/* SECTION 4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mt-12 mb-4">4. Buen Uso</h2>
            <p>
              La plataforma es para consultar tu información. Cualquier intento de alterar datos, asistencias o pagos resultará en la suspensión de la cuenta.
            </p>
          </section>

          {/* DOUBTS */}
          <div className="mt-16 pt-10 border-t border-gray-100 text-center">
            <h4 className="text-base font-bold text-slate-900 mb-2">¿Dudas?</h4>
            <p className="text-slate-500 max-w-lg mx-auto">
              Cualquier aclaración sobre tus pagos o grados, favor de revisarlo directamente en la recepción del Dojo o por mensaje directo.
            </p>
          </div>

        </div>

        {/* --- FOOTER ACTION --- */}
        <div className="mt-16 flex justify-center">
          <button 
            onClick={handleClose}
            className="px-8 py-3 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 hover:text-slate-900 transition-colors active:scale-95"
          >
            Cerrar Pestaña
          </button>
        </div>

      </div>
    </div>
  );
};

export default TermsAndConditions;
