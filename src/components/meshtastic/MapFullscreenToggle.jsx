import { useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

// Renders a fullscreen toggle button positioned over a Leaflet map container.
// The parent decides what "fullscreen" means by toggling a CSS class.
export default function MapFullscreenToggle({ isFullscreen, onToggle }) {
  // Allow ESC to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onToggle(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, onToggle]);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(!isFullscreen); }}
      className="absolute top-2 right-2 z-[1000] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1.5 shadow-md transition-colors"
      title={isFullscreen ? 'Vollbild verlassen (Esc)' : 'Vollbild'}
      aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
      ) : (
        <Maximize2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
      )}
    </button>
  );
}