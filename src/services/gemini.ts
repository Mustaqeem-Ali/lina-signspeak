import { GoogleGenerativeAI } from '@google/generative-ai';

function getApiKey(): string {
  // First check environment variable
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  
  // Then check localStorage (set via modal)
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey) return localKey;
  
  // Finally check window (for runtime setting)
  const windowKey = (window as any).__GEMINI_API_KEY__;
  if (windowKey) return windowKey;
  
  return '';
}

let genAI: GoogleGenerativeAI | null = null;
let cachedApiKey: string = '';

function getGenAI(): GoogleGenerativeAI {
  const currentKey = getApiKey();
  
  // Re-create if key changed
  if (!genAI || cachedApiKey !== currentKey) {
    if (!currentKey) {
      throw new Error('Gemini API key is not configured. Please add your API key in settings.');
    }
    genAI = new GoogleGenerativeAI(currentKey);
    cachedApiKey = currentKey;
  }
  return genAI;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:video/webm;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function translateSignLanguage(videoBlob: Blob): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const base64Video = await blobToBase64(videoBlob);
  const mimeType = videoBlob.type || 'video/webm';

  const prompt = `Analyze this video of sign language. Translate it into a single English sentence with proper punctuation (!, ?, .) to match the emotion. Return ONLY the translated text, nothing else. If you cannot detect any sign language or the video is unclear, respond with "Unable to detect sign language in the video."`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Video,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text().trim();
    
    return text || 'No translation available.';
  } catch (error) {
    console.error('Gemini API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('API_KEY')) {
        throw new Error('Invalid API key. Please check your Gemini API key in settings.');
      }
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later.');
      }
    }
    
    throw new Error('Failed to translate sign language. Please try again.');
  }
}

export function isApiKeyConfigured(): boolean {
  return Boolean(getApiKey());
}
