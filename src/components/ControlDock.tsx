import { 
  Circle, 
  Square, 
  Wand2, 
  Hand, 
  Settings,
  Loader2
} from 'lucide-react';

interface ControlDockProps {
  isRecording: boolean;
  isAutoMode: boolean;
  isProcessing: boolean;
  isWaitingForHands?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleAutoMode: () => void;
}

export default function ControlDock({
  isRecording,
  isAutoMode,
  isProcessing,
  isWaitingForHands = false,
  onStartRecording,
  onStopRecording,
  onToggleAutoMode,
}: ControlDockProps) {
  return (
    <div className="dock animate-slide-up">
      {/* Auto Mode Toggle */}
      <button
        onClick={onToggleAutoMode}
        disabled={isRecording || isProcessing}
        className={`control-button transition-all ${
          isAutoMode 
            ? 'bg-primary/20 ring-2 ring-primary/50' 
            : ''
        } ${(isRecording || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isAutoMode ? 'Switch to Manual Mode' : 'Switch to Auto Mode'}
      >
        {isAutoMode ? (
          <Wand2 className="w-5 h-5 text-primary" />
        ) : (
          <Hand className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-white/10" />

      {/* Record Button */}
      {!isAutoMode && (
        <button
          onClick={isRecording || isWaitingForHands ? onStopRecording : onStartRecording}
          disabled={isProcessing}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
            isRecording 
              ? 'bg-destructive hover:bg-destructive/90 ring-4 ring-destructive/30' 
              : isWaitingForHands
              ? 'bg-google-yellow/20 ring-4 ring-google-yellow/30'
              : 'glass hover:bg-white/20'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          title={isRecording ? 'Stop Recording' : isWaitingForHands ? 'Cancel' : 'Start Recording'}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 text-foreground animate-spin" />
          ) : isRecording ? (
            <Square className="w-5 h-5 text-destructive-foreground fill-current" />
          ) : isWaitingForHands ? (
            <Hand className="w-5 h-5 text-google-yellow animate-pulse" />
          ) : (
            <Circle className="w-6 h-6 text-destructive fill-destructive" />
          )}
        </button>
      )}

      {/* Auto mode indicator */}
      {isAutoMode && (
        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
          isRecording 
            ? 'bg-destructive ring-4 ring-destructive/30' 
            : isProcessing
            ? 'glass'
            : 'glass border-2 border-dashed border-primary/50'
        }`}>
          {isProcessing ? (
            <Loader2 className="w-6 h-6 text-foreground animate-spin" />
          ) : isRecording ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse delay-75" />
              <div className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse delay-150" />
            </div>
          ) : (
            <Wand2 className="w-5 h-5 text-primary animate-pulse-soft" />
          )}
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-8 bg-white/10" />

      {/* Settings placeholder */}
      <button
        className="control-button opacity-50 cursor-not-allowed"
        title="Settings (Coming soon)"
        disabled
      >
        <Settings className="w-5 h-5 text-foreground" />
      </button>

      {/* Status text */}
      <div className="hidden sm:block ml-2 text-sm font-medium">
        {isProcessing ? (
          <span className="text-primary">Analyzing...</span>
        ) : isRecording ? (
          <span className="text-destructive">Recording</span>
        ) : isWaitingForHands ? (
          <span className="text-google-yellow">Show hands...</span>
        ) : isAutoMode ? (
          <span className="text-muted-foreground">Auto Mode</span>
        ) : (
          <span className="text-muted-foreground">Manual Mode</span>
        )}
      </div>
    </div>
  );
}
