import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Edit2, AlertTriangle, Rocket, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useCoinListings, CoinListing } from '@/hooks/useCoinListings';
import DashboardHeader from '@/components/DashboardHeader';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';

const ListingsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { newListings, delistings, loading, addListing, updateListing, deleteListing } = useCoinListings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<CoinListing | null>(null);
  const [formData, setFormData] = useState({
    coin_name: '',
    pair_symbol: '',
    listing_type: 'new' as 'new' | 'delist',
    scheduled_date: '',
    scheduled_time: '',
  });

  // Show loading while checking auth and admin status
  if (authLoading || adminLoading) {
    return <LoadingScreen />;
  }

  // Redirect if not authenticated
  if (!user) {
    navigate('/auth');
    return null;
  }

  const resetForm = () => {
    setFormData({
      coin_name: '',
      pair_symbol: '',
      listing_type: 'new',
      scheduled_date: '',
      scheduled_time: '',
    });
    setEditingListing(null);
  };

  const openEditDialog = (listing: CoinListing) => {
    const date = new Date(listing.scheduled_date);
    setEditingListing(listing);
    setFormData({
      coin_name: listing.coin_name,
      pair_symbol: listing.pair_symbol,
      listing_type: listing.listing_type as 'new' | 'delist',
      scheduled_date: date.toISOString().split('T')[0],
      scheduled_time: date.toTimeString().slice(0, 5),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const scheduledDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00`;
    
    if (editingListing) {
      const success = await updateListing(editingListing.id, {
        coin_name: formData.coin_name,
        pair_symbol: formData.pair_symbol.toUpperCase(),
        listing_type: formData.listing_type,
        scheduled_date: scheduledDateTime,
      });

      if (success) {
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const success = await addListing({
        coin_name: formData.coin_name,
        pair_symbol: formData.pair_symbol.toUpperCase(),
        listing_type: formData.listing_type,
        scheduled_date: scheduledDateTime,
      });

      if (success) {
        setDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta listagem?')) {
      await deleteListing(id);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const isScheduledPassed = (dateString: string) => {
    return new Date(dateString) <= new Date();
  };

  const ListingTable = ({ listings, type }: { listings: CoinListing[], type: 'new' | 'delist' }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Moeda</TableHead>
          <TableHead>Par</TableHead>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead className="w-[120px]">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
              Nenhuma {type === 'new' ? 'listagem' : 'deslistagem'} encontrada
            </TableCell>
          </TableRow>
        ) : (
          listings.map((listing, index) => (
            <TableRow 
              key={listing.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TableCell className="font-medium">{listing.coin_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {listing.pair_symbol}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{formatDateTime(listing.scheduled_date)}</span>
                </div>
              </TableCell>
              <TableCell>
                {isScheduledPassed(listing.scheduled_date) ? (
                  <Badge className={type === 'new' ? 'bg-profit text-profit-foreground' : 'bg-destructive'}>
                    {type === 'new' ? 'Listada' : 'Deslistada'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-warning/20 text-warning-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    Agendada
                  </Badge>
                )}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(listing)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(listing.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background relative">
      <StarBackground />
      <DashboardHeader />
      
      <PageTransition>
        <main className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gradient-gold">Listagem / Deslistagem</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie as moedas listadas e deslistadas do sistema
                </p>
              </div>
            </div>

            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingListing ? 'Editar Listagem' : 'Adicionar Listagem/Deslistagem'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="listing_type">Tipo</Label>
                      <Select
                        value={formData.listing_type}
                        onValueChange={(value: 'new' | 'delist') => 
                          setFormData(prev => ({ ...prev, listing_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">
                            <div className="flex items-center gap-2">
                              <Rocket className="w-4 h-4 text-profit" />
                              Nova Listagem
                            </div>
                          </SelectItem>
                          <SelectItem value="delist">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                              Deslistagem
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coin_name">Nome da Moeda</Label>
                      <Input
                        id="coin_name"
                        value={formData.coin_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, coin_name: e.target.value }))}
                        placeholder="Ex: Bitcoin"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pair_symbol">Par</Label>
                      <Input
                        id="pair_symbol"
                        value={formData.pair_symbol}
                        onChange={(e) => setFormData(prev => ({ ...prev, pair_symbol: e.target.value }))}
                        placeholder="Ex: BTC_USDT"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduled_date">Data</Label>
                        <Input
                          id="scheduled_date"
                          type="date"
                          value={formData.scheduled_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduled_time">Horário</Label>
                        <Input
                          id="scheduled_time"
                          type="time"
                          value={formData.scheduled_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-gradient-primary">
                        {editingListing ? 'Salvar' : 'Adicionar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Tabs defaultValue="new" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                Novas Listagens
                {newListings.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {newListings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="delist" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Deslistagens
                {delistings.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {delistings.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-profit" />
                    Novas Listagens de Moedas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ListingTable listings={newListings} type="new" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delist">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Deslistagens Programadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ListingTable listings={delistings} type="delist" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </PageTransition>
    </div>
  );
};

export default ListingsPage;
