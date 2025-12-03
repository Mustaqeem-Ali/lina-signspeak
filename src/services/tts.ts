const TTS_BACKEND_URL = 'http://localhost:8000/tts';

export interface TTSRequest {
  text: string;
  speaker_id?: string;
}

export async function textToSpeech(text: string, speakerId: string = 'p225'): Promise<Blob> {
  try {
    const response = await fetch(TTS_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        speaker_id: speakerId,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS server error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    return audioBlob;
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
