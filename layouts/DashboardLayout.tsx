
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const role = location.pathname.includes('/master') ? 'master' : 'student';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    // MAIN CONTAINER: Flex container. Sidebar handled internally.
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-900 bg-white">
      <Sidebar 
        role={role} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* 
          CONTENT AREA: Pure White Background.
          Separation from sidebar is achieved via surface color difference (Sidebar is gray-50).
      */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-50">
            <div className="flex flex-col leading-none">
                 <span className="font-black text-xl text-red-600 tracking-tighter">IKC</span>
                 <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-gray-400 mt-0.5">Management</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-slate-900 bg-gray-50 hover:bg-gray-100 p-2.5 rounded-full transition-colors focus:outline-none"
            >
                <span className="material-symbols-outlined text-xl">menu</span>
            </button>
        </header>

        {/* 
            SCROLL CANVAS
        */}
        <main className="flex-1 overflow-y-auto scrollbar-hide relative w-full">
            {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
