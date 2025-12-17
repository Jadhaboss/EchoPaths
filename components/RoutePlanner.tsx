
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Footprints, Car, CloudRain, Sparkles, ScrollText, Sword, Plus, Trash2, Settings2 } from 'lucide-react';
import { RouteDetails, AppState, StoryStyle } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

interface Props {
  onRouteFound: (details: RouteDetails) => void;
  appState: AppState;
  externalError?: string | null;
}

type TravelMode = 'WALKING' | 'DRIVING';

const STYLES: { id: StoryStyle; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'NOIR', label: 'Noir Thriller', icon: CloudRain, desc: 'Gritty, mysterious, rain-slicked streets.' },
    { id: 'CHILDREN', label: 'Children\'s Story', icon: Sparkles, desc: 'Whimsical, magical, and full of wonder.' },
    { id: 'HISTORICAL', label: 'Historical Epic', icon: ScrollText, desc: 'Grand, dramatic, echoing the past.' },
    { id: 'FANTASY', label: 'Fantasy Adventure', icon: Sword, desc: 'An epic quest through a magical realm.' },
];

const RoutePlanner: React.FC<Props> = ({ onRouteFound, appState, externalError }) => {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [shouldOptimize, setShouldOptimize] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('WALKING');
  const [selectedStyle, setSelectedStyle] = useState<StoryStyle>('NOIR');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const waypointRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  const setupAutocomplete = (input: HTMLInputElement | null, callback: (val: string) => void) => {
    if (!input || !window.google?.maps?.places) return;
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      fields: ['formatted_address', 'name', 'geometry'],
      types: ['geocode', 'establishment']
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const address = place.formatted_address || place.name || input.value;
      callback(address);
    });
  };

  useEffect(() => {
    setupAutocomplete(startInputRef.current, setStartAddress);
    setupAutocomplete(endInputRef.current, setEndAddress);
  }, []);

  useEffect(() => {
    waypoints.forEach((_, idx) => {
      setupAutocomplete(waypointRefs.current[idx], (val) => {
        const newWaypoints = [...waypoints];
        newWaypoints[idx] = val;
        setWaypoints(newWaypoints);
      });
    });
  }, [waypoints.length]);

  const addWaypoint = () => {
    if (waypoints.length >= 5) return;
    setWaypoints([...waypoints, '']);
  };

  const removeWaypoint = (idx: number) => {
    const newWaypoints = [...waypoints];
    newWaypoints.splice(idx, 1);
    setWaypoints(newWaypoints);
  };

  const handleCalculate = () => {
    const finalStart = startInputRef.current?.value || startAddress;
    const finalEnd = endInputRef.current?.value || endAddress;

    if (!finalStart || !finalEnd) {
      setError("Please provide a starting point and destination.");
      return;
    }

    if (!window.google?.maps) {
      setError("Maps API not ready.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const directionsService = new window.google.maps.DirectionsService();
    const formattedWaypoints = waypoints
      .filter(w => w.trim() !== '')
      .map(location => ({ location, stopover: true }));

    directionsService.route(
      {
        origin: finalStart,
        destination: finalEnd,
        waypoints: formattedWaypoints,
        optimizeWaypoints: shouldOptimize,
        travelMode: window.google.maps.TravelMode[travelMode],
      },
      (result: any, status: any) => {
        setIsLoading(false);
        if (status === window.google.maps.DirectionsStatus.OK) {
          const route = result.routes[0];
          let totalDurationSeconds = 0;
          let totalDistanceText = "";
          
          route.legs.forEach((leg: any) => {
            totalDurationSeconds += leg.duration.value;
          });

          // Google doesn't give a combined text distance easily for multiple legs
          const totalKm = (route.legs.reduce((acc: number, leg: any) => acc + leg.distance.value, 0) / 1000).toFixed(1);
          totalDistanceText = `${totalKm} km`;

          if (totalDurationSeconds > 28800) { // 8 hour cap for complex routes
            setError("This optimized route is too long. Please shorten it to under 8 hours.");
            return;
          }

          onRouteFound({
            startAddress: route.legs[0].start_address,
            endAddress: route.legs[route.legs.length - 1].end_address,
            waypoints: route.legs.slice(0, -1).map((l: any) => l.end_address).slice(1), 
            distance: totalDistanceText,
            duration: `${Math.round(totalDurationSeconds / 60)} mins`,
            durationSeconds: totalDurationSeconds,
            travelMode: travelMode,
            storyStyle: selectedStyle
          });
        } else {
          setError("Failed to calculate the optimized route. Check your stops.");
        }
      }
    );
  };

  const isLocked = appState > AppState.ROUTE_CONFIRMED;

  return (
    <div className={`transition-all duration-700 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="space-y-8 bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-stone-100">
        <div className="space-y-2">
            <h2 className="text-3xl font-serif text-editorial-900 italic">Plan Your Path</h2>
            <p className="text-stone-400 font-light">Add stops to your journey for a richer story.</p>
        </div>

        <div className="space-y-4">
          {/* Start Point */}
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-editorial-900 transition-colors" size={20} />
            <input
                ref={startInputRef}
                type="text"
                placeholder="Starting Point"
                className="w-full h-16 bg-stone-50 border-2 border-stone-50 focus:border-editorial-900 focus:bg-white rounded-2xl pl-12 pr-4 outline-none transition-all font-medium"
                onChange={(e) => setStartAddress(e.target.value)}
                disabled={isLocked}
            />
          </div>

          {/* Dynamic Waypoints */}
          <div className="space-y-3 pl-4 border-l-2 border-stone-100 ml-6 py-2">
            {waypoints.map((wp, idx) => (
              <div key={idx} className="relative group flex items-center gap-2 animate-fade-in">
                <div className="relative flex-1">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-stone-300" />
                   <input
                    // Fix: Use curly braces to ensure the assignment callback returns void, satisfying the Ref type.
                    ref={el => { waypointRefs.current[idx] = el; }}
                    type="text"
                    value={wp}
                    placeholder={`Stop ${idx + 1}`}
                    className="w-full h-14 bg-stone-50 border-2 border-transparent focus:border-stone-200 focus:bg-white rounded-xl pl-10 pr-4 outline-none transition-all text-sm font-medium"
                    onChange={(e) => {
                        const next = [...waypoints];
                        next[idx] = e.target.value;
                        setWaypoints(next);
                    }}
                    disabled={isLocked}
                   />
                </div>
                <button 
                  onClick={() => removeWaypoint(idx)}
                  className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            
            {waypoints.length < 5 && (
               <button 
                onClick={addWaypoint}
                className="flex items-center gap-2 text-sm font-bold text-stone-400 hover:text-editorial-900 transition-colors py-2"
               >
                 <Plus size={16} />
                 Add a Stop
               </button>
            )}
          </div>

          {/* Destination */}
          <div className="relative group">
            <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-editorial-900 transition-colors" size={20} />
            <input
                ref={endInputRef}
                type="text"
                placeholder="Final Destination"
                className="w-full h-16 bg-stone-50 border-2 border-stone-50 focus:border-editorial-900 focus:bg-white rounded-2xl pl-12 pr-4 outline-none transition-all font-medium"
                onChange={(e) => setEndAddress(e.target.value)}
                disabled={isLocked}
            />
          </div>
        </div>

        {/* Optimization Settings */}
        {waypoints.length > 1 && (
           <div className="flex items-center justify-between p-5 bg-stone-50 rounded-2xl border border-stone-100">
             <div className="flex items-center gap-3">
               <Settings2 size={20} className="text-stone-400" />
               <div className="text-sm">
                 <div className="font-bold text-editorial-900">Optimize Sequence</div>
                 <div className="text-xs text-stone-500">Find the most efficient path through all stops.</div>
               </div>
             </div>
             <button
               onClick={() => setShouldOptimize(!shouldOptimize)}
               className={`w-12 h-6 rounded-full relative transition-colors ${shouldOptimize ? 'bg-editorial-900' : 'bg-stone-300'}`}
             >
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${shouldOptimize ? 'left-7' : 'left-1'}`} />
             </button>
           </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Travel Mode</label>
            <div className="flex bg-stone-50 p-1 rounded-xl">
               {(['WALKING', 'DRIVING'] as TravelMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${travelMode === mode ? 'bg-white text-editorial-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    {mode === 'WALKING' ? <Footprints size={14} /> : <Car size={14} />}
                    {mode}
                  </button>
               ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Style</label>
            <select 
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value as StoryStyle)}
              className="w-full h-[52px] bg-stone-50 border-none rounded-xl px-4 text-xs font-bold text-editorial-900 outline-none appearance-none cursor-pointer hover:bg-stone-100 transition-colors"
            >
              {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-4 rounded-xl">{error}</p>}

        <button
          onClick={handleCalculate}
          disabled={isLoading || isLocked || !startAddress || !endAddress}
          className="w-full bg-editorial-900 text-white h-20 rounded-3xl font-bold text-xl hover:bg-stone-800 transition-all shadow-2xl shadow-editorial-900/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {isLoading ? 'Calculating...' : 'Begin Narrative'}
        </button>
      </div>
    </div>
  );
};

export default RoutePlanner;
