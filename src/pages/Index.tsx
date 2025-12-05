import { useState, useRef, useCallback, useEffect } from 'react';
import VideoStage, { VideoStageHandle } from '@/components/VideoStage';
import ControlDock from '@/components/ControlDock';
import TranslationCard from '@/components/TranslationCard';
import ApiKeyModal from '@/components/ApiKeyModal';
import { useRecorder } from '@/hooks/useRecorder';
import { translateSignLanguage, isApiKeyConfigured } from '@/services/gemini';
import { 
  textToSpeech, 
  playAudioBlob, 
  playPingSound, 
  playRecordingStartSound, 
  playRecordingStopSound,
  fetchVoices,
  TTSMetadata 
} from '@/services/tts';
import { Helmet } from 'react-helmet-async';
import { toast } from '@/hooks/use-toast';

const HAND_DISAPPEAR_DELAY = 2500; // 2.5 seconds

export default function Index() {
  const videoStageRef = useRef<VideoStageHandle>(null);
  const handDisappearTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [handsCurrentlyDetected, setHandsCurrentlyDetected] = useState(false);
  const [isWaitingForHands, setIsWaitingForHands] = useState(false);
  
  // Voice selection state
  const [selectedVoice, setSelectedVoice] = useState<string>('p225');
  const [ttsMetadata, setTtsMetadata] = useState<TTSMetadata | null>(null);

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useRecorder();

  // Fetch default voice on mount
  useEffect(() => {
    const loadDefaultVoice = async () => {
      try {
        const data = await fetchVoices();
        setSelectedVoice(data.default_speaker);
      } catch (err) {
        console.warn('Failed to fetch default voice, using fallback:', err);
      }
    };
    loadDefaultVoice();
  }, []);

  // Check for API key on mount - delay modal so video can initialize first
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      (window as any).__GEMINI_API_KEY__ = savedKey;
    } else if (!isApiKeyConfigured()) {
      // Delay showing modal so user sees the interface first
      const timer = setTimeout(() => {
        setShowApiKeyModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    (window as any).__GEMINI_API_KEY__ = key;
    setShowApiKeyModal(false);
  };

  const processVideo = useCallback(async (videoBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    setTranslatedText(null);
    setAudioBlob(null);
    setTtsMetadata(null);

    try {
      // Step 1: Translate with Gemini
      const text = await translateSignLanguage(videoBlob);
      setTranslatedText(text);

      // Step 2: Convert to speech with selected voice
      try {
        const result = await textToSpeech(text, selectedVoice);
        setAudioBlob(result.audioBlob);
        setTtsMetadata(result.metadata);

        // Play ping then audio
        playPingSound();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const audioElement = playAudioBlob(result.audioBlob);
        setIsPlayingAudio(true);
        
        audioElement.onended = () => {
          setIsPlayingAudio(false);
        };
      } catch (ttsError) {
        console.warn('TTS failed:', ttsError);
        toast({
          title: 'TTS Failed',
          description: ttsError instanceof Error ? ttsError.message : 'Could not generate speech',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedVoice]);

  // Manual mode: User clicks record -> wait for hands -> start recording -> hands disappear -> stop & process
  const handleStartRecording = useCallback(() => {
    if (handsCurrentlyDetected) {
      // Hands already visible - start recording immediately
      const stream = videoStageRef.current?.getStream();
      if (stream) {
        setError(null);
        setTranslatedText(null);
        setTtsMetadata(null);
        playRecordingStartSound();
        startRecording(stream);
      }
    } else {
      // Wait for hands to appear
      setIsWaitingForHands(true);
      setError(null);
      setTranslatedText(null);
      setTtsMetadata(null);
    }
  }, [startRecording, handsCurrentlyDetected]);

  const handleStopRecording = useCallback(async () => {
    setIsWaitingForHands(false);
    if (handDisappearTimerRef.current) {
      clearTimeout(handDisappearTimerRef.current);
      handDisappearTimerRef.current = null;
    }
    playRecordingStopSound();
    const blob = await stopRecording();
    if (blob && blob.size > 0) {
      processVideo(blob);
    }
  }, [stopRecording, processVideo]);

  const handleToggleAutoMode = useCallback(() => {
    setIsAutoMode(prev => !prev);
    // Clear any pending timers
    if (handDisappearTimerRef.current) {
      clearTimeout(handDisappearTimerRef.current);
      handDisappearTimerRef.current = null;
    }
  }, []);

  const handleHandsDetected = useCallback((detected: boolean) => {
    setHandsCurrentlyDetected(detected);
    
    if (isProcessing) return;

    if (detected) {
      // Clear disappear timer if hands reappear
      if (handDisappearTimerRef.current) {
        clearTimeout(handDisappearTimerRef.current);
        handDisappearTimerRef.current = null;
      }

      // Manual mode: waiting for hands to start recording
      if (isWaitingForHands && !isRecording) {
        const stream = videoStageRef.current?.getStream();
        if (stream) {
          setIsWaitingForHands(false);
          playRecordingStartSound();
          startRecording(stream);
        }
      }

      // Auto mode: start recording if not already
      if (isAutoMode && !isRecording && !isWaitingForHands) {
        const stream = videoStageRef.current?.getStream();
        if (stream) {
          setError(null);
          setTranslatedText(null);
          setTtsMetadata(null);
          playRecordingStartSound();
          startRecording(stream);
        }
      }
    } else {
      // Hands disappeared - start timer to stop recording (both modes)
      if (isRecording && !handDisappearTimerRef.current) {
        handDisappearTimerRef.current = setTimeout(async () => {
          setIsWaitingForHands(false);
          playRecordingStopSound();
          const blob = await stopRecording();
          if (blob && blob.size > 0) {
            processVideo(blob);
          }
          handDisappearTimerRef.current = null;
        }, HAND_DISAPPEAR_DELAY);
      }
    }
  }, [isAutoMode, isProcessing, isRecording, isWaitingForHands, startRecording, stopRecording, processVideo]);

  const handleVoiceChange = useCallback((voiceId: string) => {
    setSelectedVoice(voiceId);
  }, []);

  return (
    <>
      <Helmet>
        <title>LINA - Sign Language Translator</title>
        <meta name="description" content="LINA translates sign language to speech in real-time using AI. Record your signs and hear them spoken aloud." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-google-green flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground font-display tracking-tight">
                LINA
              </h1>
              <p className="text-xs text-muted-foreground">
                Sign Language Translator
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowApiKeyModal(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
          </button>
        </header>

        {/* Main content - Video always visible */}
        <main className="flex-1 flex flex-col items-center justify-center pb-40 pt-4">
          <VideoStage
            ref={videoStageRef}
            onHandsDetected={handleHandsDetected}
            isAutoMode={isAutoMode}
            isRecording={isRecording}
          />
        </main>

        {/* Translation Card - Fixed position */}
        <div className="fixed bottom-28 right-4 sm:right-6 z-40 max-w-[calc(100vw-2rem)]">
          <TranslationCard
            text={translatedText}
            isLoading={isProcessing}
            error={error}
            audioBlob={audioBlob}
            isPlayingAudio={isPlayingAudio}
            ttsMetadata={ttsMetadata}
          />
        </div>

        {/* Control Dock - Fixed position */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <ControlDock
            isRecording={isRecording}
            isAutoMode={isAutoMode}
            isProcessing={isProcessing}
            isWaitingForHands={isWaitingForHands}
            selectedVoice={selectedVoice}
            onVoiceChange={handleVoiceChange}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onToggleAutoMode={handleToggleAutoMode}
          />
        </div>

        {/* API Key Modal - Only shows after delay */}
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleSaveApiKey}
        />
      </div>
    </>
  );
}
