
import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-orange-100 selection:text-orange-600">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Academy Pro</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="hidden md:block text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              to="/role-selection" 
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
            >
              Comenzar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-6 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          
          {/* Text Content */}
          <div className="lg:w-1/2 flex flex-col items-start gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
              <span className="flex size-2 rounded-full bg-orange-500 animate-pulse"></span>
              Nuevo Sistema v2.0
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-gray-900 leading-[1.1]">
              La Plataforma <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Profesional</span> para <br />
              tu Academia.
            </h1>
            
            <p className="text-lg text-gray-500 leading-relaxed max-w-lg">
              Gestiona estudiantes, finanzas, asistencias y grados en un solo lugar. Diseñado específicamente para dojos y escuelas de artes marciales.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link 
                to="/role-selection" 
                className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/30 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
              >
                Crear mi Academia
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <a 
                href="#features" 
                className="px-8 py-4 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-2xl font-bold text-lg transition-all hover:bg-gray-50 active:scale-95 flex items-center justify-center"
              >
                Ver Características
              </a>
            </div>

            <div className="flex items-center gap-4 pt-4 text-sm text-gray-400 font-medium">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="size-8 rounded-full bg-gray-200 border-2 border-white"></div>
                ))}
              </div>
              <p>+500 Academias confían en nosotros</p>
            </div>
          </div>

          {/* Hero Image */}
          <div className="lg:w-1/2 relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-orange-900/10 border border-gray-100 group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop" 
                alt="Martial Arts Class" 
                className="w-full h-[500px] lg:h-[600px] object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              
              {/* Floating UI Card */}
              <div className="absolute bottom-8 left-8 right-8 z-20 bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Clase Actual</p>
                  <p className="text-lg font-bold text-gray-900">Jiu-Jitsu Avanzado</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex size-3 bg-green-500 rounded-full"></span>
                  <span className="text-sm font-bold text-green-700">En curso</span>
                </div>
              </div>
            </div>
            
            {/* Decorative Blobs */}
            <div className="absolute -z-10 top-1/2 right-0 w-72 h-72 bg-orange-200 rounded-full blur-[100px] opacity-50"></div>
            <div className="absolute -z-10 bottom-0 left-0 w-72 h-72 bg-blue-100 rounded-full blur-[100px] opacity-50"></div>
          </div>
        </div>
      </section>

      {/* --- BENTO GRID FEATURES --- */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-2">Todo en uno</h2>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight">Potencia cada aspecto de tu dojo.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            
            {/* Feature 1: Large */}
            <div className="md:col-span-2 bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="size-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl">dashboard</span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Panel de Control Maestro</h4>
                  <p className="text-gray-500 max-w-md">Visualiza ingresos, asistencia y alertas de deuda en tiempo real. Toma decisiones basadas en datos.</p>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-orange-50/50 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            </div>

            {/* Feature 2: Small */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="size-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Cobranza Automática</h4>
                <p className="text-sm text-gray-500">Detecta pagos vencidos y genera recargos automáticamente.</p>
              </div>
            </div>

            {/* Feature 3: Small */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="size-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Asistencia Rápida</h4>
                <p className="text-sm text-gray-500">Check-in digital para clases grupales y privadas en segundos.</p>
              </div>
            </div>

            {/* Feature 4: Large */}
            <div className="md:col-span-2 bg-gray-900 rounded-3xl p-10 shadow-xl border border-gray-800 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group text-white">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="size-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl">school</span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold mb-2">Portal del Estudiante</h4>
                  <p className="text-gray-400 max-w-md">Tus alumnos pueden ver su progreso de cinturones, pagar cuotas y acceder a contenido exclusivo.</p>
                </div>
              </div>
              {/* Abstract decorative circle */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
            </div>

          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-orange-600 rounded-[3rem] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-orange-500/30">
          <div className="relative z-10 flex flex-col items-center gap-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
              Empieza a profesionalizar <br/> tu academia hoy.
            </h2>
            <p className="text-orange-100 text-lg md:text-xl max-w-xl">
              Únete a la plataforma líder en gestión de artes marciales. Prueba gratuita, sin compromiso.
            </p>
            <Link 
              to="/role-selection" 
              className="px-10 py-5 bg-white text-orange-600 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
            >
              Comenzar Ahora
            </Link>
          </div>
          
          {/* Background Patterns */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[100px]"></div>
             <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black rounded-full blur-[100px]"></div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-600">school</span>
            <span className="font-bold text-gray-900">Academy Pro</span>
          </div>
          
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Academy Pro Systems. Todos los derechos reservados.
          </div>
          
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-gray-900 transition-colors"><i className="fa-brands fa-twitter"></i></a>
            <a href="#" className="text-gray-400 hover:text-gray-900 transition-colors"><i className="fa-brands fa-instagram"></i></a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
    