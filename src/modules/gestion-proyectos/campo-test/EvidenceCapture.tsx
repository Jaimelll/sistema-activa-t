// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Camera, X, Loader2, AlertTriangle, FileText, Download, Eye } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function EvidenceCapture({ onCapture, disabled = false, planId, initialPhotos = [] }) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (initialPhotos?.length > 0 && photos.length === 0) {
      setPhotos(initialPhotos);
    }
  }, [initialPhotos]);

  const handleAddPhoto = () => {
    if (disabled || uploading) return;
    setError(null);
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo supera el límite de 5MB');
        return;
      }

      if (!planId) {
        setError('Error: no hay plan asociado para guardar la evidencia');
        return;
      }

      try {
        setUploading(true);
        // Sanitizar nombre de archivo
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const fileName = `${Date.now()}_${cleanName}`;
        const filePath = `${planId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidencias_supervision')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('evidencias_supervision')
          .getPublicUrl(filePath);

        const newPhotos = [...photos, urlData.publicUrl];
        setPhotos(newPhotos);
        onCapture({ photos: newPhotos });

      } catch (err: any) {
        console.error('Error uploading evidence:', err);
        setError(err.message || 'Error al subir la imagen');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleRemovePhoto = async (index: number) => {
    if (disabled) return;
    
    const photoUrl = photos[index];
    const newPhotos = photos.filter((_, i) => i !== index);
    
    // Optimistically update UI
    setPhotos(newPhotos);
    onCapture({ photos: newPhotos });

    try {
      // Intentar extraer el path desde la URL para borrar el archivo
      const urlParts = photoUrl.split('/evidencias_supervision/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: delError } = await supabase.storage
          .from('evidencias_supervision')
          .remove([filePath]);
          
        if (delError) {
          console.error('Error removing from storage:', delError);
        }
      }
    } catch (err) {
      console.error('Failed to parse or remove evidence photo:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider">Evidencia Fotográfica de Campo</label>
        
        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-200">
                <AlertTriangle size={16} />
                {error}
            </div>
        )}

        <button
          type="button"
          disabled={disabled || uploading}
          onClick={handleAddPhoto}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-md transition-all font-semibold ${(disabled || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />} 
          {uploading ? 'Subiendo...' : 'Capturar Evidencia'}
        </button>
        
        {photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {photos.map((photo, idx) => {
              const ext = photo.split('.').pop()?.toLowerCase();
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext || '');
              const fileName = photo.split('/').pop()?.split('_').slice(1).join('_') || photo.split('/').pop();

              return (
                <div key={idx} className="relative border-2 border-slate-100 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all bg-white flex flex-col h-full min-h-[140px]">
                  {isImage ? (
                    <div className="relative h-32 w-full">
                      <img src={photo} alt={`evidencia-${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <a href={photo} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/90 rounded-full text-slate-700 hover:bg-white transition-all shadow-sm">
                          <Eye size={16} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a 
                      href={photo} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex flex-col items-center justify-center h-32 bg-slate-50 p-4 border-b border-slate-100 group/link cursor-pointer hover:bg-blue-50/50 transition-colors"
                      title="Click para ver documento"
                    >
                      <FileText size={40} className="text-blue-500 mb-2 group-hover/link:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight text-center line-clamp-2 px-2 group-hover/link:text-blue-600 transition-colors">
                        {fileName}
                      </span>
                    </a>
                  )}

                  {/* Footer with actions for documents or download */}
                  {!isImage && (
                    <div className="p-2 bg-white flex items-center justify-center border-t border-slate-50">
                       <a 
                        href={photo} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest"
                       >
                         <Download size={12} /> Descargar
                       </a>
                    </div>
                  )}

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform z-10"
                      title="Eliminar evidencia"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
            <Camera size={40} className="mb-2 opacity-20" />
            <p className="text-sm">No hay evidencias capturadas aún</p>
          </div>
        )}
      </div>
    </div>
  );
}