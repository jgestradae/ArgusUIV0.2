import React, { useEffect, useRef } from 'react';
import { MapContainer } from 'react-leaflet';

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
        
        // Find all child elements with Leaflet IDs and clean them
        const leafletContainers = container.querySelectorAll('[class*="leaflet"]');
        leafletContainers.forEach(el => {
          if (el._leaflet_id) {
            delete el._leaflet_id;
          }
        });
      }
      
      // If there's a map instance, properly dispose it
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (e) {
          // Silently ignore cleanup errors
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
      >
        {children}
      </MapContainer>
    </div>
  );
}
