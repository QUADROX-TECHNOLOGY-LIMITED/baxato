'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, LayoutDashboard, Wallet, Key, BarChart3 } from 'lucide-react';

export default function MobileHeader({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:hidden shrink-0 relative z-40">
      <Link href="/dashboard" className="flex items-center">
        <Image 
          src="/baxato-logo.png" 
          alt="BAXATO" 
          width={110} 
          height={32} 
          className="h-7 w-auto object-contain" 
        />
      </Link>

      <div className="flex items-center gap-4">
        {/* User Avatar */}
        <div className="h-8 w-8 rounded-lg bg-[#1c44e4] text-white flex items-center justify-center font-bold text-xs overflow-hidden shadow-sm">
           {user?.profilePicture ? (
             <Image src={user.profilePicture} alt="Avatar" width={32} height={32} className="object-cover h-full w-full" />
           ) : (
             <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
           )}
        </div>
        
        {/* Hamburger Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-gray-500 hover:text-gray-900 transition-colors"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1c44e4] rounded-xl transition-colors" 
            onClick={() => setIsOpen(false)}
          >
            <LayoutDashboard className="h-5 w-5" /> Dashboard Overview
          </Link>
          <Link 
            href="/dashboard/wallet" 
            className="flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1c44e4] rounded-xl transition-colors" 
            onClick={() => setIsOpen(false)}
          >
            <Wallet className="h-5 w-5" /> Wallet & Funding
          </Link>
          <Link 
            href="/dashboard/api-keys" 
            className="flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1c44e4] rounded-xl transition-colors" 
            onClick={() => setIsOpen(false)}
          >
            <Key className="h-5 w-5" /> API & Integration
          </Link>
          <Link 
            href="/dashboard/analytics" 
            className="flex items-center gap-3 p-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1c44e4] rounded-xl transition-colors" 
            onClick={() => setIsOpen(false)}
          >
            <BarChart3 className="h-5 w-5" /> Analytics
          </Link>
        </div>
      )}
    </header>
  );
}
