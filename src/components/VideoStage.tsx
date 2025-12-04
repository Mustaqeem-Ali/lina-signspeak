import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { VideoOff, Hand, Camera, Loader2 } from 'lucide-react';

interface VideoStageProps {
  onHandsDetected?: (detected: boolean) => void;
  isAutoMode?: boolean;
}

export interface VideoStageHandle {
  getStream: () => MediaStream | null;
}

const VideoStage = forwardRef<VideoStageHandle, VideoStageProps>(
  ({ onHandsDetected, isAutoMode = false }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const handDetectorRef = useRef<any>(null);
    const animationFrameRef = useRef<number>();
    
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [handsDetected, setHandsDetected] = useState(false);

    useImperativeHandle(ref, () => ({
      getStream: () => streamRef.current,
    }));

    // Initialize camera
    useEffect(() => {
      let mounted = true;
      
      const initCamera = async () => {
        setIsInitializing(true);
        console.log('[VideoStage] Initializing camera...');
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: 'user',
            },
            audio: false,
          });

          if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          streamRef.current = stream;
          console.log('[VideoStage] Stream obtained:', stream.id);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // Wait for video to be ready
            await new Promise<void>((resolve, reject) => {
              const video = videoRef.current!;
              video.onloadedmetadata = () => {
                console.log('[VideoStage] Video metadata loaded');
                resolve();
              };
              video.onerror = () => reject(new Error('Video element error'));
              setTimeout(() => reject(new Error('Video load timeout')), 5000);
            });
            
            await videoRef.current.play();
            console.log('[VideoStage] Video playing');
            
            if (mounted) {
              setIsCameraReady(true);
              setCameraError(null);
            }
          }
        } catch (error) {
          console.error('[VideoStage] Camera error:', error);
          if (mounted) {
            if (error instanceof DOMException) {
              if (error.name === 'NotAllowedError') {
                setCameraError('Camera access denied. Please allow camera permission.');
              } else if (error.name === 'NotFoundError') {
                setCameraError('No camera found. Please connect a camera.');
              } else {
                setCameraError(`Camera error: ${error.message}`);
              }
            } else {
              setCameraError('Unable to access camera. Please check permissions.');
            }
          }
        } finally {
          if (mounted) {
            setIsInitializing(false);
          }
        }
      };

      initCamera();

      return () => {
        mounted = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    // Initialize hand detection when auto mode is enabled
    useEffect(() => {
      if (!isAutoMode || !isCameraReady) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return;
      }

      const initHandDetection = async () => {
        try {
          const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
          
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );

          const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          });

          handDetectorRef.current = handLandmarker;
          startDetection();
        } catch (error) {
          console.error('[VideoStage] Hand detection init error:', error);
        }
      };

      const startDetection = () => {
        const detectHands = () => {
          if (!videoRef.current || !handDetectorRef.current) return;

          try {
            const results = handDetectorRef.current.detectForVideo(
              videoRef.current,
              performance.now()
            );

            const detected = results.landmarks && results.landmarks.length > 0;
            setHandsDetected(detected);
            onHandsDetected?.(detected);
          } catch (error) {
            // Silently handle detection errors
          }

          animationFrameRef.current = requestAnimationFrame(detectHands);
        };

        detectHands();
      };

      initHandDetection();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isAutoMode, isCameraReady, onHandsDetected]);

    return (
      <div className="relative w-full max-w-4xl mx-auto px-4">
        {/* Main video container */}
        <div className="video-container relative aspect-[4/3] bg-surface min-h-[300px] sm:min-h-[400px]">
          {isInitializing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground text-center">Starting camera...</p>
            </div>
          ) : cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-muted-foreground text-center max-w-xs text-sm">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover bg-black"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            </>
          )}

          {/* Live indicator */}
          {isCameraReady && (
            <div className="absolute top-4 left-4 flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 bg-live-green rounded-full animate-ping opacity-75" />
                <div className="relative w-2 h-2 bg-live-green rounded-full" />
              </div>
              <span className="text-xs font-medium text-foreground">LIVE</span>
            </div>
          )}

          {/* Hand detection indicator */}
          {isAutoMode && isCameraReady && (
            <div className={`absolute top-4 right-4 flex items-center gap-2 glass rounded-full px-3 py-1.5 transition-all duration-300 ${
              handsDetected ? 'bg-google-green/20' : 'bg-surface-glass/5'
            }`}>
              <Hand className={`w-4 h-4 transition-colors ${
                handsDetected ? 'text-google-green' : 'text-muted-foreground'
              }`} />
              <span className={`text-xs font-medium transition-colors ${
                handsDetected ? 'text-google-green' : 'text-muted-foreground'
              }`}>
                {handsDetected ? 'Hands Detected' : 'Waiting...'}
              </span>
            </div>
          )}

          {/* Auto mode badge */}
          {isAutoMode && isCameraReady && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <div className="w-2 h-2 bg-google-blue rounded-full animate-pulse-soft" />
              <span className="text-xs font-medium text-primary">AUTO</span>
            </div>
          )}

          {/* Resolution indicator */}
          {isCameraReady && (
            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/60 font-mono">
              320×240
            </div>
          )}
        </div>
      </div>
    );
  }
);

VideoStage.displayName = 'VideoStage';

export default VideoStage;
