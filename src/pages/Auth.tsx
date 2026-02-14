import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { APP_CONFIG } from '@/config/app';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{APP_CONFIG.system.name}</h1>
          <p className="text-muted-foreground mt-2">
            Sistema Integrado de Gestão
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
