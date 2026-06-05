'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

import { registerUser } from '@/modules/auth/actions';
import { COUNTRIES, NIGERIAN_STATES } from '@/lib/data/locations';

// --- ZOD VALIDATION SCHEMA ---
const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  middleName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  country: z.string().min(2, 'Country is required'),
  state: z.string().min(2, 'State/Region is required'),
  lga: z.string().min(2, 'LGA/City is required'),
  businessName: z.string().min(2, 'Business name is required'),
  website: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms & Privacy Policy' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  
  // -- UI States --
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  // -- OTP States --
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: 'Nigeria' }
  });

  // Watch fields for dynamic rendering
  const watchPassword = watch('password', '');
  const watchCountry = watch('country', 'Nigeria');
  const watchState = watch('state', '');
  const watchEmail = watch('email', '');
  const watchPhone = watch('phoneNumber', '');

  // -- Dynamic Location Logic --
  const selectedStateData = NIGERIAN_STATES.find(s => s.name === watchState);

  // -- Password Health Logic --
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };
  const passwordScore = calculatePasswordStrength(watchPassword);

  // -- Auto HTTPS formatter --
  const handleWebsiteBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
      setValue('website', `https://${val}`, { shouldValidate: true });
    }
  };

  // -- OTP Handlers --
  const handleSendOtp = async (type: 'EMAIL' | 'PHONE') => {
    const target = type === 'EMAIL' ? watchEmail : watchPhone;
    if (!target) return;
    
    type === 'EMAIL' ? setIsVerifyingEmail(true) : setIsVerifyingPhone(true);
    
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ target, type }),
      });
      if (res.ok) {
        type === 'EMAIL' ? setEmailOtpSent(true) : setPhoneOtpSent(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      type === 'EMAIL' ? setIsVerifyingEmail(false) : setIsVerifyingPhone(false);
    }
  };

  const handleConfirmOtp = async (type: 'EMAIL' | 'PHONE') => {
    const target = type === 'EMAIL' ? watchEmail : watchPhone;
    const code = type === 'EMAIL' ? emailOtp : phoneOtp;
    if (!code) return;

    type === 'EMAIL' ? setIsVerifyingEmail(true) : setIsVerifyingPhone(true);

    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ target, type, code }),
      });
      if (res.ok) {
        type === 'EMAIL' ? setEmailVerified(true) : setPhoneVerified(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      type === 'EMAIL' ? setIsVerifyingEmail(false) : setIsVerifyingPhone(false);
    }
  };

  // -- Form Submission --
  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    
    if (!emailVerified || !phoneVerified) {
      setServerError("Please verify both your email and phone number to continue.");
      return;
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value.toString());
    });

    const result = await registerUser({}, formData);

    if (result?.error) {
      setServerError(result.error);
    } else if (result?.success) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Image 
          src="/baxato-logo.png" 
          alt="BAXATO Logo" 
          width={180} 
          height={48} 
          className="mx-auto h-12 w-auto" 
          priority
        />
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900">
          Create your enterprise account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-md flex items-center">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* --- PERSONAL INFO --- */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input {...register('firstName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" />
                  {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input {...register('lastName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" />
                  {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Middle Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input {...register('middleName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" />
                </div>
              </div>
            </div>

            {/* --- VERIFICATION INFRASTRUCTURE --- */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Account Verification</h3>
              
              {/* Email Verification */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="relative flex-grow focus-within:z-10">
                    <input 
                      {...register('email')} 
                      disabled={emailVerified}
                      className={`block w-full rounded-none rounded-l-md border-gray-300 focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border ${emailVerified ? 'bg-green-50 text-green-900 border-green-200' : 'bg-gray-50'}`} 
                    />
                  </div>
                  {!emailVerified && !emailOtpSent && (
                    <button type="button" onClick={() => handleSendOtp('EMAIL')} disabled={!watchEmail || isVerifyingEmail} className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-[#1c44e4] focus:outline-none focus:ring-1 focus:ring-[#1c44e4] disabled:opacity-50">
                      {isVerifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Code'}
                    </button>
                  )}
                  {emailVerified && (
                    <span className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                
                {/* Email OTP Input Phase */}
                {emailOtpSent && !emailVerified && (
                  <div className="mt-2 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
                    <input type="text" placeholder="Enter OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border text-center tracking-widest font-mono" />
                    <button type="button" onClick={() => handleConfirmOtp('EMAIL')} disabled={isVerifyingEmail} className="inline-flex items-center rounded-md border border-transparent bg-[#1c44e4] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#1c44e4] focus:ring-offset-2">
                      {isVerifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                )}
              </div>

              {/* Phone Verification */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="relative flex-grow focus-within:z-10">
                    <input 
                      {...register('phoneNumber')} 
                      disabled={phoneVerified}
                      placeholder="+234800000000"
                      className={`block w-full rounded-none rounded-l-md border-gray-300 focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border ${phoneVerified ? 'bg-green-50 text-green-900 border-green-200' : 'bg-gray-50'}`} 
                    />
                  </div>
                  {!phoneVerified && !phoneOtpSent && (
                    <button type="button" onClick={() => handleSendOtp('PHONE')} disabled={!watchPhone || isVerifyingPhone} className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-[#1c44e4] focus:outline-none focus:ring-1 focus:ring-[#1c44e4] disabled:opacity-50">
                      {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send SMS'}
                    </button>
                  )}
                  {phoneVerified && (
                    <span className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber.message}</p>}

                {/* Phone OTP Input Phase */}
                {phoneOtpSent && !phoneVerified && (
                  <div className="mt-2 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
                    <input type="text" placeholder="Enter OTP" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)} className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border text-center tracking-widest font-mono" />
                    <button type="button" onClick={() => handleConfirmOtp('PHONE')} disabled={isVerifyingPhone} className="inline-flex items-center rounded-md border border-transparent bg-[#1c44e4] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#1c44e4] focus:ring-offset-2">
                      {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* --- LOCATION (NATIVE ACCESSIBLE SELECTS) --- */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Business Location</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <select {...register('country')} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-[#1c44e4] focus:outline-none focus:ring-[#1c44e4] sm:text-sm border bg-gray-50">
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>

                {watchCountry === 'Nigeria' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <select {...register('state')} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-[#1c44e4] focus:outline-none focus:ring-[#1c44e4] sm:text-sm border bg-gray-50">
                        <option value="">Select State</option>
                        {NIGERIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">LGA</label>
                      <select {...register('lga')} disabled={!watchState} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-[#1c44e4] focus:outline-none focus:ring-[#1c44e4] sm:text-sm border bg-gray-50 disabled:opacity-50">
                        <option value="">Select LGA</option>
                        {selectedStateData?.lgas.map(lga => <option key={lga} value={lga}>{lga}</option>)}
                      </select>
                      {errors.lga && <p className="mt-1 text-xs text-red-600">{errors.lga.message}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State / Province</label>
                      <input {...register('state')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" />
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input {...register('lga')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" />
                      {errors.lga && <p className="mt-1 text-xs text-red-600">{errors.lga.message}</p>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- BUSINESS DETAILS --- */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Business Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name / Project Name</label>
                  <input {...register('businessName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" />
                  {errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website URL <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input 
                    {...register('website')} 
                    onBlur={handleWebsiteBlur}
                    placeholder="quadrox.tech"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" 
                  />
                  {errors.website && <p className="mt-1 text-xs text-red-600">{errors.website.message}</p>}
                </div>
              </div>
            </div>

            {/* --- SECURITY --- */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Security</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative mt-1">
                    <input 
                      type={showPassword ? "text" : "password"}
                      {...register('password')} 
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50 pr-10" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Health Meter */}
                  <div className="mt-2 flex items-center gap-1">
                    <div className={`h-1.5 w-full rounded-full transition-colors ${passwordScore >= 25 ? 'bg-red-400' : 'bg-gray-200'}`} />
                    <div className={`h-1.5 w-full rounded-full transition-colors ${passwordScore >= 50 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                    <div className={`h-1.5 w-full rounded-full transition-colors ${passwordScore >= 75 ? 'bg-[#1c44e4] opacity-70' : 'bg-gray-200'}`} />
                    <div className={`h-1.5 w-full rounded-full transition-colors ${passwordScore === 100 ? 'bg-[#1c44e4]' : 'bg-gray-200'}`} />
                  </div>
                  {errors.password ? (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">Must contain upper, lower, number, and special character.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input 
                    type={showPassword ? "text" : "password"}
                    {...register('confirmPassword')} 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border bg-gray-50" 
                  />
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            {/* --- TERMS & SUBMIT --- */}
            <div className="pt-4 border-t">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input {...register('termsAccepted')} type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#1c44e4] focus:ring-[#1c44e4]" />
                </div>
                <div className="ml-3 text-sm">
                  <label className="text-gray-500">
                    I agree to the BAXATO <Link href="/terms" className="text-[#1c44e4] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#1c44e4] hover:underline">Privacy Policy</Link>.
                  </label>
                  {errors.termsAccepted && <p className="mt-1 text-xs text-red-600">{errors.termsAccepted.message}</p>}
                </div>
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={isSubmitting || !emailVerified || !phoneVerified}
                className="flex w-full justify-center rounded-md border border-transparent bg-[#1c44e4] py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#1c44e4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
              </button>
            </div>
            
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-[#1c44e4] hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
