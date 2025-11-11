import { Period } from '@/hooks/useStatistics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StatisticsFiltersProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  customStart?: Date;
  customEnd?: Date;
  onCustomStartChange: (date?: Date) => void;
  onCustomEndChange: (date?: Date) => void;
  filterCoins: string[];
  onFilterCoinsChange: (coins: string[]) => void;
}

const StatisticsFilters = ({
  period,
  onPeriodChange,
}: StatisticsFiltersProps) => {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          {/* Período */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={period} onValueChange={(value) => onPeriodChange(value as Period)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje (24h)</SelectItem>
                <SelectItem value="week">Esta Semana (7d)</SelectItem>
                <SelectItem value="month">Este Mês (30d)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limpar filtros */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPeriodChange('today')}
          >
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsFilters;
