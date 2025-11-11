import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight, BarChart3, Zap, Shield } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto animate-slide-up">
          <div className="inline-flex items-center gap-3 mb-6">
            <TrendingUp className="w-16 h-16 text-gold" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Arbitragem MEXC
            <span className="block text-gold mt-2">em Tempo Real</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-secondary-foreground/90 mb-8 max-w-2xl mx-auto">
            Monitore oportunidades lucrativas entre mercados Spot e Futuros com dados em tempo real e alertas inteligentes
          </p>

          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gold hover:bg-gold/90 text-gold-foreground text-lg px-8 py-6 hover-lift"
            >
              Começar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="text-white border-white/20 hover:bg-white/10 text-lg px-8 py-6"
            >
              Ver Demo
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="bg-card/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover-lift">
            <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-gold" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Dados em Tempo Real</h3>
            <p className="text-secondary-foreground/80">
              Conexão direta aos websockets da MEXC para capturar oportunidades instantaneamente
            </p>
          </div>

          <div className="bg-card/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover-lift">
            <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-gold" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Análise Avançada</h3>
            <p className="text-secondary-foreground/80">
              Cálculo automático de spreads líquidos com taxas de trading incluídas
            </p>
          </div>

          <div className="bg-card/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover-lift">
            <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-gold" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Interface Profissional</h3>
            <p className="text-secondary-foreground/80">
              Dashboard intuitivo com heatmaps, filtros avançados e alertas personalizados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
