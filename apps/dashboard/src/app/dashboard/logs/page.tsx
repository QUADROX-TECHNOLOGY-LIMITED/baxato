'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BaxatoLoader from '@/components/BaxatoLoader';

export default function BusinessLogsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/business?tab=logs');
  }, [router]);

  return <BaxatoLoader variant="fullscreen" />;
}
