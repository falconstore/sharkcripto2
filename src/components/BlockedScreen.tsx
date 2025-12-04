import { XCircle, LogOut, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarBackground } from '@/components/StarBackground';
import { SharkCriptoLogo } from '@/components/SharkCriptoLogo';

export function BlockedScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarBackground />
      <Card className="max-w-md w-full bg-gradient-card border-border/50 relative z-10">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <SharkCriptoLogo className="w-16 h-16" />
          </div>
          
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Acesso Bloqueado</h2>
            <p className="text-muted-foreground">
              Sua conta foi bloqueada pelo administrador do sistema.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-muted-foreground">
              Se você acredita que isso é um erro, entre em contato com o 
              administrador para solicitar uma revisão do seu acesso.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={signOut}
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = 'mailto:suporte@sharkcripto.com'}
            >
              <Mail className="w-4 h-4 mr-2" />
              Contato
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
