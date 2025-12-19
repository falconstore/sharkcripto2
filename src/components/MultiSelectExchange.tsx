import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { getExchangeColor } from '@/hooks/useExternalArbitrage';
import { cn } from '@/lib/utils';

interface MultiSelectExchangeProps {
  label: string;
  selectedExchanges: string[];
  availableExchanges: string[];
  onSelectionChange: (exchanges: string[]) => void;
  className?: string;
}

export const MultiSelectExchange = ({
  label,
  selectedExchanges,
  availableExchanges,
  onSelectionChange,
  className
}: MultiSelectExchangeProps) => {
  const toggleExchange = (exchange: string) => {
    if (selectedExchanges.includes(exchange)) {
      onSelectionChange(selectedExchanges.filter(e => e !== exchange));
    } else {
      onSelectionChange([...selectedExchanges, exchange]);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    onSelectionChange([...availableExchanges]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("h-8 text-sm justify-between min-w-[120px]", className)}
        >
          <span className="truncate">
            {selectedExchanges.length === 0 
              ? `${label}: Todas` 
              : selectedExchanges.length === 1 
                ? selectedExchanges[0].toUpperCase()
                : `${selectedExchanges.length} selecionadas`
            }
          </span>
          <ChevronDown className="w-4 h-4 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b border-border flex justify-between items-center">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAll}>
              Todas
            </Button>
            {selectedExchanges.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearAll}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="p-2 max-h-60 overflow-y-auto space-y-1">
          {availableExchanges.map(exchange => {
            const colors = getExchangeColor(exchange);
            const isSelected = selectedExchanges.includes(exchange);
            
            return (
              <div
                key={exchange}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                  isSelected ? "bg-primary/10" : "hover:bg-accent/50"
                )}
                onClick={() => toggleExchange(exchange)}
              >
                <Checkbox 
                  checked={isSelected}
                  className="pointer-events-none"
                />
                <Badge 
                  variant="outline" 
                  className={cn(
                    `${colors.bg} ${colors.text} ${colors.border} text-xs font-semibold`,
                    isSelected && "ring-2 ring-primary/50"
                  )}
                >
                  {exchange.toUpperCase()}
                </Badge>
              </div>
            );
          })}
        </div>
        {selectedExchanges.length > 0 && (
          <div className="p-2 border-t border-border">
            <div className="flex flex-wrap gap-1">
              {selectedExchanges.map(exchange => {
                const colors = getExchangeColor(exchange);
                return (
                  <Badge 
                    key={exchange}
                    variant="outline" 
                    className={`${colors.bg} ${colors.text} ${colors.border} text-xs cursor-pointer`}
                    onClick={() => toggleExchange(exchange)}
                  >
                    {exchange.toUpperCase()}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelectExchange;
