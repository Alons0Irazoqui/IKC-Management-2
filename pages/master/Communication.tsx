import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocation } from 'react-router-dom';

const Communication: React.FC = () => {
  const { messages, students, currentUser, sendMessage, markMessageRead } = useStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');
  
  // Compose State
  const [recipientId, setRecipientId] = useState('all');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  
  // Filter/Selection
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle Incoming Deep Links (e.g. from Student Profile)
  useEffect(() => {
      if (location.state && location.state.recipientId) {
          setRecipientId(location.state.recipientId);
          setActiveTab('compose');
          // Clear state to prevent loop if user navigates back
          window.history.replaceState({}, document.title);
      }
  }, [location]);

  // Derived Data
  const myMessages = messages.filter(m => 
      // Master sees all messages sent BY them OR TO them (or to 'all' technically, but usually they send to all)
      // For simplified demo: Master sees everything in their academy
      m.academyId === currentUser?.academyId
  ).filter(m => 
      m.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.senderName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

  const handleSend = () => {
      if (!subject || !content) {
          alert("Por favor completa el asunto y el mensaje.");
          return;
      }

      const recipientName = recipientId === 'all' 
        ? 'Todos los Alumnos Activos' 
        : students.find(s => s.id === recipientId)?.name || 'Desconocido';

      sendMessage({
          academyId: currentUser!.academyId,
          senderId: currentUser!.id,
          senderName: currentUser!.name,
          recipientId,
          recipientName,
          subject,
          content,
          type: recipientId === 'all' ? 'announcement' : 'personal'
      });

      alert("Mensaje enviado correctamente.");
      setSubject('');
      setContent('');
      setRecipientId('all');
      setActiveTab('inbox');
  };

  const handleSelectMessage = (id: string) => {
      setSelectedMessageId(id);
      markMessageRead(id);
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto w-full h-[calc(100vh-80px)] flex flex-col">
       <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-main">Centro de Mensajes</h1>
                <p className="text-text-secondary">Gestiona anuncios y comunicación directa.</p>
            </div>
            {activeTab === 'inbox' && (
                <button 
                    onClick={() => { setActiveTab('compose'); setSelectedMessageId(null); }}
                    className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                    Redactar
                </button>
            )}
       </div>

       <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden flex flex-col md:flex-row min-h-0">
            {/* Sidebar List */}
            <div className={`md:w-96 border-r border-gray-100 flex flex-col ${activeTab === 'compose' || (activeTab === 'inbox' && selectedMessageId) ? 'hidden md:flex' : 'flex'} w-full`}>
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar mensajes..." 
                            className="w-full rounded-xl bg-gray-50 border-none text-sm pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary/20 transition-all" 
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {myMessages.length === 0 ? (
                        <div className="p-8 text-center text-text-secondary text-sm">No hay mensajes aún.</div>
                    ) : (
                        myMessages.map((msg) => (
                            <div 
                                key={msg.id} 
                                onClick={() => handleSelectMessage(msg.id)}
                                className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${selectedMessageId === msg.id ? 'bg-blue-50 border-l-4 border-l-primary' : ''} ${!msg.read && currentUser?.id !== msg.senderId ? 'bg-white font-semibold' : ''}`}
                            >
                                 <div className="flex justify-between mb-1">
                                     <span className="text-sm font-bold text-text-main truncate max-w-[180px]">
                                         {msg.senderId === currentUser?.id ? `Para: ${msg.recipientName}` : msg.senderName}
                                     </span>
                                     <span className="text-xs text-text-secondary whitespace-nowrap">{msg.date}</span>
                                 </div>
                                 <p className="text-sm text-text-main truncate mb-1">{msg.subject}</p>
                                 <p className="text-xs text-text-secondary truncate">{msg.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 bg-gray-50/30 flex flex-col ${!selectedMessageId && activeTab !== 'compose' ? 'hidden md:flex' : 'flex'}`}>
                {activeTab === 'compose' ? (
                    <div className="p-8 flex flex-col h-full animate-fadeIn overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text-main">Nuevo Mensaje</h2>
                            <button onClick={() => setActiveTab('inbox')} className="text-text-secondary hover:text-text-main md:hidden">
                                Cancelar
                            </button>
                        </div>
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Destinatario</label>
                                <select 
                                    value={recipientId} 
                                    onChange={(e) => setRecipientId(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="all">📢 Todos los Alumnos (Anuncio Global)</option>
                                    <optgroup label="Alumnos Individuales">
                                        {students.filter(s => s.status !== 'inactive').map(s => (
                                            <option key={s.id} value={s.id}>{s.name} - {s.rank}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Asunto</label>
                                <input 
                                    type="text" 
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Ej. Cambio de horario" 
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-primary" 
                                />
                            </div>
                            
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Mensaje</label>
                                <textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Escribe tu mensaje aquí..." 
                                    className="w-full flex-1 min-h-[300px] bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-primary resize-none"
                                ></textarea>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                             <button onClick={() => setActiveTab('inbox')} className="px-5 py-2.5 rounded-xl border border-gray-200 text-text-secondary font-medium hover:bg-white transition-colors">Cancelar</button>
                             <button onClick={handleSend} className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined">send</span>
                                Enviar
                             </button>
                        </div>
                    </div>
                ) : selectedMessage ? (
                    <div className="flex flex-col h-full animate-fadeIn">
                        <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-text-main mb-2">{selectedMessage.subject}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                        {selectedMessage.senderName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-text-main">{selectedMessage.senderName}</p>
                                        <p className="text-xs text-text-secondary">Para: {selectedMessage.recipientName} • {selectedMessage.date}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMessageId(null)} className="md:hidden text-text-secondary p-2">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto whitespace-pre-wrap text-text-main leading-relaxed">
                            {selectedMessage.content}
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
                            <button className="px-5 py-2.5 rounded-xl border border-gray-200 text-text-main font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                <span className="material-symbols-outlined">reply</span>
                                Responder
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-secondary">
                        <div className="bg-gray-100 rounded-full p-6 mb-4">
                            <span className="material-symbols-outlined text-4xl text-gray-400">mark_email_unread</span>
                        </div>
                        <h3 className="text-lg font-semibold text-text-main">Selecciona un mensaje</h3>
                        <p className="max-w-xs mt-2 text-sm">Elige un mensaje de la lista para ver los detalles o inicia una nueva conversación.</p>
                    </div>
                )}
            </div>
       </div>
    </div>
  );
};

export default Communication;