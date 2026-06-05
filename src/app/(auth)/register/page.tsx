'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, CheckCircle2, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

import { registerUser } from '@/modules/auth/actions';
import { COUNTRIES, NIGERIAN_STATES } from '@/lib/data/locations';

// --- DIAL CODE MAPPING ---
const DIAL_CODES: Record<string, string> = {
  'Nigeria': '+234', 'Ghana': '+233', 'United Kingdom': '+44', 
  'United States': '+1', 'Canada': '+1', 'South Africa': '+27',
  'Kenya': '+254', 'United Arab Emirates': '+971', 'Germany': '+49',
  'France': '+33', 'India': '+91', 'China': '+86', 'Brazil': '+55',
  'Australia': '+61'
};

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
  message: "Passwords do not match",
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
  const [emailError, setEmailError] = useState<string | null>(null);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: 'Nigeria' }
  });

  // Watch fields
  const watchPassword = watch('password', '');
  const watchConfirmPassword = watch('confirmPassword', '');
  const watchCountry = watch('country', 'Nigeria');
  const watchState = watch('state', '');
  const watchEmail = watch('email', '');
  const watchPhone = watch('phoneNumber', '');

  // Derived Data
  const selectedStateData = NIGERIAN_STATES.find(s => s.name === watchState);
  const currentDialCode = DIAL_CODES[watchCountry] || '+';

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
    
    type === 'EMAIL' ? setEmailError(null) : setPhoneError(null);
    type === 'EMAIL' ? setIsVerifyingEmail(true) : setIsVerifyingPhone(true);
    
    // Auto-format phone number with dial code before sending to server
    const finalTarget = type === 'PHONE' ? `${currentDialCode}${target}` : target;
    
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: finalTarget, type }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        type === 'EMAIL' ? setEmailOtpSent(true) : setPhoneOtpSent(true);
      } else {
        type === 'EMAIL' ? setEmailError(data.error || 'Failed to send. Check API keys.') : setPhoneError(data.error || 'Failed to send SMS.');
      }
    } catch (e) {
      type === 'EMAIL' ? setEmailError('Network error. Try again.') : setPhoneError('Network error. Try again.');
    } finally {
      type === 'EMAIL' ? setIsVerifyingEmail(false) : setIsVerifyingPhone(false);
    }
  };

  const handleConfirmOtp = async (type: 'EMAIL' | 'PHONE') => {
    const target = type === 'EMAIL' ? watchEmail : watchPhone;
    const code = type === 'EMAIL' ? emailOtp : phoneOtp;
    if (!code) return;

    type === 'EMAIL' ? setEmailError(null) : setPhoneError(null);
    type === 'EMAIL' ? setIsVerifyingEmail(true) : setIsVerifyingPhone(true);

    const finalTarget = type === 'PHONE' ? `${currentDialCode}${target}` : target;

    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: finalTarget, type, code }),
      });
      
      const data = await res.json();

      if (res.ok) {
        type === 'EMAIL' ? setEmailVerified(true) : setPhoneVerified(true);
      } else {
        type === 'EMAIL' ? setEmailError(data.error || 'Invalid Code') : setPhoneError(data.error || 'Invalid Code');
      }
    } catch (e) {
      type === 'EMAIL' ? setEmailError('Network error.') : setPhoneError('Network error.');
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
      // Prepend dial code to phone number before saving
      if (key === 'phoneNumber') {
        formData.append(key, `${currentDialCode}${value}`);
      } else if (value) {
        formData.append(key, value.toString());
      }
    });

    const result = await registerUser({}, formData);

    if (result?.error) {
      setServerError(result.error);
    } else if (result?.success) {
      router.push('/dashboard');
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Join the enterprise infrastructure platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-gray-100">
          
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* --- PERSONAL INFO --- */}
            <div>
              <h3 className="text-xs font-bold text-[#1c44e4] uppercase tracking-widest mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input {...register('firstName')} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" />
                  {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input {...register('lastName')} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" />
                  {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input {...register('middleName')} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" />
                </div>
              </div>
            </div>

            {/* --- VERIFICATION INFRASTRUCTURE --- */}
            <div>
              <h3 className="text-xs font-bold text-[#1c44e4] uppercase tracking-widest mb-4">Account Verification</h3>
              
              {/* Email Verification */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="flex rounded-xl shadow-sm border border-gray-300 overflow-hidden focus-within:border-[#1c44e4] focus-within:ring-1 focus-within:ring-[#1c44e4] transition-all">
                  <input 
                    {...register('email')} 
                    disabled={emailVerified}
                    className={`block w-full border-none focus:ring-0 sm:text-sm px-4 py-3 ${emailVerified ? 'bg-green-50 text-green-900' : 'bg-gray-50'}`} 
                  />
                  {!emailVerified && !emailOtpSent && (
                    <button type="button" onClick={() => handleSendOtp('EMAIL')} disabled={!watchEmail || isVerifyingEmail} className="bg-gray-100 px-5 py-3 text-sm font-bold text-[#1c44e4] hover:bg-gray-200 border-l border-gray-300 disabled:opacity-50 transition-colors">
                      {isVerifyingEmail ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'VERIFY'}
                    </button>
                  )}
                  {emailVerified && (
                    <div className="bg-green-50 px-5 py-3 border-l border-green-200 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
                
                {/* Email OTP Input */}
                {emailOtpSent && !emailVerified && (
                  <div className="mt-3 flex items-center space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <input type="text" placeholder="6-digit code" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} className="block w-32 rounded-lg border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border text-center tracking-widest font-mono" />
                    <button type="button" onClick={() => handleConfirmOtp('EMAIL')} disabled={isVerifyingEmail || !emailOtp} className="inline-flex items-center rounded-full bg-[#1c44e4] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-800 transition-colors disabled:opacity-50">
                      {isVerifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Code'}
                    </button>
                  </div>
                )}
              </div>

              {/* Phone Verification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="flex rounded-xl shadow-sm border border-gray-300 overflow-hidden focus-within:border-[#1c44e4] focus-within:ring-1 focus-within:ring-[#1c44e4] transition-all">
                  <span className={`inline-flex items-center px-4 border-r border-gray-300 text-gray-500 font-medium sm:text-sm ${phoneVerified ? 'bg-green-50' : 'bg-gray-100'}`}>
                    {currentDialCode}
                  </span>
                  <input 
                    {...register('phoneNumber')} 
                    disabled={phoneVerified}
                    placeholder="801 234 5678"
                    className={`block w-full border-none focus:ring-0 sm:text-sm px-4 py-3 ${phoneVerified ? 'bg-green-50 text-green-900' : 'bg-gray-50'}`} 
                  />
                  {!phoneVerified && !phoneOtpSent && (
                    <button type="button" onClick={() => handleSendOtp('PHONE')} disabled={!watchPhone || isVerifyingPhone} className="bg-gray-100 px-5 py-3 text-sm font-bold text-[#1c44e4] hover:bg-gray-200 border-l border-gray-300 disabled:opacity-50 transition-colors">
                      {isVerifyingPhone ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'VERIFY'}
                    </button>
                  )}
                  {phoneVerified && (
                    <div className="bg-green-50 px-5 py-3 border-l border-green-200 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>
                {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber.message}</p>}
                {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}

                {/* Phone OTP Input */}
                {phoneOtpSent && !phoneVerified && (
                  <div className="mt-3 flex items-center space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <input type="text" placeholder="SMS code" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)} className="block w-32 rounded-lg border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-3 py-2 border text-center tracking-widest font-mono" />
                    <button type="button" onClick={() => handleConfirmOtp('PHONE')} disabled={isVerifyingPhone || !phoneOtp} className="inline-flex items-center rounded-full bg-[#1c44e4] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-800 transition-colors disabled:opacity-50">
                      {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Code'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* --- LOCATION --- */}
            <div>
              <h3 className="text-xs font-bold text-[#1c44e4] uppercase tracking-widest mb-4">Business Location</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select {...register('country')} className="block w-full rounded-xl border-gray-300 py-3 pl-4 pr-10 text-base focus:border-[#1c44e4] focus:outline-none focus:ring-[#1c44e4] sm:text-sm border bg-gray-50 transition-colors">
                    {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                  </select>
                </div>

                {watchCountry === 'Nigeria' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <select {...register('state')} className="block w-full rounded-xl border-gray-300 py-3 pl-4 pr-10 text-base focus:border-[#1c44e4] focus:outline-none focus:ring-[#1c44e4] sm:text-sm border bg-gray-50 transition-colors">
                        <option value="">Select State</option>
                        {NIGERIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
                      <select {...register('lga')} disabled={!watchState} className="block w-full rounded-xl border-gray-300 py-3 pl-4 pr-10 text-base focus:border-[#1c44e4] focus:outline-none focus:ring-[#1c44e4] sm:text-sm border bg-gray-50 disabled:opacity-50 transition-colors">
                        <option value="">Select LGA</option>
                        {selectedStateData?.lgas.map(lga => <option key={lga} value={lga}>{lga}</option>)}
                      </select>
                      {errors.lga && <p className="mt-1 text-xs text-red-600">{errors.lga.message}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
                      <input {...register('state')} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" />
                      {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input {...register('lga')} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" />
                      {errors.lga && <p className="mt-1 text-xs text-red-600">{errors.lga.message}</p>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- BUSINESS DETAILS --- */}
            <div>
              <h3 className="text-xs font-bold text-[#1c44e4] uppercase tracking-widest mb-4">Business Details</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business / Project Name</label>
                  <input {...register('businessName')} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" />
                  {errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input 
                    {...register('website')} 
                    onBlur={handleWebsiteBlur}
                    placeholder="quadrox.tech"
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 transition-colors" 
                  />
                  {errors.website && <p className="mt-1 text-xs text-red-600">{errors.website.message}</p>}
                </div>
              </div>
            </div>

            {/* --- SECURITY --- */}
            <div>
              <h3 className="text-xs font-bold text-[#1c44e4] uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Security</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      {...register('password')} 
                      className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border bg-gray-50 pr-10 transition-colors" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {/* Enhanced Password Health Meter */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className={`h-2 w-full rounded-full transition-colors duration-500 ${passwordScore >= 25 ? 'bg-red-400' : 'bg-gray-200'}`} />
                    <div className={`h-2 w-full rounded-full transition-colors duration-500 ${passwordScore >= 50 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                    <div className={`h-2 w-full rounded-full transition-colors duration-500 ${passwordScore >= 75 ? 'bg-blue-300' : 'bg-gray-200'}`} />
                    <div className={`h-2 w-full rounded-full transition-colors duration-500 ${passwordScore === 100 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-200'}`} />
                  </div>
                  
                  <div className="mt-2 flex justify-between items-center h-4">
                    {errors.password ? (
                      <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
                    ) : passwordScore === 100 ? (
                      <p className="text-xs text-green-600 font-bold flex items-center gap-1 animate-in fade-in"><CheckCircle2 className="h-3 w-3" /> Strong Password</p>
                    ) : (
                      <p className="text-xs text-gray-500">Must contain upper, lower, number, & special character.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input 
                    type={showPassword ? "text" : "password"}
                    {...register('confirmPassword')} 
                    className={`block w-full rounded-xl shadow-sm focus:ring-[#1c44e4] sm:text-sm px-4 py-3 border transition-colors ${watchConfirmPassword && watchPassword !== watchConfirmPassword ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#1c44e4] bg-gray-50'}`} 
                  />
                  
                  {/* Live Password Match UI */}
                  <div className="mt-2 h-4">
                    {errors.confirmPassword ? (
                      <p className="text-xs text-red-600 font-medium">{errors.confirmPassword.message}</p>
                    ) : watchConfirmPassword && watchPassword === watchConfirmPassword ? (
                      <p className="text-xs text-green-600 font-bold flex items-center gap-1 animate-in fade-in"><CheckCircle2 className="h-3 w-3" /> Passwords match</p>
                    ) : watchConfirmPassword && watchPassword !== watchConfirmPassword ? (
                      <p className="text-xs text-red-600 font-medium animate-in fade-in">Passwords do not match</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* --- TERMS & SUBMIT --- */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input {...register('termsAccepted')} type="checkbox" className="h-5 w-5 rounded border-gray-300 text-[#1c44e4] focus:ring-[#1c44e4] transition-colors" />
                </div>
                <div className="ml-3 text-sm">
                  <label className="text-gray-600 font-medium">
                    I agree to the BAXATO <Link href="/terms" className="text-[#1c44e4] hover:underline font-bold">Terms of Service</Link> and <Link href="/privacy" className="text-[#1c44e4] hover:underline font-bold">Privacy Policy</Link>.
                  </label>
                  {errors.termsAccepted && <p className="mt-1 text-xs text-red-600 font-medium">{errors.termsAccepted.message}</p>}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting || !emailVerified || !phoneVerified}
                className="flex w-full justify-center items-center rounded-full bg-[#1c44e4] py-4 px-4 text-base font-bold text-white shadow-lg hover:bg-blue-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#1c44e4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'CREATE SECURE ACCOUNT'}
              </button>
              {(!emailVerified || !phoneVerified) && (
                <p className="text-center mt-3 text-xs font-medium text-amber-600">
                  * Please verify email and phone number to continue
                </p>
              )}
            </div>
            
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-[#1c44e4] hover:text-blue-800 transition-colors">
                Sign in to dashboard &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
