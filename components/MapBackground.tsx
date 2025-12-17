
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import { RouteDetails } from '../types';

interface Props {
  route: RouteDetails | null;
}

const MapBackground: React.FC<Props> = ({ route }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  useEffect(() => {
    if (!window.google || !mapRef.current) return;
    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: 34.0522, lng: -118.2437 },
        disableDefaultUI: true,
        styles: [
          { "elementType": "geometry", "stylers": [{ "color": "#f8f8f8" }] },
          { "elementType": "labels", "stylers": [{ "visibility": "off" }] },
          { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] }
        ]
      });
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: googleMapRef.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#1A1A1A", strokeWeight: 2, strokeOpacity: 0.3 }
      });
    }
  }, []);

  useEffect(() => {
    if (route && window.google && directionsRendererRef.current && googleMapRef.current) {
      const directionsService = new window.google.maps.DirectionsService();
      const waypoints = (route.waypoints || []).map(w => ({ location: w, stopover: true }));
      
      directionsService.route(
        {
          origin: route.startAddress,
          destination: route.endAddress,
          waypoints,
          travelMode: window.google.maps.TravelMode[route.travelMode],
        },
        (result: any, status: any) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRendererRef.current.setDirections(result);
            googleMapRef.current.fitBounds(result.routes[0].bounds);
          }
        }
      );
    }
  }, [route]);

  return (
    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none grayscale contrast-125">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-editorial-100 via-transparent to-editorial-100"></div>
    </div>
  );
};

export default MapBackground;
