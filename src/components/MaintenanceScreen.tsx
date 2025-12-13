import { Wrench, Clock } from 'lucide-react';
import { StarBackground } from '@/components/StarBackground';

interface MaintenanceScreenProps {
  message?: string;
}

export function MaintenanceScreen({ message = 'Sistema em manutenção. Voltamos em breve!' }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <StarBackground />
      
      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Animated wrench icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Wrench className="w-12 h-12 text-primary animate-bounce" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>Em breve</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Sistema em Manutenção
        </h1>

        {/* Message */}
        <p className="text-muted-foreground text-lg mb-8">
          {message}
        </p>

        {/* Progress indicator */}
        <div className="w-full max-w-xs mx-auto">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/50 rounded-full animate-pulse"
              style={{ 
                width: '60%',
                animation: 'pulse 2s ease-in-out infinite, shimmer 3s ease-in-out infinite'
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Estamos trabalhando para melhorar sua experiência
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Shark Cripto • Monitoramento de Arbitragem
          </p>
        </div>
      </div>
    </div>
  );
}
