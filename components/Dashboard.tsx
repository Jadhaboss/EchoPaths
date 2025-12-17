
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Plus, History, MapPin, Clock, ArrowRight, Trash2, Headphones } from 'lucide-react';
import { SavedTrip, User } from '../types';

interface Props {
  user: User;
  trips: SavedTrip[];
  onStartNew: () => void;
  onSelectTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (id: string) => void;
}

const Dashboard: React.FC<Props> = ({ user, trips, onStartNew, onSelectTrip, onDeleteTrip }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-serif leading-tight">
            Welcome back, <br />
            <span className="italic text-stone-500">{user.name}.</span>
          </h1>
          <p className="text-lg text-stone-500 font-light max-w-md">
            Ready for your next adventure, or would you like to revisit a past journey?
          </p>
        </div>
        
        <button
          onClick={onStartNew}
          className="bg-editorial-900 text-white px-8 py-5 rounded-[2rem] font-bold text-lg hover:bg-stone-800 transition-all flex items-center gap-3 shadow-xl shadow-editorial-900/10 active:scale-[0.98]"
        >
          <Plus size={24} />
          Plan New Journey
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
          <History size={20} className="text-stone-400" />
          <h2 className="text-xl font-medium text-stone-600 uppercase tracking-widest text-sm">Recent Journeys</h2>
        </div>

        {trips.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-stone-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
              <MapPin size={32} />
            </div>
            <p className="text-stone-500 italic text-lg">Your travel log is empty. Every street has a story waiting for you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.sort((a,b) => b.timestamp - a.timestamp).map((trip) => (
              <div 
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="group relative bg-white border border-stone-200 hover:border-editorial-900 p-8 rounded-[2rem] transition-all hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[300px]"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteTrip(trip.id); }}
                  className="absolute top-6 right-6 p-2 text-stone-200 hover:text-red-500 transition-colors z-10"
                >
                  <Trash2 size={18} />
                </button>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-[0.2em]">
                    <Clock size={14} />
                    {new Date(trip.timestamp).toLocaleDateString()}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-stone-300" />
                      <div className="absolute left-[2px] top-3 w-[2px] h-6 bg-stone-100" />
                      <div className="text-stone-500 text-sm leading-tight truncate">{trip.route.startAddress}</div>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-editorial-900" />
                      <div className="text-editorial-900 font-serif text-xl leading-tight truncate">{trip.route.endAddress}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 mt-auto border-t border-stone-50">
                   <div className="flex items-center gap-2">
                      <div className="bg-stone-100 px-3 py-1 rounded-full text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                        {trip.route.storyStyle}
                      </div>
                      <div className="text-sm text-stone-400">{trip.route.duration}</div>
                   </div>
                   <div className="bg-stone-50 p-3 rounded-full group-hover:bg-editorial-900 group-hover:text-white transition-all">
                      <Headphones size={20} />
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
