import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Volume2, Bell } from 'lucide-react';

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationSettings = ({ open, onOpenChange }: NotificationSettingsProps) => {
  const {
    enabled,
    soundEnabled,
    volume,
    soundType,
    toggleEnabled,
    toggleSoundEnabled,
    setVolume,
    setSoundType,
  } = useNotificationSettings();

  const testSound = () => {
    const audio = new Audio(`/sounds/${soundType}.mp3`);
    audio.volume = volume / 100;
    audio.play().catch(err => console.log('Erro ao testar som:', err));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Configurações de Notificações
          </DialogTitle>
          <DialogDescription>
            Configure as notificações de cruzamento para moedas favoritadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Ativar notificações */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="text-base">
                Ativar notificações
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas quando moedas favoritadas cruzarem
              </p>
            </div>
            <Switch
              id="notifications"
              checked={enabled}
              onCheckedChange={toggleEnabled}
            />
          </div>

          {/* Som de alerta */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound" className="text-base">
                Som de alerta
              </Label>
              <p className="text-sm text-muted-foreground">
                Tocar som quando receber notificação
              </p>
            </div>
            <Switch
              id="sound"
              checked={soundEnabled}
              onCheckedChange={toggleSoundEnabled}
              disabled={!enabled}
            />
          </div>

          {/* Volume */}
          {soundEnabled && enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="volume" className="text-base flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Volume
                </Label>
                <span className="text-sm text-muted-foreground">{volume}%</span>
              </div>
              <Slider
                id="volume"
                min={0}
                max={100}
                step={10}
                value={[volume]}
                onValueChange={(value) => setVolume(value[0])}
                className="w-full"
              />
            </div>
          )}

          {/* Tipo de som */}
          {soundEnabled && enabled && (
            <div className="space-y-3">
              <Label className="text-base">Tipo de som</Label>
              <RadioGroup value={soundType} onValueChange={(value) => setSoundType(value as 'notification' | 'alert')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="notification" id="notification" />
                  <Label htmlFor="notification" className="font-normal cursor-pointer">
                    Notificação (suave)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alert" id="alert" />
                  <Label htmlFor="alert" className="font-normal cursor-pointer">
                    Alerta (forte)
                  </Label>
                </div>
              </RadioGroup>
              <Button
                variant="outline"
                size="sm"
                onClick={testSound}
                className="w-full"
              >
                Testar som
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettings;
