import { Period } from '@/hooks/useStatistics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Filter } from 'lucide-react';
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
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Select value={period} onValueChange={(value) => onPeriodChange(value as Period)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15min">15 minutos</SelectItem>
                <SelectItem value="30min">30 minutos</SelectItem>
                <SelectItem value="1h">1 hora</SelectItem>
                <SelectItem value="3h">3 horas</SelectItem>
                <SelectItem value="24h">24 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limpar filtros */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPeriodChange('24h')}
          >
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsFilters;
