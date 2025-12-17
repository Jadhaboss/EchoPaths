
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, AlertTriangle, User as UserIcon, LogOut, ChevronLeft } from 'lucide-react';
import RoutePlanner from './components/RoutePlanner';
import StoryPlayer from './components/StoryPlayer';
import MapBackground from './components/MapBackground';
import AuthOverlay from './components/AuthOverlay';
import Dashboard from './components/Dashboard';
import { AppState, RouteDetails, AudioStory, User, SavedTrip } from './types';
import { generateSegment, generateSegmentAudio, calculateTotalSegments, generateStoryOutline } from './services/geminiService';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    let timer: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    });
    return Promise.race([
        promise.then(val => { clearTimeout(timer); return val; }),
        timeoutPromise
    ]);
};

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH_REQUIRED);
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [route, setRoute] = useState<RouteDetails | null>(null);
  const [story, setStory] = useState<AudioStory | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const isGeneratingRef = useRef<boolean>(false);
  const [isBackgroundGenerating, setIsBackgroundGenerating] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(0);

  // --- Persistence Handlers ---
  useEffect(() => {
    const savedUser = localStorage.getItem('echo_paths_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setAppState(AppState.DASHBOARD);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const savedTrips = localStorage.getItem(`echo_paths_trips_${user.id}`);
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      }
    }
  }, [user]);

  const handleLogin = (newUser: User) => {
    localStorage.setItem('echo_paths_user', JSON.stringify(newUser));
    setUser(newUser);
    setAppState(AppState.DASHBOARD);
  };

  const handleLogout = () => {
    localStorage.removeItem('echo_paths_user');
    setUser(null);
    setAppState(AppState.AUTH_REQUIRED);
    setTrips([]);
    handleReset();
  };

  const saveTripToHistory = (routeData: RouteDetails, outline: string[]) => {
    if (!user) return;
    const newTrip: SavedTrip = {
      id: Math.random().toString(36).substr(2, 9),
      route: routeData,
      outline,
      timestamp: Date.now()
    };
    const updated = [newTrip, ...trips];
    setTrips(updated);
    localStorage.setItem(`echo_paths_trips_${user.id}`, JSON.stringify(updated));
  };

  const deleteTrip = (id: string) => {
    if (!user) return;
    const updated = trips.filter(t => t.id !== id);
    setTrips(updated);
    localStorage.setItem(`echo_paths_trips_${user.id}`, JSON.stringify(updated));
  };

  const handleSelectHistoricalTrip = async (trip: SavedTrip) => {
    handleReset();
    handleGenerateStory(trip.route, trip.outline);
  };

  // --- Google Maps Bootstrap ---
  useEffect(() => {
    const SCRIPT_ID = 'google-maps-script';
    const apiKey = process.env.API_KEY?.replace(/["']/g, "").trim();

    if (!apiKey) {
        setScriptError("API Key is missing from environment variables.");
        return;
    }
    if (document.getElementById(SCRIPT_ID) || window.google?.maps) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&v=weekly&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setScriptError("Google Maps failed to load.");
    // @ts-ignore
    window.gm_authFailure = () => setScriptError("Google Maps authentication failed.");
    document.head.appendChild(script);
  }, []);

  // --- Continuous Buffering Engine ---
  useEffect(() => {
      if (!story || !route || appState < AppState.READY_TO_PLAY) return;
      const totalGenerated = story.segments.length;
      const neededBufferIndex = currentPlayingIndex + 3; 
      if (totalGenerated < neededBufferIndex && totalGenerated < story.totalSegmentsEstimate && !isGeneratingRef.current) {
          generateNextSegment(totalGenerated + 1);
      }
  }, [story, route, appState, currentPlayingIndex]);

  const generateNextSegment = async (index: number) => {
      if (!route || !story || isGeneratingRef.current) return;
      try {
          isGeneratingRef.current = true;
          setIsBackgroundGenerating(true);
          const allPreviousText = story.segments.map(s => s.text).join(" ").slice(-3000);
          const segmentOutline = story.outline[index - 1] || "Continue the journey.";
          const segmentData = await withTimeout(
              generateSegment(route, index, story.totalSegmentsEstimate, segmentOutline, allPreviousText),
              60000, `Text generation timed out for segment ${index}`
          );
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          const tempCtx = new AudioContextClass();
          const audioBuffer = await withTimeout(
              generateSegmentAudio(segmentData.text, tempCtx),
              100000, `Audio generation timed out for segment ${index}`
          );
          await tempCtx.close();
          setStory(prev => {
              if (!prev) return null;
              if (prev.segments.some(s => s.index === index)) return prev;
              return { ...prev, segments: [...prev.segments, { ...segmentData, audioBuffer }].sort((a, b) => a.index - b.index) };
          });
      } catch (e) {
          console.error(`Failed to generate segment ${index}`, e);
      } finally {
          isGeneratingRef.current = false;
          setIsBackgroundGenerating(false);
      }
  };

  const handleGenerateStory = async (details: RouteDetails, existingOutline?: string[]) => {
    setRoute(details);
    setGenerationError(null);
    try {
      setAppState(AppState.GENERATING_INITIAL_SEGMENT);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const totalSegmentsEstimate = calculateTotalSegments(details.durationSeconds);
      setLoadingMessage(existingOutline ? "Recalling story arc..." : "Crafting story arc...");
      
      const outline = existingOutline || await withTimeout(
          generateStoryOutline(details, totalSegmentsEstimate),
          60000, "Story outline generation timed out"
      );

      if (!existingOutline) {
        saveTripToHistory(details, outline);
      }

      setLoadingMessage("Writing first chapter...");
      const firstOutlineBeat = outline[0] || "Begin the journey.";
      const seg1Data = await withTimeout(
          generateSegment(details, 1, totalSegmentsEstimate, firstOutlineBeat, ""),
          60000, "Initial text generation timed out"
      );
      
      setLoadingMessage("Preparing audio stream...");
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const tempCtx = new AudioContextClass();
      const seg1Audio = await withTimeout(
          generateSegmentAudio(seg1Data.text, tempCtx),
          100000, "Initial audio generation timed out"
      );
      await tempCtx.close();

      setStory({ totalSegmentsEstimate, outline, segments: [{ ...seg1Data, audioBuffer: seg1Audio }] });
      setAppState(AppState.READY_TO_PLAY);
    } catch (error: any) {
      console.error("Initial generation failed:", error);
      setAppState(AppState.PLANNING);
      setGenerationError(error.message || "Failed to start story stream.");
    }
  };

  const handleReset = () => {
      setAppState(AppState.DASHBOARD);
      setRoute(null);
      setStory(null);
      setCurrentPlayingIndex(0);
      setGenerationError(null);
      isGeneratingRef.current = false;
      setIsBackgroundGenerating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (scriptError) {
      return (
          <div className="min-h-screen bg-editorial-100 flex items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md space-y-4 border-2 border-red-100">
                  <AlertTriangle size={32} className="text-red-500 mx-auto" />
                  <p className="text-stone-600 font-medium">{scriptError}</p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-editorial-100 text-editorial-900 relative selection:bg-stone-200 overflow-x-hidden">
      {appState === AppState.AUTH_REQUIRED && <AuthOverlay onLogin={handleLogin} />}
      
      <MapBackground route={route} />

      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-stone-200/20">
        <div className="flex items-center gap-2 font-serif text-2xl font-bold italic">
          <Sparkles className="text-editorial-900" size={24} />
          EchoPaths
        </div>
        {user && (
          <div className="flex items-center gap-3">
            {appState > AppState.DASHBOARD && (
               <button 
                onClick={() => setAppState(AppState.DASHBOARD)}
                className="p-3 bg-white hover:bg-stone-100 text-editorial-900 rounded-full transition-all border border-stone-200 shadow-sm flex items-center gap-2 px-5"
               >
                 <ChevronLeft size={18} />
                 <span className="hidden sm:inline font-medium">Dashboard</span>
               </button>
            )}
            <button 
              onClick={handleLogout}
              className="w-10 h-10 bg-editorial-100 text-stone-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-stone-200 shadow-sm"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
            <div 
              className="w-10 h-10 bg-editorial-900 text-white rounded-full flex items-center justify-center shadow-md"
              title={`Logged in as ${user.name}`}
            >
              <UserIcon size={20} />
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-32">
        {/* Stage 1: Auth (Handled by Overlay) */}

        {/* Stage 2: Dashboard */}
        {appState === AppState.DASHBOARD && user && (
          <Dashboard 
            user={user}
            trips={trips}
            onStartNew={() => setAppState(AppState.PLANNING)}
            onSelectTrip={handleSelectHistoricalTrip}
            onDeleteTrip={deleteTrip}
          />
        )}

        {/* Stage 3: Planning */}
        {appState === AppState.PLANNING && (
            <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="mb-12">
                 <button 
                  onClick={() => setAppState(AppState.DASHBOARD)}
                  className="flex items-center gap-2 text-stone-500 hover:text-editorial-900 transition-colors font-medium"
                 >
                   <ChevronLeft size={20} />
                   Back to Dashboard
                 </button>
              </div>
              <RoutePlanner 
                onRouteFound={(d) => handleGenerateStory(d)} 
                appState={appState} 
                externalError={generationError}
              />
            </div>
        )}

        {/* Stage 4: Loading */}
        {appState === AppState.GENERATING_INITIAL_SEGMENT && (
            <div className="mt-16 flex flex-col items-center justify-center space-y-8 animate-fade-in text-center py-12 max-w-4xl mx-auto">
                <Loader2 size={48} className="animate-spin text-editorial-900" />
                <h3 className="text-3xl font-serif text-editorial-900">{loadingMessage}</h3>
            </div>
        )}

        {/* Stage 5: Final Player */}
        {appState >= AppState.READY_TO_PLAY && story && route && (
            <div className="mt-8 animate-fade-in">
                <StoryPlayer 
                    story={story} 
                    route={route} 
                    onSegmentChange={(index) => setCurrentPlayingIndex(index)}
                    isBackgroundGenerating={isBackgroundGenerating}
                />
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
