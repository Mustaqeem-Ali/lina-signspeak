import { useState, useEffect } from 'react';
import { ChevronDown, Volume2, AlertCircle, Loader2 } from 'lucide-react';
import { fetchVoices, Speaker } from '@/services/tts';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  disabled?: boolean;
}

export default function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  disabled = false,
}: VoiceSelectorProps) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchVoices();
        setSpeakers(data.speakers);
        
        // Set default voice if none selected
        if (!selectedVoice && data.default_speaker) {
          onVoiceChange(data.default_speaker);
        }
      } catch (err) {
        console.error('Failed to load voices:', err);
        setError('Failed to load voices');
      } finally {
        setIsLoading(false);
      }
    };

    loadVoices();
  }, []);

  const selectedSpeaker = speakers.find(s => s.id === selectedVoice);
  const displayText = selectedSpeaker 
    ? `${selectedSpeaker.id} - ${selectedSpeaker.gender}` 
    : selectedVoice || 'Select voice';

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Voices unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white/10 backdrop-blur-md border border-white/10
          text-sm text-foreground
          transition-all duration-200
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-primary/50' : ''}
        `}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Volume2 className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="min-w-[100px] text-left">{isLoading ? 'Loading...' : displayText}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !isLoading && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute bottom-full mb-2 left-0 z-50 min-w-[180px] py-1 rounded-lg bg-popover/95 backdrop-blur-md border border-white/10 shadow-xl animate-fade-in">
            {speakers.map((speaker) => (
              <button
                key={speaker.id}
                onClick={() => {
                  onVoiceChange(speaker.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2 text-sm text-left
                  flex items-center justify-between
                  transition-colors
                  ${speaker.id === selectedVoice 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-foreground hover:bg-white/10'
                  }
                `}
              >
                <span>{speaker.id} - {speaker.gender}</span>
                {speaker.id === selectedVoice && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
