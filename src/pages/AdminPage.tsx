import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useUserManagement, UserProfile, AdminAction } from '@/hooks/useUserManagement';
import { useCoinListings, CoinListing } from '@/hooks/useCoinListings';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, UserCheck, UserX, Clock, CheckCircle, XCircle, Rocket, AlertTriangle, Plus, Edit2, Trash2, Calendar, Coins, Shield, ShieldOff, Search, History } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type FilterStatus = 'all' | 'pending' | 'approved' | 'blocked';

interface AdminActionDialog {
  open: boolean;
  userId: string;
  userName: string;
  action: 'promote' | 'demote';
}

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { 
    users, 
    stats, 
    actionHistory, 
    loading: usersLoading, 
    historyLoading,
    fetchActionHistory,
    updateUserStatus, 
    promoteToAdmin, 
    demoteFromAdmin 
  } = useUserManagement();
  const { listings, newListings, delistings, addListing, updateListing, deleteListing } = useCoinListings();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin action confirmation dialog
  const [adminActionDialog, setAdminActionDialog] = useState<AdminActionDialog | null>(null);

  // Listing form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<CoinListing | null>(null);
  const [formData, setFormData] = useState({
    coin_name: '',
    pair_symbol: '',
    listing_type: 'new' as 'new' | 'delist',
    scheduled_date: '',
    scheduled_time: '',
  });

  const handleConfirmAdminAction = async () => {
    if (!adminActionDialog) return;
    
    if (adminActionDialog.action === 'promote') {
      await promoteToAdmin(adminActionDialog.userId);
    } else {
      await demoteFromAdmin(adminActionDialog.userId);
    }
    
    setAdminActionDialog(null);
  };

  const openAdminActionDialog = (userProfile: UserProfile, action: 'promote' | 'demote') => {
    setAdminActionDialog({
      open: true,
      userId: userProfile.id,
      userName: userProfile.full_name || userProfile.email || 'Usuário',
      action,
    });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  // Fetch action history when history tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      fetchActionHistory();
    }
  }, [activeTab, fetchActionHistory]);

  if (authLoading || adminLoading || usersLoading) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  // Filter users by status and search query
  const filteredUsers = users.filter(u => {
    const matchesStatus = filter === 'all' || u.status === filter;
    const matchesSearch = searchQuery === '' || 
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Aprovado</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Pendente</Badge>;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'approve': return 'Aprovou';
      case 'block': return 'Bloqueou';
      case 'set_pending': return 'Definiu como pendente';
      case 'promote': return 'Promoveu a admin';
      case 'demote': return 'Removeu admin';
      default: return actionType;
    }
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'approve': return 'bg-success/20 text-success border-success/30';
      case 'block': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'promote': return 'bg-gold/20 text-gold border-gold/30';
      case 'demote': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Listing functions
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

  return (
    <div className="min-h-screen bg-background relative">
      <StarBackground />
      <DashboardHeader />
      
      <PageTransition>
        <main className="container mx-auto px-4 py-8 space-y-8 relative z-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gradient-gold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários e listagens do sistema</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários
                <Badge variant="secondary" className="ml-1">{stats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="listings" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Listings
                <Badge variant="secondary" className="ml-1">{listings.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total', value: stats.total, icon: Users, color: '', filter: 'all' as FilterStatus },
                  { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-warning', filter: 'pending' as FilterStatus },
                  { label: 'Aprovados', value: stats.approved, icon: UserCheck, color: 'text-success', filter: 'approved' as FilterStatus },
                  { label: 'Bloqueados', value: stats.blocked, icon: UserX, color: 'text-destructive', filter: 'blocked' as FilterStatus },
                ].map((stat, index) => (
                  <Card 
                    key={stat.label}
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setFilter(stat.filter)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                      <stat.icon className={`h-4 w-4 ${stat.color || 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Admin Counter Card with Warning */}
                <Card 
                  className={`animate-fade-in ${stats.admins <= 1 ? 'border-destructive bg-destructive/5' : 'border-gold/30 bg-gold/5'}`}
                  style={{ animationDelay: '400ms' }}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Admins</CardTitle>
                    <Shield className={`h-4 w-4 ${stats.admins <= 1 ? 'text-destructive' : 'text-gold'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${stats.admins <= 1 ? 'text-destructive' : 'text-gold'}`}>
                      {stats.admins}
                    </div>
                    {stats.admins <= 1 && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Único admin!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'pending', 'approved', 'blocked'] as FilterStatus[]).map((f) => (
                    <Button 
                      key={f}
                      variant={filter === f ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilter(f)}
                    >
                      {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : 'Bloqueados'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {searchQuery ? 'Nenhum usuário encontrado com esse termo' : 'Nenhum usuário encontrado'}
                      </p>
                    ) : (
                      filteredUsers.map((userProfile: UserProfile, index) => (
                        <div 
                          key={userProfile.id} 
                          className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-all animate-fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold">
                              {(userProfile.full_name || userProfile.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{userProfile.full_name || 'Sem nome'}</p>
                              <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                              <p className="text-xs text-muted-foreground">
                                {userProfile.created_at 
                                  ? new Date(userProfile.created_at).toLocaleDateString('pt-BR')
                                  : 'Data desconhecida'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {userProfile.id === user?.id && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                            {userProfile.isAdmin && (
                              <Badge className="bg-gold/20 text-gold border-gold/30">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {getStatusBadge(userProfile.status)}
                            
                            <div className="flex gap-2">
                              {/* Toggle Admin - não permite remover a si mesmo */}
                              {userProfile.id !== user?.id && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={userProfile.isAdmin 
                                        ? "text-gold border-gold hover:bg-gold hover:text-gold-foreground" 
                                        : "text-muted-foreground border-border hover:bg-accent"
                                      }
                                      onClick={() => openAdminActionDialog(
                                        userProfile, 
                                        userProfile.isAdmin ? 'demote' : 'promote'
                                      )}
                                    >
                                      {userProfile.isAdmin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {userProfile.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              
                              {userProfile.status !== 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-success border-success hover:bg-success hover:text-success-foreground"
                                  onClick={() => updateUserStatus(userProfile.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {userProfile.status !== 'blocked' && userProfile.id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => updateUserStatus(userProfile.id, 'blocked')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AlertDialog para confirmação de ação de admin */}
              <AlertDialog 
                open={adminActionDialog?.open ?? false} 
                onOpenChange={(open) => !open && setAdminActionDialog(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {adminActionDialog?.action === 'promote' 
                        ? 'Promover a Administrador' 
                        : 'Remover Administrador'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {adminActionDialog?.action === 'promote'
                        ? `Tem certeza que deseja tornar "${adminActionDialog?.userName}" um administrador? Ele terá acesso total ao sistema de gerenciamento.`
                        : `Tem certeza que deseja remover as permissões de administrador de "${adminActionDialog?.userName}"?`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleConfirmAdminAction}
                      className={adminActionDialog?.action === 'demote' 
                        ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                        : 'bg-primary hover:bg-primary/90'
                      }
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Ações Administrativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>
                  ) : actionHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Nenhuma ação registrada ainda</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Administrador</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Usuário Alvo</TableHead>
                          <TableHead>Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {actionHistory.map((action: AdminAction) => (
                          <TableRow key={action.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(action.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{action.admin_name || 'Sem nome'}</p>
                                <p className="text-xs text-muted-foreground">{action.admin_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getActionBadgeVariant(action.action_type)}>
                                {getActionLabel(action.action_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{action.target_name || 'Sem nome'}</p>
                                <p className="text-xs text-muted-foreground">{action.target_email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {action.details || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Listings Tab */}
            <TabsContent value="listings" className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <Card className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-profit" />
                      <span className="text-sm font-medium">Novas: {newListings.length}</span>
                    </div>
                  </Card>
                  <Card className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-medium">Delistings: {delistings.length}</span>
                    </div>
                  </Card>
                </div>
                
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Nova Listagem
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingListing ? 'Editar Listagem' : 'Nova Listagem'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="listing_type">Tipo</Label>
                        <Select
                          value={formData.listing_type}
                          onValueChange={(value: 'new' | 'delist') => 
                            setFormData({ ...formData, listing_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Nova Listagem</SelectItem>
                            <SelectItem value="delist">Delisting</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="coin_name">Nome da Moeda</Label>
                        <Input
                          id="coin_name"
                          value={formData.coin_name}
                          onChange={(e) => setFormData({ ...formData, coin_name: e.target.value })}
                          placeholder="Ex: Bitcoin"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pair_symbol">Par</Label>
                        <Input
                          id="pair_symbol"
                          value={formData.pair_symbol}
                          onChange={(e) => setFormData({ ...formData, pair_symbol: e.target.value })}
                          placeholder="Ex: BTCUSDT"
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
                            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="scheduled_time">Horário</Label>
                          <Input
                            id="scheduled_time"
                            type="time"
                            value={formData.scheduled_time}
                            onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button type="submit">
                          {editingListing ? 'Salvar' : 'Criar'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Listagens Agendadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Moeda</TableHead>
                        <TableHead>Par</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhuma listagem agendada
                          </TableCell>
                        </TableRow>
                      ) : (
                        listings.map((listing) => (
                          <TableRow key={listing.id}>
                            <TableCell>
                              {listing.listing_type === 'new' ? (
                                <Badge className="bg-profit/20 text-profit">
                                  <Rocket className="w-3 h-3 mr-1" />
                                  Nova
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Delist
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{listing.coin_name}</TableCell>
                            <TableCell>{listing.pair_symbol}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {formatDateTime(listing.scheduled_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isScheduledPassed(listing.scheduled_date) ? (
                                <Badge variant="secondary">Realizado</Badge>
                              ) : (
                                <Badge className="bg-warning/20 text-warning">Agendado</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(listing)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleDelete(listing.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </PageTransition>
    </div>
  );
};

export default AdminPage;
