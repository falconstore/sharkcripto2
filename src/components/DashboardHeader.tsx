import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { usePreferences } from '@/hooks/usePreferences';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, LogOut, TrendingUp, BarChart3, Bell, Ban, Target, Wallet, ListChecks, Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationSettings from './NotificationSettings';
import BlacklistManager from './BlacklistManager';
import SpreadAlertsManager from './SpreadAlertsManager';
import BankrollManager from './BankrollManager';
import { useSpreadAlerts } from '@/hooks/useSpreadAlerts';
import { Separator } from '@/components/ui/separator';

const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { blacklist } = usePreferences();
  const { alerts } = useSpreadAlerts();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [bankrollOpen, setBankrollOpen] = useState(false);

  const isActivePath = (path: string) => location.pathname === path;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo e Navegação Principal */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <TrendingUp className="w-8 h-8 text-gold" />
              <div>
                <h1 className="text-xl font-bold">Shark Cripto</h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block">Monitoramento em Tempo Real</p>
              </div>
            </div>

            <Separator orientation="vertical" className="h-8 hidden md:block" />

            {/* Navegação Principal */}
            <nav className="hidden md:flex items-center gap-1">
              <Button
                variant={isActivePath('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className={isActivePath('/dashboard') ? 'bg-primary' : ''}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Monitoramento
              </Button>

              <Button
                variant={isActivePath('/listings') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/listings')}
                className={isActivePath('/listings') ? 'bg-primary' : ''}
              >
                <ListChecks className="w-4 h-4 mr-2" />
                Listagem
                {isAdmin && (
                  <Shield className="w-3 h-3 ml-1 text-gold" />
                )}
              </Button>

              <Button
                variant={isActivePath('/statistics') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/statistics')}
                className={isActivePath('/statistics') ? 'bg-primary' : ''}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Estatísticas
              </Button>
            </nav>
          </div>

          {/* Ferramentas e Usuário */}
          <div className="flex items-center gap-2">
            {/* Ferramentas */}
            <div className="hidden sm:flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAlertsOpen(true)} 
                className="relative"
              >
                <Target className="w-4 h-4 mr-2" />
                Alertas
                {alerts.length > 0 && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-gold"
                  >
                    {alerts.length}
                  </Badge>
                )}
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setBlacklistOpen(true)} 
                className="relative"
              >
                <Ban className="w-4 h-4 mr-2" />
                Blacklist
                {blacklist.size > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {blacklist.size}
                  </Badge>
                )}
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setBankrollOpen(true)}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Banca
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* Configurações */}
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
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>

            {/* Usuário */}
            {user && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block">
                    <span className="text-sm font-medium">
                      {user.email?.split('@')[0]}
                    </span>
                    {isAdmin && (
                      <Badge variant="outline" className="ml-2 text-[10px] bg-gold/20 text-gold border-gold/30">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={signOut} 
                  title="Sair" 
                  className="hover:text-destructive-foreground hover:bg-destructive/10"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Navegação Mobile */}
        <nav className="flex md:hidden items-center justify-center gap-2 mt-3 pt-3 border-t border-border">
          <Button
            variant={isActivePath('/dashboard') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <TrendingUp className="w-4 h-4" />
          </Button>

          <Button
            variant={isActivePath('/listings') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/listings')}
          >
            <ListChecks className="w-4 h-4" />
          </Button>

          <Button
            variant={isActivePath('/statistics') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/statistics')}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={() => setAlertsOpen(true)}>
            <Target className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setBlacklistOpen(true)}>
            <Ban className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setBankrollOpen(true)}>
            <Wallet className="w-4 h-4" />
          </Button>
        </nav>
      </div>

      <NotificationSettings open={notificationSettingsOpen} onOpenChange={setNotificationSettingsOpen} />
      <SpreadAlertsManager open={alertsOpen} onOpenChange={setAlertsOpen} />
      <BlacklistManager open={blacklistOpen} onOpenChange={setBlacklistOpen} />
      <BankrollManager open={bankrollOpen} onOpenChange={setBankrollOpen} />
    </header>
  );
};

export default DashboardHeader;
