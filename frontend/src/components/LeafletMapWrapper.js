import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';

// Wrapper component to properly manage Leaflet lifecycle
export default function LeafletMapWrapper({ 
  center, 
  zoom, 
  children, 
  style,
  scrollWheelZoom = true
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Cleanup function to remove Leaflet instance
    return () => {
      if (containerRef.current) {
        // Remove all Leaflet-specific properties
        const container = containerRef.current;
        if (container._leaflet_id) {
          delete container._leaflet_id;
        }
        
        // If there's a map instance, properly dispose it
        if (mapRef.current) {
          try {
            mapRef.current.remove();
            mapRef.current = null;
          } catch (e) {
            console.log('Map cleanup error (can be ignored):', e);
          }
        }
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        style={style || { height: '100%', width: '100%' }}
        scrollWheelZoom={scrollWheelZoom}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
      >
        {children}
      </MapContainer>
    </div>
  );
}
