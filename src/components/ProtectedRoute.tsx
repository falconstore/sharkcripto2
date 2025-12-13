import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PendingApprovalScreen } from '@/components/PendingApprovalScreen';
import { BlockedScreen } from '@/components/BlockedScreen';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { status, loading: statusLoading } = useUserStatus();
  const { isMaintenanceMode, message, loading: maintenanceLoading } = useMaintenanceMode();

  // Show loading while checking auth state
  if (authLoading || statusLoading || adminLoading || maintenanceLoading) {
    return <LoadingScreen />;
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admins always have access (bypass maintenance mode)
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check maintenance mode BEFORE user status (non-admins see maintenance)
  if (isMaintenanceMode) {
    return <MaintenanceScreen message={message} />;
  }

  // Check user status
  if (status === 'pending') {
    return <PendingApprovalScreen />;
  }

  if (status === 'blocked') {
    return <BlockedScreen />;
  }

  // Approved users can access
  return <>{children}</>;
}
