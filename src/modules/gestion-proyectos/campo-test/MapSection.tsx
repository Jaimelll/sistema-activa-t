// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Configuración de iconos para evitar errores
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapSection({ selectedProject, onLocationChange }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // Inicialización única
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const lat = selectedProject?.latitud_modificada ?? selectedProject?.proyectos?.latitud ?? -12.046374;
    const lng = selectedProject?.longitud_modificada ?? selectedProject?.proyectos?.longitud ?? -77.042793;

    const map = L.map(mapRef.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      onLocationChange(lat, lng);
    });

    mapInstance.current = map;
    markerRef.current = marker;

    // Forzar actualización de tamaño
    setTimeout(() => map.invalidateSize(), 200);
    setTimeout(() => map.invalidateSize(), 500);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, []); // Solo una vez al montar

  // Actualizar cuando cambien las coordenadas externas
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current) return;
    const lat = selectedProject?.latitud_modificada ?? selectedProject?.proyectos?.latitud ?? -12.046374;
    const lng = selectedProject?.longitud_modificada ?? selectedProject?.proyectos?.longitud ?? -77.042793;
    // ✅ CORREGIDO: usar setLatLng, no setLat
    markerRef.current.setLatLng([lat, lng]);
    mapInstance.current.setView([lat, lng]);
    mapInstance.current.invalidateSize();
  }, [selectedProject]);

  return <div ref={mapRef} className="h-full w-full" style={{ minHeight: '350px' }} />;
}