const TTS_BACKEND_URL = 'http://localhost:8000';

export interface Speaker {
  id: string;
  gender: string;
}

export interface VoicesResponse {
  speakers: Speaker[];
  default_speaker: string;
  default_gender: string;
}

export interface TTSMetadata {
  generationTime: string;
  usedSpeaker: string;
}

export interface TTSResult {
  audioBlob: Blob;
  metadata: TTSMetadata;
}

// Fetch available voices from the backend
export async function fetchVoices(): Promise<VoicesResponse> {
  try {
    const response = await fetch(`${TTS_BACKEND_URL}/voices`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch voices error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to TTS server. Make sure the Python backend is running on localhost:8000');
    }
    
    throw error;
  }
}

// Generate speech from text using the new API spec
export async function textToSpeech(text: string, speaker: string = 'p225'): Promise<TTSResult> {
  try {
    const response = await fetch(`${TTS_BACKEND_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
      },
      body: JSON.stringify({
        text,
        speaker,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS server error: ${response.status}`);
    }

    // Extract metadata from response headers
    const generationTime = response.headers.get('X-Generation-Time') || '0.00';
    const usedSpeaker = response.headers.get('X-Used-Speaker') || speaker;

    const audioBlob = await response.blob();
    
    return {
      audioBlob,
      metadata: {
        generationTime,
        usedSpeaker,
      },
    };
  } catch (error) {
    console.error('TTS error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to TTS server. Make sure the Python backend is running on localhost:8000');
    }
    
    throw error;
  }
}

export function playAudioBlob(blob: Blob): HTMLAudioElement {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  
  audio.onended = () => {
    URL.revokeObjectURL(audioUrl);
  };
  
  audio.play().catch(console.error);
  return audio;
}

// Create a simple ping sound using Web Audio API
export function playPingSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880; // A5 note
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('Could not play ping sound:', error);
  }
}

// Recording start sound - rising dual tone
export function playRecordingStartSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First tone - rising
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, audioContext.currentTime);
    osc1.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.15);
    gain1.gain.setValueAtTime(0.25, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.2);

    // Second tone - higher confirmation beep
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.type = 'sine';
    osc2.frequency.value = 1047; // C6
    gain2.gain.setValueAtTime(0, audioContext.currentTime);
    gain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    osc2.start(audioContext.currentTime + 0.12);
    osc2.stop(audioContext.currentTime + 0.25);
  } catch (error) {
    console.warn('Could not play recording start sound:', error);
  }
}

// Recording stop sound - falling tone
export function playRecordingStopSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Falling tone
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, audioContext.currentTime);
    osc1.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 0.15);
    gain1.gain.setValueAtTime(0.25, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.2);

    // Low confirmation tone
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.type = 'sine';
    osc2.frequency.value = 330; // E4
    gain2.gain.setValueAtTime(0, audioContext.currentTime);
    gain2.gain.setValueAtTime(0.15, audioContext.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    osc2.start(audioContext.currentTime + 0.1);
    osc2.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn('Could not play recording stop sound:', error);
  }
}
