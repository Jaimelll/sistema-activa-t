// @ts-nocheck
'use client';

import { useState } from 'react';
import { Camera, X, Signature, Check } from 'lucide-react';

export default function EvidenceCapture({ onCapture }) {
  const [photos, setPhotos] = useState([]);

  const handleAddPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const newPhotos = [...photos, ev.target.result];
          setPhotos(newPhotos);
          onCapture({ photos: newPhotos });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onCapture({ photos: newPhotos });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider">Evidencia Fotográfica de Campo</label>
        <button
          type="button"
          onClick={handleAddPhoto}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-md transition-all font-semibold"
        >
          <Camera size={20} /> Capturar Imagen
        </button>
        
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative border-2 border-slate-100 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all">
                <img src={photo} alt={`evidencia-${idx}`} className="w-full h-32 object-cover" />
                <button
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
                  title="Eliminar foto"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
            <Camera size={40} className="mb-2 opacity-20" />
            <p className="text-sm">No hay fotos capturadas aún</p>
          </div>
        )}
      </div>
    </div>
  );
}