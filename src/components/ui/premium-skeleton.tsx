import { cn } from "@/lib/utils";

interface PremiumSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
}

export function PremiumSkeleton({ 
  className, 
  variant = 'default',
  ...props 
}: PremiumSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md",
        "bg-gradient-to-r from-muted/60 via-primary/5 to-muted/60",
        "border border-primary/10",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-primary/20 before:to-transparent",
        "before:animate-shimmer before:bg-[length:200%_100%]",
        variant === 'circular' && "rounded-full",
        variant === 'text' && "h-4 rounded",
        className
      )}
      {...props}
    />
  );
}

export function LogoSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <PremiumSkeleton className="h-10 w-10" variant="circular" />
        <div 
          className="absolute inset-0 rounded-full animate-pulse-glow opacity-30"
          style={{
            background: "radial-gradient(circle, hsl(38 92% 50% / 0.4) 0%, transparent 70%)",
          }}
        />
      </div>
      <PremiumSkeleton className="h-6 w-24" />
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <PremiumSkeleton className="h-4 w-24" variant="text" />
        <PremiumSkeleton className="h-10 w-10" variant="circular" />
      </div>
      <div className="space-y-2">
        <PremiumSkeleton className="h-8 w-32" />
        <PremiumSkeleton className="h-3 w-20" variant="text" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/50">
      <PremiumSkeleton className="h-6 w-16" />
      <PremiumSkeleton className="h-6 w-24" />
      <PremiumSkeleton className="h-6 w-28 flex-1" />
      <PremiumSkeleton className="h-6 w-20" variant="rectangular" />
    </div>
  );
}
