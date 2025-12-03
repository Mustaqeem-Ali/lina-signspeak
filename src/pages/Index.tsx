import { useState, useRef, useCallback, useEffect } from 'react';
import VideoStage, { VideoStageHandle } from '@/components/VideoStage';
import ControlDock from '@/components/ControlDock';
import TranslationCard from '@/components/TranslationCard';
import ApiKeyModal from '@/components/ApiKeyModal';
import { useRecorder } from '@/hooks/useRecorder';
import { translateSignLanguage, isApiKeyConfigured } from '@/services/gemini';
import { textToSpeech, playAudioBlob, playPingSound } from '@/services/tts';
import { Helmet } from 'react-helmet-async';

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

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useRecorder();

  // Check for API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      // Set it in window for the service to use
      (window as any).__GEMINI_API_KEY__ = savedKey;
    } else if (!isApiKeyConfigured()) {
      setShowApiKeyModal(true);
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

    try {
      // Step 1: Translate with Gemini
      const text = await translateSignLanguage(videoBlob);
      setTranslatedText(text);

      // Step 2: Convert to speech
      try {
        const audio = await textToSpeech(text);
        setAudioBlob(audio);

        // Play ping then audio
        playPingSound();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const audioElement = playAudioBlob(audio);
        setIsPlayingAudio(true);
        
        audioElement.onended = () => {
          setIsPlayingAudio(false);
        };
      } catch (ttsError) {
        console.warn('TTS failed:', ttsError);
        // Don't set error - translation still succeeded
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleStartRecording = useCallback(() => {
    const stream = videoStageRef.current?.getStream();
    if (stream) {
      setError(null);
      setTranslatedText(null);
      startRecording(stream);
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
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
    if (!isAutoMode || isProcessing) return;

    if (detected) {
      // Clear disappear timer if hands reappear
      if (handDisappearTimerRef.current) {
        clearTimeout(handDisappearTimerRef.current);
        handDisappearTimerRef.current = null;
      }

      // Start recording if not already
      if (!isRecording) {
        const stream = videoStageRef.current?.getStream();
        if (stream) {
          setError(null);
          setTranslatedText(null);
          startRecording(stream);
        }
      }
    } else {
      // Hands disappeared - start timer to stop recording
      if (isRecording && !handDisappearTimerRef.current) {
        handDisappearTimerRef.current = setTimeout(async () => {
          const blob = await stopRecording();
          if (blob && blob.size > 0) {
            processVideo(blob);
          }
          handDisappearTimerRef.current = null;
        }, HAND_DISAPPEAR_DELAY);
      }
    }
  }, [isAutoMode, isProcessing, isRecording, startRecording, stopRecording, processVideo]);

  return (
    <>
      <Helmet>
        <title>LINA - Sign Language Translator</title>
        <meta name="description" content="LINA translates sign language to speech in real-time using AI. Record your signs and hear them spoken aloud." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
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

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-32 pt-4">
          <VideoStage
            ref={videoStageRef}
            onHandsDetected={handleHandsDetected}
            isAutoMode={isAutoMode}
          />
        </main>

        {/* Translation Card - Fixed position */}
        <div className="fixed bottom-28 right-6 z-40">
          <TranslationCard
            text={translatedText}
            isLoading={isProcessing}
            error={error}
            audioBlob={audioBlob}
            isPlayingAudio={isPlayingAudio}
          />
        </div>

        {/* Control Dock - Fixed position */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <ControlDock
            isRecording={isRecording}
            isAutoMode={isAutoMode}
            isProcessing={isProcessing}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onToggleAutoMode={handleToggleAutoMode}
          />
        </div>

        {/* API Key Modal */}
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleSaveApiKey}
        />
      </div>
    </>
  );
}
