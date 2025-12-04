import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useUserManagement, UserProfile } from '@/hooks/useUserManagement';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';
import { Users, UserCheck, UserX, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

type FilterStatus = 'all' | 'pending' | 'approved' | 'blocked';

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { users, stats, loading: usersLoading, updateUserStatus } = useUserManagement();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterStatus>('all');

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

  if (authLoading || adminLoading || usersLoading) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  const filteredUsers = filter === 'all' 
    ? users 
    : users.filter(u => u.status === filter);

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

  return (
    <div className="min-h-screen bg-background relative">
      <StarBackground />
      <DashboardHeader />
      
      <PageTransition>
        <main className="container mx-auto px-4 py-8 space-y-8 relative z-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gradient-gold">Administração de Usuários</h1>
            <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter('all')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:border-warning/50 transition-colors" onClick={() => setFilter('pending')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{stats.pending}</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:border-success/50 transition-colors" onClick={() => setFilter('approved')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                <UserCheck className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{stats.approved}</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => setFilter('blocked')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
                <UserX className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.blocked}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button 
              variant={filter === 'pending' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Pendentes
            </Button>
            <Button 
              variant={filter === 'approved' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('approved')}
            >
              Aprovados
            </Button>
            <Button 
              variant={filter === 'blocked' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('blocked')}
            >
              Bloqueados
            </Button>
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
                    Nenhum usuário encontrado
                  </p>
                ) : (
                  filteredUsers.map((userProfile: UserProfile) => (
                    <div 
                      key={userProfile.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
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
                        {getStatusBadge(userProfile.status)}
                        
                        <div className="flex gap-2">
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
                          {userProfile.status !== 'blocked' && (
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
        </main>
      </PageTransition>
    </div>
  );
};

export default AdminPage;
