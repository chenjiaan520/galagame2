
export enum GameState {
  HOME,
  CREATING,
  PLAYING,
  FINISHED
}

export enum SpeakerType {
  HEROINE = 'Heroine',
  PROTAGONIST = 'Protagonist'
}

export interface CharacterImages {
  normal: string;
  happy: string;
  surprised: string;
  angry: string;
  shy: string; 
}

export interface Choice {
  text: string;
  nextNodeId: string; // Pointer to next node
  affinityScore: number; // Impact on relationship
}

export interface StoryNode {
  id: string;
  speaker: SpeakerType;
  textCN: string; 
  textJP?: string; 
  emotion: keyof CharacterImages | 'neutral'; 
  backgroundPrompt?: string;
  bgm?: string; // Key for BGM
  ambient?: string; // Key for Ambient sound
  choices?: Choice[]; 
  nextNodeId?: string; // Linear flow if no choices
}

export interface GameScript {
  title: string;
  heroineName: string;
  startNodeId: string;
  nodes: Record<string, StoryNode>; // Dictionary of nodes
}

export interface GeneratedAssets {
  heroine: CharacterImages;
  protagonist: CharacterImages;
  backgrounds: Record<string, string>; 
  voice: Record<string, string>; // nodeId -> base64 PCM (TTS)
  music: Record<string, string>; // key -> base64 MP3 (BGM)
  ambient: Record<string, string>; // key -> base64 MP3 (Ambient)
}

export interface UserProfile {
  name: string;
  avatarBase64: string; 
}

export interface SaveFile {
  id: number; // Timestamp
  title: string;
  date: string;
  heroineName: string;
  affinity: number;
  currentNodeId: string;
  script: GameScript;
  assets: GeneratedAssets;
  userProfile: UserProfile;
}
