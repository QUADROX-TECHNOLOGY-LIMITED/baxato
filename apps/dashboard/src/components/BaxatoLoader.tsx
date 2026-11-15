import Image from 'next/image';

export interface BaxatoLoaderProps {
  /**
   * - `fullscreen`: covers the viewport (`min-h-[100dvh]`) during page or route loading.
   * - `overlay`: frosted viewport overlay (`fixed inset-0 z-[100]`) during purchase/vend submissions.
   */
  variant?: 'fullscreen' | 'overlay';
  className?: string;
}

export default function BaxatoLoader({
  variant = 'fullscreen',
  className = '',
}: BaxatoLoaderProps) {
  const containerClass =
    variant === 'overlay'
      ? 'fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-[#070D18]/85 backdrop-blur-sm select-none h-[100dvh] w-screen overflow-hidden'
      : 'min-h-[100dvh] w-full flex items-center justify-center bg-white dark:bg-[#070D18] select-none';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={`${containerClass} ${className}`.trim()}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center dark:rounded-xl dark:bg-white dark:p-1.5">
            <div className="relative w-full h-full">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO"
                fill
                sizes="56px"
                priority
                className="object-contain"
              />
            </div>
          </div>
          <span
            aria-hidden="true"
            className="baxato-loader-ring absolute -inset-2 rounded-[20px] border-2 border-transparent border-t-[#126BEB] dark:border-t-[#38BDF8]"
          />
        </div>

        <div className="w-24 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="baxato-loader-bar h-full w-1/2 rounded-full bg-[#126BEB] dark:bg-[#38BDF8]" />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
