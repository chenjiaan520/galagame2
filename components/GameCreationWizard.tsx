import React, { useState } from 'react';
import { GameScript, GeneratedAssets, UserProfile } from '../types';
import Button from './Button';
import { fileToBase64, generateGameScript, generateImage, generateProtagonistSprite, generateHeroineSprite, generateVoiceLine } from '../services/geminiService';
import { saveGame } from '../services/storageService';

interface Props {
  authKey: string;
  onGameReady: (script: GameScript, assets: GeneratedAssets, user: UserProfile) => void;
  onCancel: () => void;
}

// Extended Audio Library
const AUDIO_LIBRARY: Record<string, string> = {
  // BGM
  bgm_romance: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lo-fi-chill-medium-version-126464.mp3",
  bgm_happy: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_5a2103f675.mp3?filename=upbeat-lo-fi-19859.mp3",
  bgm_sad: "https://cdn.pixabay.com/download/audio/2022/02/07/audio_34b8c38706.mp3?filename=sad-piano-11171.mp3",
  bgm_tense: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_5105255314.mp3?filename=mystery-124538.mp3",
  
  // Ambient
  amb_school: "https://assets.mixkit.co/active_storage/sfx/138/138-preview.mp3",
  amb_city: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  amb_rain: "https://assets.mixkit.co/active_storage/sfx/247/247-preview.mp3",
  amb_quiet: "https://assets.mixkit.co/active_storage/sfx/232/232-preview.mp3" 
};

// Helper to fetch audio url to base64
const fetchAudioToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Audio fetch failed for", url, e);
    return "";
  }
};

const GameCreationWizard: React.FC<Props> = ({ authKey, onGameReady, onCancel }) => {
  const [step, setStep] = useState<'upload' | 'generating'>('upload');
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [userName, setUserName] = useState('');
  const [heroineName, setHeroineName] = useState('');
  const [plotDescription, setPlotDescription] = useState('');
  
  const [protagonistPhoto, setProtagonistPhoto] = useState<string | undefined>(undefined);
  const [heroinePhoto, setHeroinePhoto] = useState<string | undefined>(undefined);

  const handleProtagonistUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setProtagonistPhoto(base64);
    }
  };

  const handleHeroineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setHeroinePhoto(base64);
    }
  };

  const handleStart = async () => {
    if (!userName) return;
    setStep('generating');

    try {
      // 1. Script
      setLoadingStatus('📖 正在构思剧本大纲...');
      const targetHeroine = heroineName.trim() || "Yuki";
      const script = await generateGameScript(userName, targetHeroine, plotDescription, authKey);

      // 2. Protagonist (Parallel)
      setLoadingStatus('👦 正在绘制主角立绘...');
      
      let protagNormal = '';
      let protagSurprised = '';

      if (protagonistPhoto) {
          [protagNormal, protagSurprised] = await Promise.all([
            generateProtagonistSprite('confident smile', protagonistPhoto, undefined, authKey),
            generateProtagonistSprite('surprised, jaw drop, shock', protagonistPhoto, undefined, authKey)
          ]);
      } else {
          protagNormal = await generateProtagonistSprite('confident smile', undefined, undefined, authKey);
          protagSurprised = await generateProtagonistSprite('surprised, jaw drop, shock', undefined, protagNormal, authKey);
      }

      const protagonistAssets: any = {
        normal: protagNormal,
        surprised: protagSurprised,
        happy: protagNormal,
        angry: protagSurprised,
        shy: protagNormal
      };

      // 3. Heroine
      setLoadingStatus(`👧 正在生成女主角 ${targetHeroine}...`);
      
      let heroineNormal = '';
      let heroineHappy = '';
      let heroineShy = '';

      if (heroinePhoto) {
          const [hNormal, hHappy, hShy] = await Promise.all([
              generateHeroineSprite('gentle smile', undefined, heroinePhoto, authKey),
              generateHeroineSprite('laughing happily', undefined, heroinePhoto, authKey),
              generateHeroineSprite('blushing shy', undefined, heroinePhoto, authKey)
          ]);
          heroineNormal = hNormal;
          heroineHappy = hHappy;
          heroineShy = hShy;
      } else {
          heroineNormal = await generateHeroineSprite('gentle smile', undefined, undefined, authKey);
          setLoadingStatus('✨ 正在添加可爱的表情差分...');
          heroineHappy = await generateHeroineSprite('laughing happily', heroineNormal, undefined, authKey);
          heroineShy = await generateHeroineSprite('blushing shy', heroineNormal, undefined, authKey);
      }
      
      const heroineAssets = {
        normal: heroineNormal,
        happy: heroineHappy,
        surprised: heroineNormal, 
        angry: heroineNormal,
        shy: heroineShy
      };

      // 4. Backgrounds
      setLoadingStatus('🏫 正在绘制唯美背景...');
      const backgrounds: Record<string, string> = {};
      const uniqueBgPrompts = Array.from(new Set(Object.values(script.nodes).map(n => n.backgroundPrompt).filter(Boolean) as string[]));
      
      if (uniqueBgPrompts.length === 0) uniqueBgPrompts.push("Modern minimalist classroom, high contrast, clean, anime style");

      for (const prompt of uniqueBgPrompts.slice(0, 3)) {
        backgrounds[prompt] = await generateImage(`Anime background art, Makoto Shinkai style, bright and colorful, ${prompt}, detailed, no characters.`, authKey);
      }

      // 5. Audio (TTS, BGM, Ambient)
      setLoadingStatus('🎵 正在调音...');
      const voiceData: Record<string, string> = {};
      const musicData: Record<string, string> = {};
      const ambientData: Record<string, string> = {};

      const neededBgms = new Set<string>();
      const neededAmbients = new Set<string>();
      
      neededBgms.add('bgm_romance');
      neededAmbients.add('amb_school');

      Object.values(script.nodes).forEach(node => {
         if (node.bgm) neededBgms.add(node.bgm);
         if (node.ambient) neededAmbients.add(node.ambient);
      });

      for (const key of neededBgms) {
          if (AUDIO_LIBRARY[key]) {
             musicData[key] = await fetchAudioToBase64(AUDIO_LIBRARY[key]);
          }
      }
      for (const key of neededAmbients) {
          if (AUDIO_LIBRARY[key]) {
             ambientData[key] = await fetchAudioToBase64(AUDIO_LIBRARY[key]);
          }
      }

      // 5.3 Generate Voices
      setLoadingStatus('🗣️ 正在录制 CV 台词...');
      const nodes = Object.values(script.nodes);
      for (const node of nodes) {
        if (node.speaker === 'Heroine' && node.textJP) {
          try {
            voiceData[node.id] = await generateVoiceLine(node.textJP, authKey);
          } catch (e) {}
        }
      }

      const finalUserProfile: UserProfile = {
          name: userName,
          avatarBase64: protagonistPhoto || protagNormal 
      };

      const finalAssets: GeneratedAssets = {
        protagonist: protagonistAssets,
        heroine: heroineAssets,
        backgrounds,
        voice: voiceData,
        music: musicData,
        ambient: ambientData
      };

      setLoadingStatus('💾 正在生成存档...');
      try {
        await saveGame(script, finalAssets, finalUserProfile, script.startNodeId, 50);
      } catch (saveError) {
        console.warn("Auto-save failed:", saveError);
      }

      onGameReady(script, finalAssets, finalUserProfile);

    } catch (error) {
      console.error(error);
      setLoadingStatus('错误: ' + (error as Error).message);
      setStep('upload');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl glass-panel h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Header Bar */}
        <div className="h-16 border-b-2 border-white/50 flex items-center justify-between px-8 bg-white/40 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-700">🎨 创建新剧本</h2>
            <div className="text-xs bg-pink-100 text-pink-500 px-3 py-1 rounded-full font-bold">New Game Setup</div>
        </div>

        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto p-8 md:p-12 animate-fadeIn">
            
            {/* Top Section: Narrative Prompt */}
            <div className="mb-10 p-6 bg-white/60 rounded-2xl border border-white">
               <h3 className="text-xl font-bold text-pink-500 mb-2">🌸 故事背景 (可选)</h3>
               <textarea 
                 value={plotDescription}
                 onChange={(e) => setPlotDescription(e.target.value)}
                 className="w-full anime-input h-24 resize-none"
                 placeholder="例如：放学后的屋顶，青梅竹马突然向我告白了..."
               />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Left Column: Protagonist */}
              <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">👦</span>
                    <h3 className="text-xl font-bold text-gray-700">男主角设定</h3>
                  </div>
                  
                  <div className="group">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">你的名字</label>
                    <input 
                      type="text" 
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full anime-input text-lg font-medium"
                      placeholder="请输入姓名..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">你的照片 (可选 - AI 换脸)</label>
                    <div className="border-2 border-dashed border-pink-200 hover:border-pink-400 rounded-2xl p-4 transition-all cursor-pointer relative h-40 flex items-center justify-center bg-pink-50/50 hover:bg-pink-50 group overflow-hidden">
                      <input type="file" accept="image/*" onChange={handleProtagonistUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {protagonistPhoto ? (
                        <img src={`data:image/jpeg;base64,${protagonistPhoto}`} className="h-full object-contain rounded-lg" alt="Preview" />
                      ) : (
                        <div className="text-center group-hover:scale-105 transition-transform">
                          <div className="text-3xl mb-2 text-pink-300">📷</div>
                          <span className="text-xs font-bold text-gray-400">点击上传照片</span>
                        </div>
                      )}
                    </div>
                  </div>
              </div>

              {/* Right Column: Heroine */}
              <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">👧</span>
                    <h3 className="text-xl font-bold text-gray-700">女主角设定</h3>
                  </div>

                   <div className="group">
                     <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">她的名字</label>
                     <input 
                       type="text" 
                       value={heroineName}
                       onChange={(e) => setHeroineName(e.target.value)}
                       className="w-full anime-input text-lg font-medium"
                       placeholder="请输入名字..."
                     />
                   </div>

                   <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">参考图 (可选)</label>
                    <div className="border-2 border-dashed border-pink-200 hover:border-pink-400 rounded-2xl p-4 transition-all cursor-pointer relative h-40 flex items-center justify-center bg-pink-50/50 hover:bg-pink-50 group overflow-hidden">
                      <input type="file" accept="image/*" onChange={handleHeroineUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {heroinePhoto ? (
                        <img src={`data:image/jpeg;base64,${heroinePhoto}`} className="h-full object-contain rounded-lg" alt="Preview" />
                      ) : (
                        <div className="text-center group-hover:scale-105 transition-transform">
                          <div className="text-3xl mb-2 text-pink-300">🖼️</div>
                          <span className="text-xs font-bold text-gray-400">点击上传参考图</span>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>

            <div className="mt-12 flex justify-end gap-4 items-center border-t border-gray-200/50 pt-8">
               <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 font-bold px-4">取消</button>
               <Button 
                 onClick={handleStart} 
                 disabled={!userName}
                 className="w-48 shadow-lg shadow-pink-200"
               >
                 {!userName ? "请先输入名字" : "✨ 开始生成"}
               </Button>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-white/80 backdrop-blur-sm p-8">
             <div className="w-full max-w-md text-center">
                 <div className="text-6xl animate-bounce mb-6">🪄</div>
                 <h3 className="text-2xl font-bold text-gray-700 mb-4 animate-pulse">{loadingStatus}</h3>
                 <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-pink-400 to-rose-400 h-3 rounded-full animate-progress w-full origin-left" style={{ animation: 'glitch-load 2s infinite' }}></div>
                 </div>
                 <p className="mt-4 text-xs text-gray-400">正在调用 Gemini 2.5 创造世界...</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCreationWizard;