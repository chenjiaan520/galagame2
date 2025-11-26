import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameScript, GeneratedAssets, UserProfile, SaveFile } from './types';
import GameCreationWizard from './components/GameCreationWizard';
import VisualNovelPlayer from './components/VisualNovelPlayer';
import LoginScreen from './components/LoginScreen';
import Button from './components/Button';
import { getSaveList, deleteSave, restoreSave } from './services/storageService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [authToken, setAuthToken] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [currentScript, setCurrentScript] = useState<GameScript | null>(null);
  const [currentAssets, setCurrentAssets] = useState<GeneratedAssets | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [saveList, setSaveList] = useState<SaveFile[]>([]);
  const [initialNodeId, setInitialNodeId] = useState<string | undefined>(undefined);
  const [initialAffinity, setInitialAffinity] = useState<number | undefined>(undefined);

  const [galleryHeroine, setGalleryHeroine] = useState<string | null>(null);
  const systemKey = process.env.API_KEY;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const saves = await getSaveList();
        if (saves.length > 0) {
            // Show the heroine from the latest save
            setGalleryHeroine(saves[0].assets.heroine.normal);
        }
      } catch (e) { console.error(e); }
    };
    loadGallery();
  }, [gameState]);

  const handleLogin = (token: string, userProfile?: UserProfile) => {
    setAuthToken(token);
    setIsLoggedIn(true);
    if (userProfile && !currentUser) setCurrentUser(userProfile);
  };

  const startCreation = () => setGameState(GameState.CREATING);

  const handleGameReady = (script: GameScript, assets: GeneratedAssets, user: UserProfile) => {
    setCurrentScript(script);
    setCurrentAssets(assets);
    setCurrentUser(user);
    setInitialNodeId(undefined);
    setInitialAffinity(undefined);
    setGameState(GameState.PLAYING);
  };

  const resetGame = () => {
    setGameState(GameState.HOME);
    setCurrentScript(null);
    setCurrentAssets(null);
    setCurrentUser(null);
  };

  const openLoadMenu = async () => {
    try {
      const saves = await getSaveList();
      setSaveList(saves);
      setShowLoadMenu(true);
    } catch (e) { console.error(e); }
  };

  const loadSaveFile = (save: SaveFile) => {
    setCurrentScript(save.script);
    setCurrentAssets(save.assets);
    setCurrentUser(save.userProfile);
    setInitialNodeId(save.currentNodeId);
    setInitialAffinity(save.affinity);
    setShowLoadMenu(false);
    setGameState(GameState.PLAYING);
  };

  const handleDeleteSave = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSave(id);
      setSaveList(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleExportSave = (save: SaveFile, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = JSON.stringify(save);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RenYuki_GALA_${save.heroineName}_${save.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        if (!data.script || !data.assets) {
          alert("无效的存档文件");
          return;
        }
        await restoreSave(data);
        const saves = await getSaveList();
        setSaveList(saves);
      } catch (err) { alert("导入失败"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;
  const activeKey = authToken || systemKey || '';

  return (
    <div className="w-screen h-screen font-sans relative overflow-hidden flex items-center justify-center">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000" 
           style={{ backgroundColor: '#fff0f5' }}>
         {galleryHeroine && (
            <>
               <img src={`data:image/png;base64,${galleryHeroine}`} className="absolute right-[-10%] bottom-0 h-[110vh] object-contain opacity-20 blur-sm transform scale-x-[-1]" />
               <img src={`data:image/png;base64,${galleryHeroine}`} className="absolute left-[10%] bottom-0 h-[100vh] object-contain drop-shadow-2xl opacity-100 animate-fadeIn" />
            </>
         )}
      </div>

      <div className="relative z-10 w-full h-full flex flex-col md:flex-row">
        
        {/* Main Menu State */}
        {gameState === GameState.HOME && !showLoadMenu && (
          <div className="w-full h-full flex items-center justify-end px-20">
             
             {/* Floating Menu Card */}
             <div className="glass-panel p-10 w-96 flex flex-col gap-6 animate-pop shadow-2xl bg-white/90">
                <div className="text-center mb-4">
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-rose-400">RenYuki</h1>
                    <p className="text-xs font-bold text-gray-400 tracking-widest mt-2 uppercase">Interactive AI Galgame</p>
                </div>

                <div className="space-y-4">
                   <button onClick={startCreation} className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
                      <span>✨</span> 新的游戏
                   </button>
                   <button onClick={openLoadMenu} className="w-full py-4 bg-white text-gray-600 border-2 border-pink-100 rounded-xl font-bold text-lg hover:border-pink-300 hover:bg-pink-50 transition-all flex items-center justify-center gap-2">
                      <span>📂</span> 读取回忆
                   </button>
                   <button onClick={() => { setAuthToken(''); setIsLoggedIn(false); }} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                      退出登录
                   </button>
                </div>
                
                <div className="mt-4 pt-6 border-t border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400">Ver 2.0.4 Sakura Edition</p>
                </div>
             </div>
          </div>
        )}

        {/* Load Menu Overlay */}
        {gameState === GameState.HOME && showLoadMenu && (
             <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col animate-fadeIn">
                 <div className="h-20 flex items-center justify-between px-10 border-b border-pink-100">
                     <h2 className="text-2xl font-bold text-gray-700">🌸 记忆相册</h2>
                     <div className="flex gap-4">
                        <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileImport} className="hidden" />
                        <Button variant="secondary" onClick={handleImportClick} className="!py-2 !px-4 text-xs">导入存档</Button>
                        <button onClick={() => setShowLoadMenu(false)} className="text-4xl text-gray-400 hover:text-gray-600 hover:rotate-90 transition-transform">×</button>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                         {saveList.length === 0 ? (
                             <div className="col-span-full text-center py-20 text-gray-400">这里空空如也...去创造新的回忆吧！</div>
                         ) : (
                             saveList.map(save => (
                                 <div 
                                   key={save.id}
                                   onClick={() => loadSaveFile(save)}
                                   className="group relative bg-white rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-pink-50"
                                 >
                                     <div className="h-48 w-full overflow-hidden relative">
                                         <img src={`data:image/png;base64,${save.assets.heroine.normal}`} className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700" />
                                         <div className="absolute top-0 right-0 bg-pink-500 text-white px-3 py-1 rounded-bl-xl text-xs font-bold">
                                            💓 {save.affinity}%
                                         </div>
                                     </div>
                                     <div className="p-5">
                                         <h3 className="font-bold text-lg text-gray-800 truncate">{save.title}</h3>
                                         <div className="flex items-center justify-between mt-2">
                                            <span className="text-sm text-pink-400 font-medium">{save.heroineName}</span>
                                            <span className="text-xs text-gray-400">{save.date.split(' ')[0]}</span>
                                         </div>
                                         
                                         <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleExportSave(save, e)} className="bg-white/90 p-2 rounded-full hover:bg-white text-blue-400 shadow-sm">⬇</button>
                                            <button onClick={(e) => handleDeleteSave(save.id, e)} className="bg-white/90 p-2 rounded-full hover:bg-white text-red-400 shadow-sm">✕</button>
                                         </div>
                                     </div>
                                 </div>
                             ))
                         )}
                     </div>
                 </div>
             </div>
        )}

        {gameState === GameState.CREATING && (
          <GameCreationWizard 
            authKey={activeKey}
            onGameReady={handleGameReady}
            onCancel={resetGame}
          />
        )}

        {gameState === GameState.PLAYING && currentScript && currentAssets && currentUser && (
          <div className="absolute inset-0 z-50">
             <VisualNovelPlayer 
               script={currentScript}
               assets={currentAssets}
               userProfile={currentUser}
               initialNodeId={initialNodeId}
               initialAffinity={initialAffinity}
               onExit={resetGame}
             />
          </div>
        )}

      </div>
    </div>
  );
};

export default App;