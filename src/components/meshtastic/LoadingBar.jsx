import { Progress } from '@/components/ui/progress';

export default function LoadingBar({ connected, isLoading }) {
  if (!connected || !isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 w-full bg-transparent">
        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
      </div>
      <div className="px-4 py-2 bg-blue-50 dark:bg-slate-800 border-b text-center">
        <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
          ⚡ Empfange Daten...
        </span>
      </div>
    </div>
  );
}