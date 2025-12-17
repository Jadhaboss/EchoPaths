
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { User as UserIcon, LogIn, Sparkles } from 'lucide-react';
import { User } from '../types';

interface Props {
  onLogin: (user: User) => void;
}

const AuthOverlay: React.FC<Props> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onLogin({
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-editorial-100/80 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-white/50 space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-editorial-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-editorial-900/20">
            <Sparkles className="text-white" size={40} />
          </div>
          <h2 className="text-4xl font-serif text-editorial-900 italic">Welcome to EchoPaths</h2>
          <p className="text-stone-500 font-light">Enter your name to personalize your journeys and save your trip history.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-editorial-900 transition-colors" size={20} />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full h-16 bg-stone-50 border-2 border-stone-100 focus:border-editorial-900 focus:bg-white rounded-2xl pl-12 pr-4 outline-none transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-editorial-900 text-white h-16 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
          >
            <LogIn size={20} />
            Start Exploring
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthOverlay;
