import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { FormEngine } from '@/components/FormEngine';
import { useAuthStore } from '@/stores/authStore';
import { useRegister } from '@/hooks/useApi';
import { notify } from '@/lib/toast';

const registerSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(8, 'Minimum 8 characters').required('Password is required'),
  role: Yup.string().oneOf(['CREATOR', 'FAN']).required('Role is required'),
});

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const registerMutation = useRegister();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-vivid-500 to-violet-600 text-xl font-bold text-white shadow-glow mx-auto mb-4">
            V
          </span>
          <h1 className="text-2xl font-bold text-white">Join VividCraft</h1>
          <p className="text-gray-400 mt-1">Sell your art or discover amazing digital works</p>
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <FormEngine
            initialValues={{ name: '', email: '', password: '', role: 'FAN' }}
            validationSchema={registerSchema}
            fields={[
              { name: 'name', label: 'Full Name', placeholder: 'Jane Creator' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@vividcraft.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', hint: 'At least 8 characters' },
              {
                name: 'role',
                label: 'I want to',
                type: 'select',
                options: [
                  { value: 'FAN', label: 'Browse & buy digital works' },
                  { value: 'CREATOR', label: 'Sell my art & comics' },
                ],
              },
            ]}
            submitLabel="Create Account"
            onSubmit={async (values) => {
              try {
                const data = await registerMutation.mutateAsync(values);
                setAuth(data.user, data.accessToken, data.refreshToken);
                notify.success(`Account created! Welcome, ${data.user.name}`);
                navigate('/');
              } catch {
                notify.error('Registration failed. Email may already be in use.');
              }
            }}
          />
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-vivid-400 font-medium hover:text-vivid-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
