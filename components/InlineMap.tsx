
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import { RouteDetails } from '../types';

interface Props {
  route: RouteDetails;
  currentSegmentIndex: number;
  totalSegments: number;
}

const InlineMap: React.FC<Props> = ({ route, currentSegmentIndex, totalSegments }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const progressMarkerRef = useRef<any>(null);
  const routePathRef = useRef<any[]>([]);

  useEffect(() => {
    if (!window.google || !mapRef.current) return;
    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: 0, lng: 0 },
        disableDefaultUI: true,
        styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
            { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e0e0e0" }] }
        ]
      });
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: googleMapRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#1A1A1A",
          strokeWeight: 5,
          strokeOpacity: 0.9
        }
      });
    }
  }, []);

  useEffect(() => {
    if (route && directionsRendererRef.current && googleMapRef.current) {
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
              routePathRef.current = result.routes[0].overview_path;
              googleMapRef.current.fitBounds(result.routes[0].bounds, { padding: 40 });

              if (!progressMarkerRef.current) {
                  progressMarkerRef.current = new window.google.maps.Marker({
                      map: googleMapRef.current,
                      position: routePathRef.current[0],
                      icon: {
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 8,
                          fillColor: "#1A1A1A",
                          fillOpacity: 1,
                          strokeColor: "#FFFFFF",
                          strokeWeight: 3,
                      }
                  });
              }
            }
          }
        );
      }
  }, [route]);

  useEffect(() => {
      if (!progressMarkerRef.current || routePathRef.current.length === 0) return;
      const progressRatio = Math.min(currentSegmentIndex, totalSegments) / Math.max(1, totalSegments);
      const pathIndex = Math.min(Math.floor(progressRatio * (routePathRef.current.length - 1)), routePathRef.current.length - 1);
      const newPos = routePathRef.current[pathIndex];
      if (newPos) progressMarkerRef.current.setPosition(newPos);
  }, [currentSegmentIndex, totalSegments]);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default InlineMap;
