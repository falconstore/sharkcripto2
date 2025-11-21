import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { usePreferences } from '@/hooks/usePreferences';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, LogOut, TrendingUp, BarChart3, Bell, Ban, Target, Wallet, Home } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationSettings from './NotificationSettings';
import BlacklistManager from './BlacklistManager';
import SpreadAlertsManager from './SpreadAlertsManager';
import BankrollManager from './BankrollManager';
import { useSpreadAlerts } from '@/hooks/useSpreadAlerts';

const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { blacklist } = usePreferences();
  const { alerts } = useSpreadAlerts();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [bankrollOpen, setBankrollOpen] = useState(false);
  
  const isStatisticsPage = location.pathname === '/statistics';

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
            {isStatisticsPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex"
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/statistics')}
                className="hidden sm:flex"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Estatísticas
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertsOpen(true)}
              className="hidden sm:flex relative"
            >
              <Target className="w-4 h-4 mr-2" />
              Alertas
              {alerts.length > 0 && (
                <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-gold">
                  {alerts.length}
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlacklistOpen(true)}
              className="hidden sm:flex relative"
            >
              <Ban className="w-4 h-4 mr-2" />
              Blacklist
              {blacklist.size > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {blacklist.size}
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setBankrollOpen(true)}
              className="hidden sm:flex"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Banca
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
      
      <SpreadAlertsManager
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
      />
      
      <BlacklistManager
        open={blacklistOpen}
        onOpenChange={setBlacklistOpen}
      />
      
      <BankrollManager
        open={bankrollOpen}
        onOpenChange={setBankrollOpen}
      />
    </header>
  );
};

export default DashboardHeader;