import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, TrendingUp, BarChart3, Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import NotificationSettings from './NotificationSettings';

const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-gold" />
              <div>
                <h1 className="text-2xl font-bold">MEXC Arbitragem</h1>
                <p className="text-xs text-muted-foreground">Monitoramento em Tempo Real</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/statistics')}
              className="hidden sm:flex"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Estatísticas
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setNotificationSettingsOpen(true)}
              title="Configurações de notificação"
            >
              <Bell className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="hover-gold"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>

            {user && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">
                    {user.email}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={signOut}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <NotificationSettings
        open={notificationSettingsOpen}
        onOpenChange={setNotificationSettingsOpen}
      />
    </header>
  );
};

export default DashboardHeader;