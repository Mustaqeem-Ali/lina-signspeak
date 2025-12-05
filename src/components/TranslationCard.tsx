import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Copy, Check, AlertCircle, Loader2, Clock, User } from 'lucide-react';
import { TTSMetadata } from '@/services/tts';

interface TranslationCardProps {
  text: string | null;
  isLoading: boolean;
  error: string | null;
  audioBlob: Blob | null;
  isPlayingAudio: boolean;
  isGeneratingAudio?: boolean;
  ttsMetadata?: TTSMetadata | null;
}

export default function TranslationCard({
  text,
  isLoading,
  error,
  audioBlob,
  isPlayingAudio,
  isGeneratingAudio,
  ttsMetadata,
}: TranslationCardProps) {
  const [copied, setCopied] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0.2));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  // Audio visualizer effect
  useEffect(() => {
    if (isPlayingAudio && audioBlob) {
      // Create animated bars
      const animateBars = () => {
        const newLevels = Array(12).fill(0).map(() => 
          0.2 + Math.random() * 0.8
        );
        setAudioLevels(newLevels);
        animationRef.current = requestAnimationFrame(animateBars);
      };
      animateBars();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setAudioLevels(Array(12).fill(0.2));
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlayingAudio, audioBlob]);

  const handleCopy = async () => {
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasContent = text || isLoading || error;

  if (!hasContent) {
    return (
      <div className="float-card w-80 animate-fade-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Translation</h3>
            <p className="text-xs text-muted-foreground">Waiting for input...</p>
          </div>
        </div>
        <div className="h-16 rounded-lg bg-muted/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Start signing to translate
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="float-card w-80 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            error 
              ? 'bg-destructive/20' 
              : isPlayingAudio 
              ? 'bg-google-green/20' 
              : 'bg-primary/20'
          }`}>
            {error ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : isPlayingAudio ? (
              <Volume2 className="w-4 h-4 text-google-green" />
            ) : isLoading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Translation</h3>
            <p className="text-xs text-muted-foreground">
              {error 
                ? 'Error' 
                : isLoading 
                ? 'Analyzing...' 
                : isPlayingAudio 
                ? 'Speaking...' 
                : 'Complete'}
            </p>
          </div>
        </div>

        {text && !error && (
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Copy translation"
          >
            {copied ? (
              <Check className="w-4 h-4 text-google-green" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[60px] rounded-lg bg-muted/30 p-3">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-4 w-1/2 rounded shimmer" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : text ? (
          <p className="text-sm text-foreground leading-relaxed">{text}</p>
        ) : null}
      </div>

      {/* Audio Visualizer / Generating State */}
      {(isGeneratingAudio || isPlayingAudio || audioBlob) && !error && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            {isGeneratingAudio ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : isPlayingAudio ? (
              <Volume2 className="w-4 h-4 text-google-green" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
            {isGeneratingAudio ? (
              <span className="text-xs text-muted-foreground">Generating audio...</span>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-0.5 h-8">
                {audioLevels.map((level, index) => (
                  <div
                    key={index}
                    className="audio-bar w-1"
                    style={{
                      height: `${level * 100}%`,
                      opacity: isPlayingAudio ? 1 : 0.3,
                      transition: 'height 50ms ease-out',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Info - TTS Metadata */}
      {ttsMetadata && !error && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Gen: {ttsMetadata.generationTime}s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3" />
              <span>Speaker: {ttsMetadata.usedSpeaker}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
