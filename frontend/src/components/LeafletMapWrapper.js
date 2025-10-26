import React, { useEffect, useRef, useState } from 'react';
import { MapContainer } from 'react-leaflet';

// Wrapper component to properly manage Leaflet lifecycle
// This handles React 18 StrictMode double-rendering
export default function LeafletMapWrapper({ 
  center, 
  zoom, 
  children, 
  style,
  scrollWheelZoom = true
}) {
  const [containerId] = useState(() => `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Cleanup function to properly dispose of Leaflet map
    return () => {
      // Small delay to allow React to finish unmounting
      setTimeout(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        if (containerRef.current) {
          // Clean all Leaflet artifacts
          const container = containerRef.current;
          const leafletContainer = container.querySelector('.leaflet-container');
          
          if (leafletContainer && leafletContainer._leaflet_id) {
            delete leafletContainer._leaflet_id;
          }
          
          if (container._leaflet_id) {
            delete container._leaflet_id;
          }
        }
      }, 0);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      id={containerId}
      style={{ height: '100%', width: '100%' }}
    >
      <MapContainer
        ref={(map) => {
          if (map) {
            mapInstanceRef.current = map;
          }
        }}
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
