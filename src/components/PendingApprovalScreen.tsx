import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarBackground } from '@/components/StarBackground';
import { SharkCriptoLogo } from '@/components/SharkCriptoLogo';

export function PendingApprovalScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarBackground />
      <Card className="max-w-md w-full bg-gradient-card border-border/50 relative z-10">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <SharkCriptoLogo className="w-16 h-16" />
          </div>
          
          <div className="w-20 h-20 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-warning animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Aguardando Aprovação</h2>
            <p className="text-muted-foreground">
              Sua conta foi criada com sucesso e está sendo analisada. 
              Um administrador aprovará seu acesso em breve.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-accent/30 border border-border/50">
            <p className="text-sm text-muted-foreground">
              Você receberá acesso completo ao sistema assim que sua conta for aprovada.
              Por favor, aguarde ou entre em contato com o administrador.
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={signOut}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
