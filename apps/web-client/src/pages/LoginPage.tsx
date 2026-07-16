import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { FormEngine } from '@/components/FormEngine';
import { useAuthStore } from '@/stores/authStore';
import { useLogin } from '@/hooks/useApi';
import { notify } from '@/lib/toast';

const loginSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(8, 'Minimum 8 characters').required('Password is required'),
});

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLogin();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-xl font-bold text-brand-accent shadow-glow mx-auto mb-4">
            V
          </span>
          <h1 className="text-2xl font-bold text-content">Welcome back</h1>
          <p className="text-mist mt-1">Sign in to your VividCraft account</p>
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <FormEngine
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            fields={[
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@vividcraft.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            ]}
            submitLabel="Sign In"
            onSubmit={async (values) => {
              try {
                const data = await loginMutation.mutateAsync(values);
                setAuth(data.user, data.accessToken, data.refreshToken);
                notify.success(`Welcome back, ${data.user.name}!`);
                navigate('/');
              } catch {
                notify.error('Invalid email or password');
              }
            }}
          />
        </div>

        <p className="text-center text-sm text-mist mt-6">
          No account?{' '}
          <Link to="/register" className="text-brand-accent-deep font-medium hover:text-brand-accent transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
