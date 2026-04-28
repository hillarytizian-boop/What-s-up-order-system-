import { cn } from '../../utils/cn';

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl overflow-hidden shadow-sm", className)}>
      <div className="h-36 bg-gray-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse mt-2" />
      </div>
    </div>
  );
}

export default SkeletonCard;
