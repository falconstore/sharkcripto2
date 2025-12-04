import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface NewCoinBadgeProps {
  className?: string;
}

const NewCoinBadge = ({ className }: NewCoinBadgeProps) => {
  return (
    <Badge 
      variant="outline" 
      className={`text-[10px] px-1 py-0 h-4 bg-profit/20 text-profit border-profit/30 animate-pulse ${className}`}
    >
      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
      NEW
    </Badge>
  );
};

export default NewCoinBadge;
