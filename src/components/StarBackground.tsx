import { useMemo } from 'react';

export function StarBackground() {
  const stars = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${2 + Math.random() * 3}s`,
      size: Math.random() > 0.7 ? 'w-1.5 h-1.5' : 'w-1 h-1',
    })),
    []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 transition-colors duration-500" />
      
      {/* Glow orbs flutuantes */}
      <div 
        className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float"
      />
      <div 
        className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '-2s' }}
      />
      <div 
        className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '-4s' }}
      />
      
      {/* Estrelas/partículas */}
      {stars.map((star) => (
        <div
          key={star.id}
          className={`absolute ${star.size} bg-primary/40 rounded-full animate-pulse-glow`}
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}
      
      {/* Grid pattern sutil */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
