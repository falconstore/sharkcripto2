import { cn } from "@/lib/utils";

interface SharkCriptoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function SharkCriptoLogo({ size = 40, className, showText = true }: SharkCriptoLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        className="transition-all duration-300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sharkGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
            <stop offset="50%" stopColor="hsl(32, 95%, 52%)" />
            <stop offset="100%" stopColor="hsl(24, 100%, 50%)" />
          </linearGradient>
          <linearGradient id="sharkGoldGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(38, 92%, 60%)" />
            <stop offset="100%" stopColor="hsl(24, 100%, 55%)" />
          </linearGradient>
          <filter id="sharkGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hexagon background */}
        <path
          d="M24 4 L42 14 L42 34 L24 44 L6 34 L6 14 Z"
          fill="url(#sharkGoldGradient)"
          opacity="0.12"
          stroke="url(#sharkGoldGradient)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Inner hexagon accent */}
        <path
          d="M24 10 L36 17 L36 31 L24 38 L12 31 L12 17 Z"
          fill="none"
          stroke="url(#sharkGoldGradientLight)"
          strokeWidth="0.5"
          opacity="0.4"
        />

        {/* Shark fin silhouette */}
        <path
          d="M16 28 Q18 20 24 16 Q26 20 28 22 L32 28 Q28 30 24 30 Q20 30 16 28 Z"
          fill="url(#sharkGoldGradient)"
          filter="url(#sharkGlow)"
        />
        
        {/* Wave line */}
        <path
          d="M10 32 Q16 30 24 32 Q32 34 38 32"
          fill="none"
          stroke="url(#sharkGoldGradientLight)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      
      {showText && (
        <span className="text-gradient-gold font-bold text-xl tracking-tight">
          Shark Cripto
        </span>
      )}
    </div>
  );
}

export function SharkCriptoLogoAnimated({ size = 40, className, showText = true }: SharkCriptoLogoProps) {
  return (
    <div className={cn("relative flex items-center gap-3", className)}>
      <div className="relative">
        <SharkCriptoLogo size={size} showText={false} className="relative z-10" />
        {/* Animated glow ring */}
        <div 
          className="absolute inset-0 rounded-full animate-pulse-glow opacity-50"
          style={{
            background: "radial-gradient(circle, hsl(38 92% 50% / 0.3) 0%, transparent 70%)",
          }}
        />
      </div>
      {showText && (
        <span className="text-gradient-gold font-bold text-xl tracking-tight">
          Shark Cripto
        </span>
      )}
    </div>
  );
}
