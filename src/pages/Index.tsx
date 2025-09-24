import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/ui/gaming-login';

const Index = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    const { error } = await signIn(email, password);
    if (error) {
      console.error('Login failed:', error);
    }
  };

  const handleSignup = async (email: string, password: string, name?: string) => {
    const { error } = await signUp(email, password, name);
    if (error) {
      console.error('Signup failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12">
      <LoginPage.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

      <div className="relative z-20 w-full max-w-md animate-fadeIn">
        <LoginPage.LoginForm 
          onSubmit={handleLogin}
          onSignup={handleSignup}
        />
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm z-20">
        © 2025 B2X Marketing. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default Index;
