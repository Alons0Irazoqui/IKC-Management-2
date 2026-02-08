import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { LibraryResource } from '../../types';

const Library: React.FC = () => {
  const { libraryResources, currentUser, students, academySettings, toggleResourceCompletion } = useStore();
  const [filter, setFilter] = useState('All');
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const categories = ['All', 'Technique', 'Mindset', 'Sparring', 'History'];

  const student = students.find(s => s.id === currentUser?.studentId);
  const currentRank = academySettings.ranks.find(r => r.id === student?.rankId);

  // Filter Logic:
  // 1. By Category
  // 2. By Rank (Access Control): Student can only see content <= their rank order.
  const filteredResources = libraryResources.filter(resource => {
      const categoryMatch = filter === 'All' || resource.category === filter;
      
      // Rank Logic
      const resourceRank = academySettings.ranks.find(r => r.name === resource.level);
      let rankAccess = true;
      
      if (resourceRank && currentRank) {
          // If resource has a specific rank level, check if student rank order >= resource rank order
          if (currentRank.order < resourceRank.order) {
              rankAccess = false;
          }
      }
      
      // Note: In a real app, we might want to show locked content with a lock icon. 
      // For now, per requirement "Student only sees content of their grade or lower", we filter it out or show as locked.
      // Let's filter out for strict adherence, or show locked for better UX (Upsell). 
      // Implementing strict filtering as per prompt "El alumno solo debe poder ver el contenido de su grado actual o inferior".
      
      return categoryMatch && rankAccess;
  });

  const getEmbedUrl = (url: string) => {
      // Basic parser for YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
          let videoId = '';
          if (url.includes('v=')) {
              videoId = url.split('v=')[1].split('&')[0];
          } else if (url.includes('youtu.be/')) {
              videoId = url.split('youtu.be/')[1];
          }
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
      }
      // Fallback for demo or if it's already an embed link
      return url; 
  };

  const handleToggleComplete = () => {
      if(selectedResource && student) {
          toggleResourceCompletion(selectedResource.id, student.id);
      }
  };

  const isCompleted = (resource: LibraryResource) => {
      return student && resource.completedBy.includes(student.id);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-10 w-full h-full flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
              <h1 className="text-3xl font-bold tracking-tight text-text-main">Biblioteca Técnica</h1>
              <p className="text-text-secondary mt-1">Curada específicamente para tu nivel: <span className="font-bold text-primary">{student?.rank}</span></p>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        filter === cat 
                        ? 'bg-primary text-white shadow-md' 
                        : 'bg-white text-text-secondary hover:bg-gray-50 border border-gray-100'
                    }`}
                  >
                      {cat}
                  </button>
              ))}
          </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredResources.map((resource) => (
              <div 
                key={resource.id} 
                onClick={() => setSelectedResource(resource)}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
              >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video overflow-hidden bg-gray-900">
                      <img 
                        src={resource.thumbnailUrl} 
                        alt={resource.title} 
                        className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                              <span className="material-symbols-outlined filled text-3xl ml-1">play_arrow</span>
                          </div>
                      </div>
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold tracking-wide">
                          {resource.duration}
                      </div>
                      {isCompleted(resource) && (
                          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-green-500/90 text-white text-[10px] font-bold uppercase tracking-wide shadow-sm flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check</span>
                              Entrenado
                          </div>
                      )}
                  </div>

                  {/* Content Info */}
                  <div className="p-5 flex flex-col gap-2 flex-1">
                      <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded-md">{resource.category}</span>
                          <span className="text-xs text-text-secondary">{resource.level}</span>
                      </div>
                      <h3 className="text-lg font-bold text-text-main leading-tight group-hover:text-primary transition-colors">{resource.title}</h3>
                      <p className="text-sm text-text-secondary line-clamp-2">{resource.description}</p>
                  </div>
              </div>
          ))}
          {filteredResources.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-text-secondary">
                  <span className="material-symbols-outlined text-5xl opacity-20 mb-4">lock_clock</span>
                  <h3 className="text-lg font-semibold">Contenido Bloqueado</h3>
                  <p className="max-w-md mt-2">Sigue avanzando de rango para desbloquear más técnicas o selecciona otra categoría.</p>
              </div>
          )}
      </div>

      {/* CINEMATIC VIDEO PLAYER MODAL */}
      {selectedResource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
                  {/* Close Button */}
                  <button 
                    onClick={() => setSelectedResource(null)}
                    className="absolute top-4 right-4 z-20 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-md"
                  >
                      <span className="material-symbols-outlined">close</span>
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-3 h-[80vh] lg:h-auto">
                      {/* Video Area */}
                      <div className="lg:col-span-2 bg-black flex items-center justify-center relative aspect-video lg:aspect-auto">
                          <iframe 
                            className="w-full h-full absolute inset-0"
                            src={getEmbedUrl(selectedResource.videoUrl)} 
                            title={selectedResource.title} 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                          ></iframe>
                      </div>

                      {/* Content Sidebar */}
                      <div className="bg-surface-white p-8 flex flex-col h-full overflow-y-auto">
                          <div className="mb-6">
                              <div className="flex items-center gap-2 mb-3">
                                  <span className="px-2 py-1 rounded bg-gray-100 text-xs font-bold uppercase tracking-wider text-text-secondary">{selectedResource.category}</span>
                                  <span className="px-2 py-1 rounded bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700">{selectedResource.level}</span>
                              </div>
                              <h2 className="text-2xl font-bold text-text-main mb-4 leading-snug">{selectedResource.title}</h2>
                              <p className="text-text-secondary text-sm leading-relaxed">{selectedResource.description}</p>
                          </div>

                          <div className="mt-auto pt-6 border-t border-gray-100">
                              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Progreso de Entrenamiento</h4>
                              
                              <button 
                                onClick={handleToggleComplete}
                                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg transform active:scale-95 ${
                                    isCompleted(selectedResource) 
                                    ? 'bg-green-500 text-white shadow-green-500/30' 
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                  <div className={`size-6 rounded-full border-2 flex items-center justify-center ${
                                      isCompleted(selectedResource) ? 'border-white bg-white/20' : 'border-gray-400'
                                  }`}>
                                      {isCompleted(selectedResource) && <span className="material-symbols-outlined text-sm">check</span>}
                                  </div>
                                  <span>{isCompleted(selectedResource) ? 'Técnica Completada' : 'Marcar como Entrenado'}</span>
                              </button>
                              
                              <p className="text-xs text-center text-gray-400 mt-3">
                                  Marcar esto notificará a tu maestro que has estudiado esta técnica.
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Library;