import { SharkCriptoLogo } from "@/components/SharkCriptoLogo";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo with spinning ring */}
        <div className="relative">
          <SharkCriptoLogo size={80} showText={false} className="relative z-10" />
          
          {/* Spinning golden ring */}
          <svg
            className="absolute -inset-3 w-[104px] h-[104px] animate-spin"
            style={{ animationDuration: "3s" }}
            viewBox="0 0 104 104"
          >
            <defs>
              <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
                <stop offset="100%" stopColor="hsl(24, 100%, 50%)" />
              </linearGradient>
            </defs>
            <circle
              cx="52"
              cy="52"
              r="48"
              fill="none"
              stroke="url(#loadingGradient)"
              strokeWidth="2"
              strokeDasharray="100 200"
              strokeLinecap="round"
              opacity="0.8"
            />
          </svg>

          {/* Outer glow */}
          <div 
            className="absolute -inset-6 rounded-full animate-pulse-glow opacity-30"
            style={{
              background: "radial-gradient(circle, hsl(38 92% 50% / 0.5) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Brand text */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gradient-gold">
            Shark Cripto
          </h1>
          <p className="text-sm text-muted-foreground">
            Carregando...
          </p>
        </div>

        {/* Shimmer progress bar */}
        <div className="w-48 h-1 bg-muted/50 rounded-full overflow-hidden">
          <div 
            className="h-full w-full rounded-full animate-shimmer"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(38 92% 50%), transparent)",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
