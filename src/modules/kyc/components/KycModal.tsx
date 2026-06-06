'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle, ShieldCheck, CheckCircle2, ChevronRight, Building } from 'lucide-react';

import { submitKycData, getBankList } from '../actions';
import type { PaystackBank } from '../paystack';

// --- VALIDATION SCHEMAS ---
const identitySchema = z.object({
  nin: z.string().length(11, 'NIN must be exactly 11 digits').regex(/^\d+$/, 'NIN must contain only numbers'),
  dob: z.string().min(10, 'Date of Birth is required (YYYY-MM-DD)'),
});

const bankSchema = z.object({
  bankCode: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits').regex(/^\d+$/, 'Account number must contain only numbers'),
});

type IdentityFormData = z.infer<typeof identitySchema>;
type BankFormData = z.infer<typeof bankSchema>;

export function KycModal() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isSubmittingGlobal, setIsSubmittingGlobal] = useState(false);

  // We hold the verified identity data in state to pass it to the final submission
  const [verifiedIdentity, setVerifiedIdentity] = useState<IdentityFormData | null>(null);

  // Identity Form
  const { 
    register: registerIdentity, 
    handleSubmit: handleIdentitySubmit, 
    formState: { errors: identityErrors, isSubmitting: isVerifyingIdentity } 
  } = useForm<IdentityFormData>({ resolver: zodResolver(identitySchema) });

  // Bank Form
  const { 
    register: registerBank, 
    handleSubmit: handleBankSubmit, 
    formState: { errors: bankErrors, isSubmitting: isVerifyingBank } 
  } = useForm<BankFormData>({ resolver: zodResolver(bankSchema) });

  // Load Banks when they reach Step 3
  useEffect(() => {
    if (step === 3 && banks.length === 0) {
      setIsLoadingBanks(true);
      getBankList().then(fetchedBanks => {
        setBanks(fetchedBanks);
        setIsLoadingBanks(false);
      });
    }
  }, [step, banks.length]);

  // Step Handlers
  const onIdentityComplete = async (data: IdentityFormData) => {
    setServerError(null);
    // In a real app, you might do a pre-check here, but for now, we just save the data
    // and move to the bank step. The final server action does the real NIMC check.
    setVerifiedIdentity(data);
    setStep(3);
  };

  const onBankComplete = async (data: BankFormData) => {
    setServerError(null);
    setIsSubmittingGlobal(true);

    if (!verifiedIdentity) {
      setServerError("Identity data missing. Please go back.");
      setIsSubmittingGlobal(false);
      return;
    }

    const formData = new FormData();
    formData.append('nin', verifiedIdentity.nin);
    formData.append('dob', verifiedIdentity.dob);
    formData.append('bankCode', data.bankCode);
    formData.append('accountNumber', data.accountNumber);

    const result = await submitKycData({}, formData);

    if (result?.error) {
      setServerError(result.error);
      setIsSubmittingGlobal(false);
    } else if (result?.success) {
      setStep(4);
      setIsSubmittingGlobal(false);
    }
  };

  const closeAndRefresh = () => {
    router.refresh(); // Reload the dashboard to remove the modal block
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 font-sans">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Ribbon */}
        <div className="bg-[#1c44e4] px-6 py-6 text-white shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-200" />
            <div>
              <h2 className="text-xl font-bold">Identity Verification</h2>
              <p className="text-blue-100 text-sm mt-0.5">Required for regulatory compliance</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6 flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-white' : 'bg-blue-800/50'}`} />
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="font-medium">{serverError}</p>
            </div>
          )}

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Welcome to BAXATO</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Before you can fund your wallet or process transactions, financial regulations require us to verify your identity. This process takes less than 2 minutes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-gray-100 p-2.5 rounded-full shrink-0"><ShieldCheck className="h-5 w-5 text-gray-600" /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">National Identity Number (NIN)</h4>
                    <p className="text-xs text-gray-500 mt-1">We will verify your NIN directly with the NIMC database.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="bg-gray-100 p-2.5 rounded-full shrink-0"><Building className="h-5 w-5 text-gray-600" /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Settlement Account</h4>
                    <p className="text-xs text-gray-500 mt-1">We need a valid bank account in your name to process your withdrawals securely.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="w-full flex justify-center items-center gap-2 rounded-full bg-[#1c44e4] py-4 px-4 text-sm font-bold text-white hover:bg-blue-800 transition-colors mt-8"
              >
                START VERIFICATION <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 2: NIN VERIFICATION */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">National Identity Number</h3>
                <p className="text-sm text-gray-500 mt-1">Please provide your 11-digit NIN and date of birth.</p>
              </div>

              <form onSubmit={handleIdentitySubmit(onIdentityComplete)} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">11-Digit NIN</label>
                  <input 
                    {...registerIdentity('nin')} 
                    placeholder="e.g. 12345678901"
                    maxLength={11}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] px-4 py-3 border bg-gray-50 font-mono tracking-wider" 
                  />
                  {identityErrors.nin && <p className="mt-1.5 text-xs text-red-600 font-medium">{identityErrors.nin.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Date of Birth</label>
                  <input 
                    type="date"
                    {...registerIdentity('dob')} 
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] px-4 py-3 border bg-gray-50 text-gray-900" 
                  />
                  {identityErrors.dob && <p className="mt-1.5 text-xs text-red-600 font-medium">{identityErrors.dob.message}</p>}
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-full font-bold text-gray-600 hover:bg-gray-100 transition-colors">Back</button>
                  <button 
                    type="submit" 
                    disabled={isVerifyingIdentity}
                    className="flex-1 flex justify-center items-center gap-2 rounded-full bg-[#1c44e4] py-3 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    CONTINUE <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: BANK DETAILS */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4">
               <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Settlement Bank</h3>
                <p className="text-sm text-gray-500 mt-1">This account must be in your name. We will use it for your withdrawals.</p>
              </div>

              <form onSubmit={handleBankSubmit(onBankComplete)} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Select Bank</label>
                  <div className="relative">
                    <select 
                      {...registerBank('bankCode')} 
                      disabled={isLoadingBanks || isSubmittingGlobal}
                      className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] px-4 py-3 border bg-gray-50 appearance-none disabled:opacity-50 text-gray-900" 
                    >
                      <option value="">{isLoadingBanks ? 'Loading banks...' : 'Choose your bank'}</option>
                      {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                  {bankErrors.bankCode && <p className="mt-1.5 text-xs text-red-600 font-medium">{bankErrors.bankCode.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Account Number</label>
                  <input 
                    {...registerBank('accountNumber')} 
                    maxLength={10}
                    disabled={isSubmittingGlobal}
                    placeholder="10-digit account number"
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1c44e4] focus:ring-[#1c44e4] px-4 py-3 border bg-gray-50 font-mono tracking-wider disabled:opacity-50" 
                  />
                  {bankErrors.accountNumber && <p className="mt-1.5 text-xs text-red-600 font-medium">{bankErrors.accountNumber.message}</p>}
                </div>

                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 mt-6">
                  <p className="text-xs text-yellow-800 font-medium flex gap-2">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ display: isSubmittingGlobal ? 'block' : 'none' }}/>
                    {isSubmittingGlobal 
                      ? "Verifying identity with NIMC and cross-checking bank details. This may take a moment..." 
                      : "By clicking complete, your identity will be verified against the National Database."}
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setStep(2)} disabled={isSubmittingGlobal} className="px-6 py-3 rounded-full font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">Back</button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingGlobal}
                    className="flex-1 flex justify-center items-center gap-2 rounded-full bg-[#1c44e4] py-3 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingGlobal ? <Loader2 className="h-5 w-5 animate-spin" /> : 'COMPLETE VERIFICATION'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="text-center space-y-6 py-8 animate-in zoom-in-95 duration-500">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Verification Complete</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                  Your identity has been successfully verified and your settlement account is connected.
                </p>
              </div>
              <button 
                onClick={closeAndRefresh}
                className="w-full max-w-xs mx-auto flex justify-center items-center rounded-full bg-green-600 py-4 px-4 text-sm font-bold text-white hover:bg-green-700 shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5"
              >
                ACCESS DASHBOARD
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
