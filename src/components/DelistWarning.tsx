import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DelistWarningProps {
  scheduledDate: string;
  className?: string;
}

const DelistWarning = ({ scheduledDate, className }: DelistWarningProps) => {
  const formattedDate = format(new Date(scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex cursor-help ${className}`}>
          <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="bg-warning/90 text-warning-foreground border-warning">
        <div className="text-sm">
          <p className="font-semibold">⚠️ Deslistagem Programada</p>
          <p>{formattedDate}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default DelistWarning;
