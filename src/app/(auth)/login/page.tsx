'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

import { loginUser } from '@/modules/auth/actions';

// --- ZOD VALIDATION SCHEMA ---
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const result = await loginUser({}, formData);

    if (result?.error) {
      setServerError(result.error);
    } else if (result?.success) {
      // Force a hard navigation to trigger the middleware check
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <Image 
            src="/baxato-logo.png" 
            alt="BAXATO Logo" 
            width={200} 
            height={54} 
            className="h-14 w-auto object-contain" 
            priority
          />
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Sign in to your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-gray-100">
          
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-md flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-5 w-5" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                {...register('email')} 
                type="email"
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" 
              />
              {errors.email && <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-bold text-[#1c44e4] hover:text-blue-800 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  {...register('password')} 
                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 pr-10 transition-colors" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>}
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex w-full justify-center items-center rounded-full bg-[#1c44e4] py-4 px-4 text-base font-bold text-white shadow-lg hover:bg-blue-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#1c44e4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'SIGN IN'}
              </button>
            </div>
            
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600 font-medium">
              New to BAXATO?{' '}
              <Link href="/register" className="font-bold text-[#1c44e4] hover:text-blue-800 transition-colors">
                Create an account &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
