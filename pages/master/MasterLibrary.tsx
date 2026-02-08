
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { LibraryResource } from '../../types';

const MasterLibrary: React.FC = () => {
  const { libraryResources, addLibraryResource, deleteLibraryResource } = useStore();
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState<Partial<LibraryResource>>({
      title: '', description: '', category: 'Technique', level: 'White Belt', duration: '00:00', videoUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      addLibraryResource({
          id: `res-${Date.now()}`,
          thumbnailUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop', // Placeholder for demo
          completedBy: [],
          ...formData as LibraryResource
      });
      setShowModal(false);
      setFormData({ title: '', description: '', category: 'Technique', level: 'White Belt', duration: '00:00', videoUrl: '' });
  };

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-main">Biblioteca de Contenido</h1>
                <p className="text-text-secondary mt-1">Sube videos y recursos para tus alumnos.</p>
            </div>
            <button 
                onClick={() => setShowModal(true)}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-all"
            >
                <span className="material-symbols-outlined text-[20px]">upload</span>
                Subir Recurso
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {libraryResources.map((resource) => (
                <div key={resource.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group relative">
                    <button 
                        onClick={() => deleteLibraryResource(resource.id)}
                        className="absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-lg text-gray-500 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <div className="relative aspect-video bg-gray-100">
                        <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">{resource.duration}</div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                             <div className="size-10 bg-white/90 rounded-full flex items-center justify-center">
                                 <span className="material-symbols-outlined text-black">play_arrow</span>
                             </div>
                        </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded">{resource.category}</span>
                            <span className="text-xs text-text-secondary">{resource.level}</span>
                        </div>
                        <h3 className="text-base font-bold text-text-main mb-1 line-clamp-2">{resource.title}</h3>
                        <p className="text-xs text-text-secondary line-clamp-2">{resource.description}</p>
                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1 text-xs text-text-secondary">
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span>{resource.completedBy?.length || 0} Alumnos completaron</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {showModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <h2 className="text-2xl font-bold mb-6 text-text-main">Subir Recurso</h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-xl border-gray-300 p-3" placeholder="Título del Video" />
                        
                        <div>
                            <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Enlace de Video</label>
                            <input required value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="w-full rounded-xl border-gray-300 p-3" placeholder="https://youtube.com/watch?v=..." />
                            <p className="text-xs text-gray-400 mt-1">Soporta YouTube y Vimeo.</p>
                        </div>

                        <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-xl border-gray-300 p-3" placeholder="Descripción" rows={3} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full rounded-xl border-gray-300 p-3">
                                <option>Technique</option>
                                <option>Sparring</option>
                                <option>Mindset</option>
                                <option>History</option>
                            </select>
                            <input value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="w-full rounded-xl border-gray-300 p-3" placeholder="Nivel (ej. White Belt)" />
                        </div>
                        <input value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full rounded-xl border-gray-300 p-3" placeholder="Duración (ej. 12:30)" />
                        
                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-300 font-medium hover:bg-gray-50">Cancelar</button>
                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold">Subir</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default MasterLibrary;
