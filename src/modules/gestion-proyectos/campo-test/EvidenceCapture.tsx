// @ts-nocheck
'use client';

import { useState } from 'react';
import { Camera, X, Signature, Check } from 'lucide-react';

export default function EvidenceCapture({ onCapture }) {
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState('');
  const [signaturePad, setSignaturePad] = useState(false);

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
          onCapture({ photos: newPhotos, signature });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onCapture({ photos: newPhotos, signature });
  };

  const handleSignatureChange = (e) => {
    setSignature(e.target.value);
    onCapture({ photos, signature: e.target.value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-bold mb-2">Evidencia Fotográfica</label>
        <button
          type="button"
          onClick={handleAddPhoto}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Camera size={18} /> Tomar Foto
        </button>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative border rounded-lg overflow-hidden group">
              <img src={photo} alt={`evidencia-${idx}`} className="w-full h-24 object-cover" />
              <button
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition"
                title="Eliminar foto"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-bold mb-2">Firma de Conformidad</label>
        {!signaturePad ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSignaturePad(true)}
              className="bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Signature size={18} /> Dibujar firma
            </button>
            <input
              type="text"
              placeholder="O escribe tu nombre"
              value={signature}
              onChange={handleSignatureChange}
              className="border rounded-lg px-3 py-2 flex-1"
            />
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <canvas ref={null} className="border bg-white w-full h-32" />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setSignaturePad(false)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                <Check size={16} /> Aceptar firma
              </button>
              <button
                type="button"
                onClick={() => setSignaturePad(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}