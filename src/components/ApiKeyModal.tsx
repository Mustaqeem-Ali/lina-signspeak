import { useState } from 'react';
import { Key, ExternalLink, X, Eye, EyeOff } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      setApiKey('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md float-card animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground font-display">
                API Key Required
              </h2>
              <p className="text-sm text-muted-foreground">
                Connect to Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-4">
            LINA uses Google's Gemini AI to translate sign language. 
            You'll need a free API key to get started.
          </p>
          
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-4"
          >
            Get your free API key
            <ExternalLink className="w-4 h-4" />
          </a>

          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-4 py-3 pr-12 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Continue
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center">
          Your API key is stored locally and never shared.
        </p>
      </div>
    </div>
  );
}
