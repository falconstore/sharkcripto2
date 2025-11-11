-- Create table for MEXC operations history
CREATE TABLE IF NOT EXISTS public.mexc_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_symbol TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('ENTRY', 'EXIT')),
  quantity DECIMAL(20, 8) NOT NULL,
  spot_price DECIMAL(20, 8) NOT NULL,
  futures_price DECIMAL(20, 8) NOT NULL,
  spread_percent DECIMAL(10, 4) NOT NULL,
  total_value DECIMAL(20, 2) NOT NULL,
  spot_order_id TEXT,
  futures_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'simulated')),
  simulation BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mexc_operations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own operations"
ON public.mexc_operations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own operations"
ON public.mexc_operations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_mexc_operations_user_id ON public.mexc_operations(user_id);
CREATE INDEX idx_mexc_operations_created_at ON public.mexc_operations(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_mexc_operations_updated_at
BEFORE UPDATE ON public.mexc_operations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();