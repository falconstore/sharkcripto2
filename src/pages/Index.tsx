import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Zap, Shield } from 'lucide-react';
import { SharkCriptoLogo } from '@/components/SharkCriptoLogo';
import { StarBackground } from '@/components/StarBackground';
import { TypewriterText } from '@/components/TypewriterText';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <StarBackground />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
          <div className="flex justify-center mb-6">
            <SharkCriptoLogo size={80} showText={false} className="animate-float" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient-gold">
              <TypewriterText text="Shark Cripto" speed={100} />
            </span>
            <span className="block text-foreground mt-2">Arbitragem em Tempo Real</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Monitore oportunidades lucrativas entre mercados Spot e Futuros com dados em tempo real e alertas inteligentes
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6"
            >
              Começar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="text-lg px-8 py-6"
            >
              Ver Demo
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Dados em Tempo Real</h3>
            <p className="text-muted-foreground">
              Conexão direta aos websockets da MEXC para capturar oportunidades instantaneamente
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Análise Avançada</h3>
            <p className="text-muted-foreground">
              Cálculo automático de spreads líquidos com taxas de trading incluídas
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Interface Profissional</h3>
            <p className="text-muted-foreground">
              Dashboard intuitivo com heatmaps, filtros avançados e alertas personalizados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
