import React, { useState, useEffect, useRef } from 'react';
import { GameScript, GeneratedAssets, SpeakerType, Choice, StoryNode, UserProfile } from '../types';
import Button from './Button';
import Typewriter from './Typewriter';
import { decodeGeminiAudio } from '../services/geminiService';
import { saveGame } from '../services/storageService';

interface Props {
  script: GameScript;
  assets: GeneratedAssets;
  userProfile: UserProfile;
  initialNodeId?: string;
  initialAffinity?: number;
  onExit: () => void;
}

const VisualNovelPlayer: React.FC<Props> = ({ script, assets, userProfile, initialNodeId, initialAffinity, onExit }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string>(initialNodeId || script.startNodeId);
  const [affinity, setAffinity] = useState(initialAffinity || 50);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const currentBgmKeyRef = useRef<string | null>(null);
  const currentAmbientKeyRef = useRef<string | null>(null);

  const currentNode: StoryNode | undefined = script.nodes[currentNodeId];

  // Initialize Audio
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playLoopedAudio = async (base64Data: string, type: 'bgm' | 'ambient') => {
      if (!audioContextRef.current || !base64Data) return;
      const ctx = audioContextRef.current;
      
      try {
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

          const src = ctx.createBufferSource();
          src.buffer = audioBuffer;
          src.loop = true;
          
          const gainNode = ctx.createGain();
          
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(type === 'bgm' ? 0.2 : 0.5, ctx.currentTime + 2);

          src.connect(gainNode);
          gainNode.connect(ctx.destination);
          src.start(0);

          if (type === 'bgm') {
              if (bgmSourceRef.current) try { bgmSourceRef.current.stop(); } catch(e){}
              bgmSourceRef.current = src;
          } else {
              if (ambientSourceRef.current) try { ambientSourceRef.current.stop(); } catch(e){}
              ambientSourceRef.current = src;
          }

      } catch (e) {
          console.error(`Failed to play ${type}`, e);
      }
  };

  const handleStartGame = async () => {
    if (!audioContextRef.current) return;
    await audioContextRef.current.resume();
    setHasStarted(true);
  };

  useEffect(() => {
    if (!currentNode) return;
    if (currentNode.backgroundPrompt && assets.backgrounds[currentNode.backgroundPrompt]) {
      setCurrentBackground(assets.backgrounds[currentNode.backgroundPrompt]);
    } else if (!currentBackground && Object.keys(assets.backgrounds).length > 0) {
        setCurrentBackground(assets.backgrounds[Object.keys(assets.backgrounds)[0]]);
    }
  }, [currentNodeId, currentNode, currentBackground, assets.backgrounds]);

  useEffect(() => {
    if (!hasStarted || !currentNode) return;

    const targetBgm = currentNode.bgm || Object.keys(assets.music)[0]; 
    if (targetBgm && targetBgm !== currentBgmKeyRef.current && assets.music[targetBgm]) {
        currentBgmKeyRef.current = targetBgm;
        playLoopedAudio(assets.music[targetBgm], 'bgm');
    }

    const targetAmbient = currentNode.ambient || Object.keys(assets.ambient)[0];
    if (targetAmbient && targetAmbient !== currentAmbientKeyRef.current && assets.ambient[targetAmbient]) {
        currentAmbientKeyRef.current = targetAmbient;
        playLoopedAudio(assets.ambient[targetAmbient], 'ambient');
    }
  }, [currentNodeId, currentNode, hasStarted, assets.music, assets.ambient]);


  useEffect(() => {
    if (!hasStarted || !currentNode || !audioContextRef.current) return;
    const playVoice = async () => {
      const audioData = assets.voice[currentNodeId];
      if (audioData && currentNode.speaker === SpeakerType.HEROINE) {
        try {
          const buffer = decodeGeminiAudio(audioData, audioContextRef.current!);
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = buffer;
          const gain = audioContextRef.current!.createGain();
          gain.gain.value = 1.0;
          source.connect(gain);
          gain.connect(audioContextRef.current!.destination);
          source.start(0);
        } catch (e) {}
      }
    };
    playVoice();
  }, [currentNodeId, currentNode, assets.voice, hasStarted]);

  const handleNext = () => {
    if (!currentNode) return;
    if (currentNode.choices && currentNode.choices.length > 0) return;
    
    if (currentNode.nextNodeId && script.nodes[currentNode.nextNodeId]) {
      setCurrentNodeId(currentNode.nextNodeId);
    } else {
      setGameEnded(true);
    }
  };

  const handleChoice = (choice: Choice) => {
    setAffinity(prev => Math.min(100, Math.max(0, prev + choice.affinityScore)));
    setCurrentNodeId(choice.nextNodeId);
  };

  const handleSaveGame = async () => {
    setIsSaving(true);
    try {
      await saveGame(script, assets, userProfile, currentNodeId, affinity);
      setSaveMessage("已保存记忆");
    } catch (e) {
      setSaveMessage("保存失败");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  if (!hasStarted) {
      return (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-pink-50 z-50 overflow-hidden">
               <div className="absolute inset-0 opacity-20">
                 {Object.values(assets.backgrounds)[0] && (
                     <img src={`data:image/png;base64,${Object.values(assets.backgrounds)[0]}`} className="w-full h-full object-cover blur-sm" />
                 )}
               </div>
               <div className="z-10 text-center space-y-6 glass-panel p-12 animate-pop">
                   <h2 className="text-3xl font-bold text-gray-700 tracking-wide">✨ {script.title || '纯爱剧本'} ✨</h2>
                   <p className="text-gray-500">剧本加载完毕，准备开始...</p>
                   <button 
                     onClick={handleStartGame}
                     className="bg-gradient-to-r from-pink-400 to-rose-400 text-white px-12 py-4 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition-transform"
                   >
                       Start Game
                   </button>
               </div>
          </div>
      );
  }

  if (gameEnded) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-white overflow-hidden">
         <div className="z-10 glass-panel p-12 text-center max-w-lg w-full">
            <h1 className="text-5xl font-black mb-2 text-pink-400">FIN.</h1>
            <p className="text-gray-400 mb-8 tracking-widest">剧情结束</p>
            
            <div className="mb-8 p-6 bg-pink-50 rounded-2xl border border-pink-100">
               <p className="text-sm text-gray-500 mb-2 font-bold uppercase">💓 最终好感度</p>
               <div className="text-6xl font-black text-rose-500">{affinity}%</div>
            </div>
            
            <div className="space-y-4">
                <Button onClick={handleSaveGame} className="w-full" disabled={isSaving}>
                    {isSaving ? "正在写入日记..." : "保存结局"}
                </Button>
                {saveMessage && <p className="text-green-500 text-sm font-bold">{saveMessage}</p>}
                <Button onClick={onExit} variant="secondary" className="w-full">返回主菜单</Button>
            </div>
         </div>
      </div>
    );
  }

  if (!currentNode) return null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900 select-none font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {currentBackground && (
          <img src={`data:image/png;base64,${currentBackground}`} className="w-full h-full object-cover" alt="bg" />
        )}
      </div>

      {/* Love Meter */}
      <div className="absolute top-4 left-6 z-50">
         <div className="bg-white/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-3 shadow-md border border-pink-100">
            <span className="text-2xl">💓</span>
            <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-1000" style={{ width: `${affinity}%` }}></div>
            </div>
            <span className="text-xs font-bold text-rose-400">{affinity}%</span>
         </div>
      </div>

      {/* Sprites */}
      <div className="absolute inset-0 z-10 flex items-end justify-center px-4 md:px-20 pb-0 pointer-events-none">
         {/* Protagonist (Left) */}
         <div className={`absolute left-[-5%] bottom-0 transition-all duration-500 origin-bottom ${currentNode.speaker !== SpeakerType.PROTAGONIST ? 'scale-95 brightness-75 blur-[1px]' : 'scale-100 drop-shadow-2xl z-20'}`}>
             <img 
               src={`data:image/png;base64,${assets.protagonist[currentNode.emotion] || assets.protagonist.normal}`} 
               className="h-[85vh] object-contain" 
               alt="Protagonist"
             />
         </div>
         
         {/* Heroine (Right) */}
         <div className={`absolute right-[-5%] bottom-0 transition-all duration-500 origin-bottom ${currentNode.speaker !== SpeakerType.HEROINE ? 'scale-95 brightness-75 blur-[1px]' : 'scale-100 drop-shadow-2xl z-20'}`}>
             <img 
               src={`data:image/png;base64,${assets.heroine[currentNode.emotion] || assets.heroine.normal}`} 
               className="h-[95vh] object-contain" 
               alt="Heroine"
             />
         </div>
      </div>

      {/* Choices Overlay */}
      {currentNode.choices && (
        <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4">
           <div className="w-full max-w-xl space-y-4 animate-pop">
             {currentNode.choices.map((choice, idx) => (
               <button
                 key={idx}
                 onClick={() => handleChoice(choice)}
                 className="w-full bg-white hover:bg-pink-50 text-gray-800 hover:text-pink-600 font-bold py-5 px-8 rounded-2xl border-2 border-white hover:border-pink-300 shadow-lg transition-all text-left group relative overflow-hidden"
               >
                 <span className="absolute left-0 top-0 w-2 h-full bg-gray-200 group-hover:bg-pink-400 transition-colors"></span>
                 <span className="ml-4 text-lg">{choice.text}</span>
               </button>
             ))}
           </div>
        </div>
      )}

      {/* UI Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
         <button onClick={handleSaveGame} disabled={isSaving} className="bg-white/80 hover:bg-white text-gray-600 rounded-full px-4 py-2 text-xs font-bold shadow-sm transition-all border border-white">
            {isSaving ? "保存中..." : "📂 保存"}
         </button>
         <button onClick={onExit} className="bg-white/80 hover:bg-white text-gray-600 rounded-full px-4 py-2 text-xs font-bold shadow-sm transition-all border border-white">
            ❌ 退出
         </button>
      </div>
      
      {saveMessage && (
        <div className="absolute top-20 right-6 bg-white text-pink-500 px-4 py-2 rounded-lg shadow-lg text-sm font-bold animate-fadeIn">
            {saveMessage}
        </div>
      )}

      {/* ADV Dialogue Box */}
      <div 
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[95%] max-w-5xl z-30 pointer-events-auto cursor-pointer"
        onClick={handleNext}
      >
        <div className="relative bg-white/90 backdrop-blur-md rounded-3xl border-2 border-white shadow-xl p-8 min-h-[160px] animate-fadeIn">
           {/* Name Tag */}
           <div className="absolute -top-5 left-8 bg-gradient-to-r from-pink-400 to-rose-400 text-white px-8 py-2 rounded-full text-lg font-bold shadow-md">
             {currentNode.speaker === SpeakerType.HEROINE ? script.heroineName : '我'}
           </div>

           {/* Text Content */}
           <div className="mt-2">
              <p className="text-xl md:text-2xl font-medium leading-relaxed text-gray-800 tracking-wide">
                 <Typewriter text={currentNode.textCN} speed={25} />
              </p>
              {currentNode.textJP && currentNode.speaker === SpeakerType.HEROINE && (
                <p className="text-sm text-pink-400 mt-2 font-medium opacity-80">
                  {currentNode.textJP}
                </p>
              )}
           </div>
           
           {/* Next Indicator */}
           {!currentNode.choices && (
             <div className="absolute bottom-4 right-6 animate-bounce text-pink-400">
               ▼
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default VisualNovelPlayer;