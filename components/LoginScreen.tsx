import React, { useState } from 'react';
import { UserProfile } from '../types';

interface Props {
  onLogin: (token: string, userProfile?: UserProfile) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const HAS_SYSTEM_KEY = !!process.env.API_KEY;

  const handleStart = () => {
    const user: UserProfile = {
      name: "Player",
      avatarBase64: "" 
    };
    onLogin("", user);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-blue-50 to-pink-50">
       
       {/* Background Decoration */}
       <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
       </div>

       <div className="z-10 text-center space-y-8 animate-pop">
          {/* Main Title Block */}
          <div className="relative">
             <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-rose-400 drop-shadow-sm tracking-tight mb-2">
               RenYuki
             </h1>
             <div className="bg-white/60 backdrop-blur-sm px-6 py-2 rounded-full inline-block shadow-sm">
                <p className="text-xl md:text-2xl font-bold text-gray-600 tracking-[0.2em] uppercase">
                   ✧ 纯爱物语 ✧
                </p>
             </div>
          </div>

          <div className="pt-12 flex flex-col items-center gap-4">
            {HAS_SYSTEM_KEY ? (
               <button 
                 onClick={handleStart}
                 className="group relative px-12 py-4 text-xl font-bold text-white transition-all duration-300 transform hover:scale-105"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full shadow-lg group-hover:shadow-pink-300/50"></div>
                 <span className="relative flex items-center gap-2">
                   开始游戏 <span className="text-sm opacity-80">START</span>
                 </span>
               </button>
            ) : (
               <div className="bg-red-50 text-red-500 border border-red-200 rounded-lg px-6 py-4 font-bold text-sm shadow-sm">
                 ❌ API Key Missing
               </div>
            )}
            
            <p className="text-gray-400 text-xs mt-8 opacity-60">
               Powered by Google Gemini 2.5
            </p>
          </div>
       </div>
    </div>
  );
};

export default LoginScreen;