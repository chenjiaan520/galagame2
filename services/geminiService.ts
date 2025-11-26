import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameScript, SpeakerType, StoryNode } from "../types";

// --- Helpers ---

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Decodes Raw PCM (16-bit Little Endian, 24kHz) from Gemini TTS.
 */
export const decodeGeminiAudio = (base64Data: string, audioContext: AudioContext): AudioBuffer => {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  
  const sampleCount = len / 2;
  const audioBuffer = audioContext.createBuffer(1, sampleCount, 24000);
  const channelData = audioBuffer.getChannelData(0);
  
  const buffer = new ArrayBuffer(len);
  const view = new DataView(buffer);
  
  for (let i = 0; i < len; i++) {
    (new Uint8Array(buffer))[i] = binaryString.charCodeAt(i);
  }

  for (let i = 0; i < sampleCount; i++) {
    const int16 = view.getInt16(i * 2, true);
    channelData[i] = int16 / 32768.0;
  }
  
  return audioBuffer;
};

export const decodeFileAudio = async (arrayBuffer: ArrayBuffer, audioContext: AudioContext): Promise<AudioBuffer> => {
    return await audioContext.decodeAudioData(arrayBuffer);
};

/**
 * Advanced Background Removal: Flood Fill.
 */
const removeBackground = async (base64Data: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64Data}`;
    img.crossOrigin = "Anonymous"; 
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Data);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      const isWhite = (index: number) => {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const threshold = 230; 
        return r > threshold && g > threshold && b > threshold;
      };

      const queue: [number, number][] = [];
      const visited = new Uint8Array(width * height); 

      const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
      
      for (const [cx, cy] of corners) {
        const idx = (cy * width + cx) * 4;
        if (isWhite(idx)) {
          queue.push([cx, cy]);
          visited[cy * width + cx] = 1;
        }
      }

      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        const pixelIndex = (y * width + x) * 4;
        
        data[pixelIndex + 3] = 0; // Transparent

        const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (visited[nIdx] === 0) {
              const nPixelIdx = nIdx * 4;
              if (isWhite(nPixelIdx)) {
                visited[nIdx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const newBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(newBase64);
    };
    img.onerror = () => resolve(base64Data);
  });
};

// --- API Client Helper ---

const createClient = (apiKeyOrToken?: string) => {
  // Use the provided key or fallback to the process.env.API_KEY
  const key = apiKeyOrToken || process.env.API_KEY;
  
  if (!key) {
    throw new Error("Missing API Key. Ensure process.env.API_KEY is configured.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// --- Script Generation ---

export const generateGameScript = async (
  protagonistName: string,
  heroineName: string,
  plotDescription: string,
  authKey?: string
): Promise<GameScript> => {
  const ai = createClient(authKey);
  
  const targetHeroine = heroineName ? heroineName.trim() : "Yuki";
  const customPlot = plotDescription ? `Specific Situation: "${plotDescription}"` : "A fateful encounter at school.";

  const prompt = `
    You are the LEAD SCENARIO WRITER for a AAA-rated Japanese Visual Novel (Galgame).
    
    **MISSION**: Create a highly immersive, romantic, and emotionally intense scene.
    **GENRE**: School Romance / Slice of Life (Moe-ge).
    **TARGET AUDIENCE**: Otaku who love "Doki-Doki" moments, "Tsundere" or "Deredere" interactions, and cute jealousies.

    **CHARACTERS**:
    1. **${protagonistName}** (Protagonist): A high school student. 
    2. **${targetHeroine}** (Heroine): The main love interest. She is cute, expressive, and deeply cares about ${protagonistName}, though she might hide it or be overwhelming about it.

    **PLOT**: ${customPlot}

    **AUDIO & VISUAL DIRECTION**:
    - Select the most appropriate BGM (background music) and Ambient Sound for *each node* to enhance the atmosphere.
    - **BGM Options**: 
      - 'bgm_romance' (Emotional, touching)
      - 'bgm_happy' (Upbeat, daily life, funny)
      - 'bgm_sad' (Melancholic, serious)
      - 'bgm_tense' (Suspense, surprise, conflict)
    - **Ambient Options**:
      - 'amb_school' (Classroom chatter, bells)
      - 'amb_city' (Traffic, wind, crowds)
      - 'amb_rain' (Rainfall, thunder)
      - 'amb_quiet' (Room tone, clock ticking, silence)

    **WRITING GUIDELINES (STRICT)**:
    - **STYLE**: Use Anime/Light Novel tropes.
    - **DIALOGUE**: Heroine must sound like a classic Anime Girl (cute tics, stutters). Protagonist monitors inner thoughts.
    - **PACING**: Fast-paced but with pauses for romantic tension.

    **TECHNICAL REQUIREMENTS**:
    - **Nodes**: Exactly 6-8 story nodes.
    - **Format**: Valid JSON strictly matching the schema.
    - **Language**: textCN (Chinese), textJP (Japanese for Heroine).

    **SCHEMA CONSTRAINTS**:
    - speaker: "Heroine" or "Protagonist".
    - emotion: "normal", "happy", "surprised", "angry", "shy".
    - bgm: One of the options above.
    - ambient: One of the options above.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.95,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            heroineName: { type: Type.STRING },
            startNodeId: { type: Type.STRING },
            nodes: {
              type: Type.ARRAY,
              items: {
                 type: Type.OBJECT,
                 properties: {
                   id: { type: Type.STRING },
                   speaker: { type: Type.STRING, enum: [SpeakerType.HEROINE, SpeakerType.PROTAGONIST] },
                   textCN: { type: Type.STRING },
                   textJP: { type: Type.STRING, nullable: true },
                   emotion: { type: Type.STRING, enum: ['normal', 'happy', 'surprised', 'angry', 'shy'] },
                   backgroundPrompt: { type: Type.STRING, nullable: true },
                   bgm: { type: Type.STRING, enum: ['bgm_romance', 'bgm_happy', 'bgm_sad', 'bgm_tense'], nullable: true },
                   ambient: { type: Type.STRING, enum: ['amb_school', 'amb_city', 'amb_rain', 'amb_quiet'], nullable: true },
                   nextNodeId: { type: Type.STRING, nullable: true },
                   choices: {
                     type: Type.ARRAY,
                     items: {
                       type: Type.OBJECT,
                       properties: {
                         text: { type: Type.STRING },
                         nextNodeId: { type: Type.STRING },
                         affinityScore: { type: Type.NUMBER }
                       },
                       required: ["text", "nextNodeId", "affinityScore"]
                     },
                     nullable: true
                   }
                 },
                 required: ["id", "speaker", "textCN", "emotion"]
              }
            }
          },
          required: ["title", "heroineName", "startNodeId", "nodes"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI Generation Blocked.");
    }
    
    let cleanText = response.text.trim();
    cleanText = cleanText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');

    const rawData = JSON.parse(cleanText);
    
    const nodesRecord: Record<string, StoryNode> = {};
    const nodesArray = rawData.nodes;

    if (Array.isArray(nodesArray)) {
        nodesArray.forEach((node: any, index: number) => {
            // Repair connections
            if ((!node.choices || node.choices.length === 0) && !node.nextNodeId) {
                if (index < nodesArray.length - 1) {
                    node.nextNodeId = nodesArray[index + 1].id;
                }
            }
            nodesRecord[node.id] = node;
        });
    }

    if (!nodesRecord[rawData.startNodeId] && nodesArray.length > 0) {
        rawData.startNodeId = nodesArray[0].id;
    }

    return {
        title: rawData.title,
        heroineName: rawData.heroineName || targetHeroine,
        startNodeId: rawData.startNodeId,
        nodes: nodesRecord
    };

  } catch (e: any) {
    console.error("Script Generation Failed:", e);
    throw e;
  }
};

// --- Image Generation ---

export const generateImage = async (prompt: string, authKey?: string, model = 'gemini-2.5-flash-image'): Promise<string> => {
  const ai = createClient(authKey);
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return part.inlineData.data;
  }
  throw new Error("No image generated");
};

/**
 * Generate Protagonist Sprite.
 */
export const generateProtagonistSprite = async (
  emotion: string, 
  userPhotoBase64?: string, 
  referenceImageBase64?: string,
  authKey?: string
): Promise<string> => {
  const ai = createClient(authKey);
  let prompt = "";
  const parts: any[] = [];

  if (userPhotoBase64) {
      prompt = `
        Task: PHOTOREALISTIC FACE SWAP / EDIT.
        IDENTITY: Match input face exactly.
        CLOTHING: Japanese High School Uniform (Black Gakuran).
        EXPRESSION: "${emotion}".
        Output: Single person cutout on SOLID WHITE background.
      `;
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: userPhotoBase64 } });
  } else if (referenceImageBase64) {
      prompt = `
        Keep character design EXACTLY consistent with the provided reference image.
        Gender: Male student.
        Expression: ${emotion}.
        Background: SOLID WHITE (#FFFFFF).
      `;
      parts.push({ inlineData: { mimeType: 'image/png', data: referenceImageBase64 } });
  } else {
      prompt = `
        Character Design: Handsome Anime Boy.
        Style: Kyoto Animation (Clannad).
        Clothing: Japanese High School Uniform (Black Gakuran).
        Expression: ${emotion}.
        Background: SOLID WHITE (#FFFFFF).
      `;
  }
  
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return await removeBackground(part.inlineData.data);
  }
  return ""; 
};

/**
 * Generate Heroine Sprite.
 */
export const generateHeroineSprite = async (
  emotion: string, 
  referenceImageBase64?: string, 
  userPhotoBase64?: string,
  authKey?: string
): Promise<string> => {
  const ai = createClient(authKey);
  let prompt = "";
  const parts: any[] = [];

  if (userPhotoBase64) {
      prompt = `
        Task: PHOTOREALISTIC FACE SWAP / EDIT.
        IDENTITY: Match input face exactly.
        CLOTHING: Female Japanese High School Uniform.
        EXPRESSION: "${emotion}".
        Background: SOLID WHITE (#FFFFFF).
      `;
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: userPhotoBase64 } });
  } else if (referenceImageBase64) {
      prompt = `
        STRICT REQUIREMENT: COPY CHARACTER DESIGN EXACTLY.
        REFERENCE IMAGE: Use the provided image as the absolute ground truth.
        ONLY CHANGE: Facial Expression to "${emotion}".
        Style: Kyoto Animation (Clannad).
        Background: SOLID WHITE (#FFFFFF).
      `;
      parts.push({ inlineData: { mimeType: 'image/png', data: referenceImageBase64 } });
  } else {
    prompt = `
        Character Design: Cute anime girl, Kyoto Animation (Clannad) style.
        Appearance: Long light brown hair, big eyes, school uniform with ribbon.
        Expression: ${emotion}.
        Background: SOLID WHITE (#FFFFFF).
    `;
  }
  
  parts.push({ text: prompt });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return await removeBackground(part.inlineData.data);
  }
  return "";
}

// --- Audio Generation ---

export const generateVoiceLine = async (text: string, authKey?: string): Promise<string> => {
  const ai = createClient(authKey);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: { parts: [{ text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, 
        },
      },
    },
  });
  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("No audio");
  return base64;
};