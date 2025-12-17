
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { History, MapPin, Clock, ArrowRight, X, Trash2 } from 'lucide-react';
import { SavedTrip } from '../types';

interface Props {
  trips: SavedTrip[];
  onSelect: (trip: SavedTrip) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TripHistory: React.FC<Props> = ({ trips, onSelect, onDelete, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-editorial-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden border-l border-stone-200">
        <div className="p-8 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History size={24} className="text-editorial-900" />
            <h2 className="text-2xl font-serif text-editorial-900">Your Journeys</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {trips.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
                <MapPin size={32} />
              </div>
              <p className="text-stone-500 italic">No past trips found. Start a journey to see it here.</p>
            </div>
          ) : (
            trips.sort((a,b) => b.timestamp - a.timestamp).map((trip) => (
              <div 
                key={trip.id}
                className="group relative bg-stone-50 hover:bg-white border-2 border-stone-100 hover:border-editorial-900/20 p-5 rounded-2xl transition-all hover:shadow-lg cursor-pointer"
                onClick={() => onSelect(trip)}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}
                  className="absolute top-4 right-4 p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                    <Clock size={14} />
                    {new Date(trip.timestamp).toLocaleDateString()} • {trip.route.storyStyle}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-editorial-900 font-medium">
                      <div className="w-2 h-2 rounded-full bg-stone-300 shrink-0" />
                      <span className="truncate">{trip.route.startAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-editorial-900 font-bold">
                      <div className="w-2 h-2 rounded-full bg-editorial-900 shrink-0" />
                      <span className="truncate">{trip.route.endAddress}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-stone-500">{trip.route.duration} • {trip.route.distance}</span>
                    <div className="bg-white p-2 rounded-full shadow-sm group-hover:bg-editorial-900 group-hover:text-white transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TripHistory;
