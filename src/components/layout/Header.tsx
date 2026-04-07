'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Counter from '@/components/ui/Counter';
import AuthForm from '@/components/auth/AuthForm';
import DemographicBanner from '@/components/layout/DemographicBanner';
import RecoveryCodesTopbar from '@/components/layout/RecoveryCodesTopbar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Menu,
  Vote,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

interface HeaderProps {
  totalVotes?: number;
  daysRemaining?: number;
  currentMonth?: string;
  onVoteClick?: () => void;
  userHasVoted?: boolean;
}

export default function Header({ totalVotes, daysRemaining, currentMonth, onVoteClick, userHasVoted }: HeaderProps) {
  const { isLoggedIn, login, logout } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(48);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [loginError, setLoginError] = useState('');

  // Header yüksekliğini dinamik olarak takip et
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Admin panelden seçili auth yöntemini varsayılan olarak ayarla
  useEffect(() => {
    fetch('/api/auth/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.method) setLoginMethod(data.method); })
      .catch(() => {});
  }, []);

  // VoteModal'dan gelen "giris yap" istegini dinle
  useEffect(() => {
    const handler = () => { setShowLoginForm(true); setMobileMenuOpen(true); };
    window.addEventListener('open-login', handler);
    return () => window.removeEventListener('open-login', handler);
  }, []);

  const handleAuth = async (identityValue: string, extraData?: { password?: string }) => {
    const isPhone = /^\d{10}$/.test(identityValue.replace(/\s/g, ''));
    const pendingData = isPhone
      ? { verifiedPhone: identityValue, password: extraData?.password }
      : { verifiedEmail: identityValue, password: extraData?.password };
    sessionStorage.setItem('pendingRegistration', JSON.stringify(pendingData));
    setShowLoginForm(false);
    setMobileMenuOpen(false);
    if (onVoteClick) onVoteClick();
  };

  const handleDirectLogin = (token: string) => {
    login(token);
    setShowLoginForm(false);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: 'Ana Sayfa' },
    { href: '/islemler', label: 'İşlemler' },
    { href: '/raporlar', label: 'Raporlar' },
    { href: '/metodoloji', label: 'Metodoloji' },
    { href: '/oneriler', label: 'Öneriler' },
    { href: '/#bagis-yap', label: 'Bağış Yap' },
  ];

  const loginFormContent = (
    <div className="space-y-4">
      <Tabs
        value={loginMethod}
        onValueChange={(v) => { setLoginMethod(v as 'email' | 'phone'); setLoginError(''); }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="email" className="flex-1">E-posta</TabsTrigger>
          <TabsTrigger value="phone" className="flex-1">Telefon</TabsTrigger>
        </TabsList>
      </Tabs>
      {loginError && <p className="text-destructive text-xs">{loginError}</p>}
      <AuthForm
        key={loginMethod}
        method={loginMethod}
        onAuthenticated={handleAuth}
        onDirectLogin={handleDirectLogin}
        loginOnly
        onRegistrationNeeded={() => {
          setShowLoginForm(false);
          setMobileMenuOpen(false);
          if (onVoteClick) onVoteClick();
        }}
      />
    </div>
  );

  return (
    <>
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          {/* Left: brand + stats */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center gap-2">
              <svg width="142" height="20" viewBox="0 0 71 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M64.75 8.92389V8.69589L64.93 8.63589C65.09 8.59589 65.198 8.52789 65.254 8.43189C65.318 8.33589 65.35 8.20789 65.35 8.04789V4.53189C65.342 4.35589 65.31 4.22389 65.254 4.13589C65.198 4.03989 65.09 3.97589 64.93 3.94389L64.75 3.89589V3.67989L66.706 2.98389L66.85 3.11589L66.958 4.17189V4.25589C67.078 4.03189 67.23 3.82389 67.414 3.63189C67.598 3.43989 67.798 3.28389 68.014 3.16389C68.23 3.04389 68.446 2.98389 68.662 2.98389C68.966 2.98389 69.194 3.06389 69.346 3.22389C69.498 3.38389 69.574 3.58789 69.574 3.83589C69.574 4.10789 69.498 4.31589 69.346 4.45989C69.194 4.59589 69.01 4.66389 68.794 4.66389C68.474 4.66389 68.198 4.51989 67.966 4.23189L67.942 4.20789C67.862 4.11189 67.77 4.05989 67.666 4.05189C67.57 4.03589 67.474 4.08389 67.378 4.19589C67.298 4.27589 67.222 4.37189 67.15 4.48389C67.086 4.58789 67.026 4.71189 66.97 4.85589V7.99989C66.97 8.15189 67.002 8.27989 67.066 8.38389C67.13 8.47989 67.238 8.54789 67.39 8.58789L67.75 8.69589V8.92389H64.75Z" fill="currentColor"/>
                <path d="M61.7148 2.98389C62.2188 2.98389 62.6508 3.08789 63.0108 3.29589C63.3708 3.50389 63.6468 3.79189 63.8388 4.15989C64.0388 4.51989 64.1388 4.93589 64.1388 5.40789C64.1388 5.51189 64.1348 5.61189 64.1268 5.70789C64.1188 5.79589 64.1028 5.87989 64.0788 5.95989H60.4668C60.4748 6.78389 60.6268 7.37589 60.9228 7.73589C61.2268 8.09589 61.6668 8.27589 62.2428 8.27589C62.6428 8.27589 62.9668 8.21189 63.2148 8.08389C63.4628 7.94789 63.6908 7.75989 63.8988 7.51989L64.0908 7.69989C63.8508 8.13989 63.5228 8.48389 63.1068 8.73189C62.6988 8.97189 62.2108 9.09189 61.6428 9.09189C61.0748 9.09189 60.5748 8.97189 60.1428 8.73189C59.7108 8.49189 59.3708 8.14789 59.1228 7.69989C58.8828 7.24389 58.7628 6.69989 58.7628 6.06789C58.7628 5.41189 58.9028 4.85589 59.1828 4.39989C59.4708 3.94389 59.8388 3.59589 60.2868 3.35589C60.7428 3.10789 61.2188 2.98389 61.7148 2.98389ZM61.6548 3.33189C61.4228 3.33189 61.2188 3.39989 61.0428 3.53589C60.8748 3.66389 60.7388 3.89589 60.6348 4.23189C60.5388 4.55989 60.4828 5.02389 60.4668 5.62389H62.6148C62.7028 4.81589 62.6708 4.23189 62.5188 3.87189C62.3668 3.51189 62.0788 3.33189 61.6548 3.33189Z" fill="currentColor"/>
                <path d="M50.981 8.92394V8.67194L51.221 8.58794C51.477 8.50794 51.605 8.30794 51.605 7.98794C51.613 7.53194 51.617 7.06794 51.617 6.59594C51.617 6.11594 51.617 5.62794 51.617 5.13194V4.71194C51.617 4.24794 51.617 3.78394 51.617 3.31994C51.617 2.85594 51.613 2.39194 51.605 1.92794C51.605 1.59994 51.481 1.39594 51.233 1.31594L50.981 1.24394V0.991943H54.137C54.977 0.991943 55.701 1.14794 56.309 1.45994C56.917 1.77194 57.385 2.22394 57.713 2.81594C58.041 3.39994 58.205 4.10794 58.205 4.93994C58.205 5.78794 58.025 6.50794 57.665 7.09994C57.313 7.69194 56.813 8.14394 56.165 8.45594C55.525 8.76794 54.777 8.92394 53.921 8.92394H50.981ZM53.345 8.57594H53.957C54.525 8.57594 54.985 8.46394 55.337 8.23994C55.697 8.01594 55.961 7.63994 56.129 7.11194C56.297 6.57594 56.381 5.85594 56.381 4.95194C56.381 4.04794 56.297 3.33194 56.129 2.80394C55.961 2.27594 55.701 1.89994 55.349 1.67594C55.005 1.45194 54.557 1.33994 54.005 1.33994H53.345C53.337 1.89194 53.333 2.45194 53.333 3.01994C53.333 3.57994 53.333 4.14394 53.333 4.71194V5.11994C53.333 5.71994 53.333 6.30794 53.333 6.88394C53.333 7.45194 53.337 8.01594 53.345 8.57594Z" fill="currentColor"/>
                <path d="M48.039 2.98389C48.543 2.98389 48.975 3.08789 49.335 3.29589C49.695 3.50389 49.971 3.79189 50.163 4.15989C50.363 4.51989 50.463 4.93589 50.463 5.40789C50.463 5.51189 50.459 5.61189 50.451 5.70789C50.443 5.79589 50.427 5.87989 50.403 5.95989H46.791C46.799 6.78389 46.951 7.37589 47.247 7.73589C47.551 8.09589 47.991 8.27589 48.567 8.27589C48.967 8.27589 49.291 8.21189 49.539 8.08389C49.787 7.94789 50.015 7.75989 50.223 7.51989L50.415 7.69989C50.175 8.13989 49.847 8.48389 49.431 8.73189C49.023 8.97189 48.535 9.09189 47.967 9.09189C47.399 9.09189 46.899 8.97189 46.467 8.73189C46.035 8.49189 45.695 8.14789 45.447 7.69989C45.207 7.24389 45.087 6.69989 45.087 6.06789C45.087 5.41189 45.227 4.85589 45.507 4.39989C45.795 3.94389 46.163 3.59589 46.611 3.35589C47.067 3.10789 47.543 2.98389 48.039 2.98389ZM47.979 3.33189C47.747 3.33189 47.543 3.39989 47.367 3.53589C47.199 3.66389 47.063 3.89589 46.959 4.23189C46.863 4.55989 46.807 5.02389 46.791 5.62389H48.939C49.027 4.81589 48.995 4.23189 48.843 3.87189C48.691 3.51189 48.403 3.33189 47.979 3.33189Z" fill="currentColor"/>
                <path d="M37.6953 8.92394V8.67194L38.0433 8.57594C38.1953 8.53594 38.2993 8.45994 38.3553 8.34794C38.4193 8.23594 38.4513 8.09994 38.4513 7.93994V2.13194C38.3793 1.97994 38.3153 1.86794 38.2593 1.79594C38.2113 1.71594 38.1593 1.64794 38.1033 1.59194C38.0473 1.53594 37.9713 1.47194 37.8753 1.39994L37.6593 1.24394V0.991943H39.7113L43.6953 6.43994V1.98794C43.6953 1.82794 43.6673 1.68794 43.6113 1.56794C43.5633 1.44794 43.4593 1.36794 43.2993 1.32794L42.9393 1.24394V0.991943H44.7273V1.24394L44.4273 1.32794C44.2753 1.37594 44.1793 1.45994 44.1393 1.57994C44.1073 1.69194 44.0913 1.82794 44.0913 1.98794V8.97194H43.4193L38.8473 2.68394V7.92794C38.8473 8.09594 38.8713 8.23594 38.9193 8.34794C38.9673 8.45994 39.0673 8.53594 39.2193 8.57594L39.5433 8.67194V8.92394H37.6953Z" fill="currentColor"/>
                <path d="M35.4825 9.09197C34.9865 9.09197 34.5945 8.97197 34.3065 8.73197C34.0265 8.48397 33.8865 8.08397 33.8865 7.53197C33.8865 7.33997 33.8865 7.15997 33.8865 6.99197C33.8945 6.81597 33.8985 6.61197 33.8985 6.37997V3.53597H33.0465V3.27197L33.3705 3.22397C33.6025 3.18397 33.7985 3.11197 33.9585 3.00797C34.1265 2.90397 34.2785 2.75997 34.4145 2.57597L35.1945 1.49597H35.5545L35.5185 3.16397H36.8865V3.53597H35.5065V7.62797C35.5065 7.91597 35.5665 8.13197 35.6865 8.27597C35.8145 8.41997 35.9705 8.49197 36.1545 8.49197C36.3145 8.49197 36.4585 8.45597 36.5865 8.38397C36.7145 8.30397 36.8425 8.19997 36.9705 8.07197L37.1265 8.25197C36.9745 8.51597 36.7625 8.72397 36.4905 8.87597C36.2185 9.01997 35.8825 9.09197 35.4825 9.09197Z" fill="currentColor"/>
                <path d="M30.1914 2.98389C30.6954 2.98389 31.1274 3.08789 31.4874 3.29589C31.8474 3.50389 32.1234 3.79189 32.3154 4.15989C32.5154 4.51989 32.6154 4.93589 32.6154 5.40789C32.6154 5.51189 32.6114 5.61189 32.6034 5.70789C32.5954 5.79589 32.5794 5.87989 32.5554 5.95989H28.9434C28.9514 6.78389 29.1034 7.37589 29.3994 7.73589C29.7034 8.09589 30.1434 8.27589 30.7194 8.27589C31.1194 8.27589 31.4434 8.21189 31.6914 8.08389C31.9394 7.94789 32.1674 7.75989 32.3754 7.51989L32.5674 7.69989C32.3274 8.13989 31.9994 8.48389 31.5834 8.73189C31.1754 8.97189 30.6874 9.09189 30.1194 9.09189C29.5514 9.09189 29.0514 8.97189 28.6194 8.73189C28.1874 8.49189 27.8474 8.14789 27.5994 7.69989C27.3594 7.24389 27.2394 6.69989 27.2394 6.06789C27.2394 5.41189 27.3794 4.85589 27.6594 4.39989C27.9474 3.94389 28.3154 3.59589 28.7634 3.35589C29.2194 3.10789 29.6954 2.98389 30.1914 2.98389ZM30.1314 3.33189C29.8994 3.33189 29.6954 3.39989 29.5194 3.53589C29.3514 3.66389 29.2154 3.89589 29.1114 4.23189C29.0154 4.55989 28.9594 5.02389 28.9434 5.62389H31.0914C31.1794 4.81589 31.1474 4.23189 30.9954 3.87189C30.8434 3.51189 30.5554 3.33189 30.1314 3.33189Z" fill="currentColor"/>
                <path d="M23.8521 8.924V8.696L24.0321 8.648C24.2961 8.56 24.4281 8.36 24.4281 8.048C24.4281 7.776 24.4281 7.504 24.4281 7.232C24.4361 6.952 24.4401 6.676 24.4401 6.404V1.844C24.4401 1.676 24.4121 1.552 24.3561 1.472C24.3001 1.384 24.1921 1.32 24.0321 1.28L23.8521 1.232V1.004L25.9521 0.5L26.1081 0.608L26.0601 2.3V8.048C26.0681 8.208 26.1001 8.34 26.1561 8.444C26.2201 8.54 26.3281 8.608 26.4801 8.648L26.6481 8.696V8.924H23.8521Z" fill="currentColor"/>
                <path d="M20.4888 8.924V8.696L20.6688 8.648C20.9328 8.56 21.0648 8.36 21.0648 8.048C21.0648 7.776 21.0648 7.504 21.0648 7.232C21.0728 6.952 21.0768 6.676 21.0768 6.404V1.844C21.0768 1.676 21.0488 1.552 20.9928 1.472C20.9368 1.384 20.8288 1.32 20.6688 1.28L20.4888 1.232V1.004L22.5888 0.5L22.7448 0.608L22.6968 2.3V8.048C22.7048 8.208 22.7368 8.34 22.7928 8.444C22.8568 8.54 22.9648 8.608 23.1168 8.648L23.2848 8.696V8.924H20.4888Z" fill="currentColor"/>
                <path d="M18.5639 2.32397C18.2999 2.32397 18.0759 2.23997 17.8919 2.07197C17.7079 1.90397 17.6159 1.69197 17.6159 1.43597C17.6159 1.17197 17.7079 0.959974 17.8919 0.799973C18.0759 0.631974 18.2999 0.547974 18.5639 0.547974C18.8279 0.547974 19.0519 0.631974 19.2359 0.799973C19.4199 0.959974 19.5119 1.17197 19.5119 1.43597C19.5119 1.69197 19.4199 1.90397 19.2359 2.07197C19.0519 2.23997 18.8279 2.32397 18.5639 2.32397ZM17.1839 8.92397V8.69597L17.3639 8.64797C17.5239 8.59997 17.6319 8.52797 17.6879 8.43197C17.7439 8.33597 17.7759 8.20797 17.7839 8.04797V5.83997C17.7839 5.59197 17.7839 5.36397 17.7839 5.15597C17.7839 4.93997 17.7799 4.71997 17.7719 4.49597C17.7719 4.33597 17.7399 4.21197 17.6759 4.12397C17.6199 4.02797 17.5119 3.96397 17.3519 3.93197L17.1839 3.89597V3.67997L19.2839 2.98397L19.4279 3.11597L19.3919 4.81997V8.05997C19.3919 8.21997 19.4199 8.34797 19.4759 8.44397C19.5399 8.53997 19.6479 8.61197 19.7999 8.65997L19.9319 8.69597V8.92397H17.1839Z" fill="currentColor"/>
                <path d="M7.63281 8.92394V8.65994L7.87281 8.58794C8.02481 8.53994 8.12881 8.46394 8.18481 8.35994C8.24081 8.24794 8.26881 8.10394 8.26881 7.92794V1.98794C8.26881 1.82794 8.24881 1.69994 8.20881 1.60394C8.16881 1.49994 8.06881 1.41994 7.90881 1.36394L7.63281 1.25594V0.991943H9.92481L12.1808 6.85994L14.3048 0.991943H16.6448V1.25594L16.4528 1.31594C16.3008 1.36394 16.1968 1.43994 16.1408 1.54394C16.0848 1.63994 16.0568 1.76794 16.0568 1.92794C16.0488 2.39194 16.0448 2.85594 16.0448 3.31994C16.0448 3.77594 16.0448 4.23994 16.0448 4.71194V5.20394C16.0448 5.66794 16.0448 6.13194 16.0448 6.59594C16.0448 7.05994 16.0488 7.51994 16.0568 7.97594C16.0568 8.14394 16.0768 8.27194 16.1168 8.35994C16.1568 8.44794 16.2528 8.51994 16.4048 8.57594L16.6448 8.65994V8.92394H13.7288V8.65994L13.9928 8.57594C14.1448 8.51994 14.2368 8.44794 14.2688 8.35994C14.3088 8.26394 14.3288 8.13594 14.3288 7.97594V5.37194L14.3528 2.15594L11.9048 8.92394H11.2328L8.65281 2.22794L8.70081 4.96394V7.93994C8.70081 8.11594 8.72481 8.25594 8.77281 8.35994C8.82081 8.46394 8.92081 8.53594 9.07281 8.57594L9.31281 8.65994V8.92394H7.63281Z" fill="currentColor"/>
                <path d="M1.984 8.92396L2.296 6.84796H1V6.30796H2.38L2.764 3.79996H1.396V3.25996H2.848L3.16 1.18396H3.664L3.352 3.25996H5.38L5.704 1.18396H6.208L5.896 3.25996H7.144V3.79996H5.812L5.428 6.30796H6.748V6.84796H5.344L5.032 8.92396H4.516L4.84 6.84796H2.8L2.488 8.92396H1.984ZM2.884 6.30796H4.912L5.308 3.79996H3.268L2.884 6.30796Z" fill="currentColor"/>
              </svg>
              <span className="text-[9px] font-bold text-muted-foreground border border-border px-1.5 py-0.5 rounded leading-none uppercase tracking-wider">Beta</span>
            </Link>
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
              {currentMonth && <span>{currentMonth}</span>}
              {totalVotes !== undefined && (
                <>
                  {currentMonth && <Separator orientation="vertical" className="h-3" />}
                  <span className="text-foreground font-medium"><Counter value={totalVotes} className="text-foreground text-xs" /> oy</span>
                </>
              )}
              {daysRemaining !== undefined && daysRemaining > 0 && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span>{daysRemaining} gün</span>
                </>
              )}
            </div>
          </div>

          {/* Right: desktop nav + auth */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Button key={link.href} variant="ghost" size="sm" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            <Button variant="ghost" size="icon-sm" asChild>
              <a href="https://github.com/milletneder/milletneder" target="_blank" rel="noopener noreferrer" title="GitHub">
                <GithubIcon className="size-4" />
              </a>
            </Button>

            <Separator orientation="vertical" className="mx-1 h-5" />

            {onVoteClick && (
              <Button size="sm" onClick={onVoteClick}>
                <Vote className="size-3.5" data-icon="inline-start" />
                {userHasVoted ? 'Oy Değiştir' : 'Oy Ver'}
              </Button>
            )}

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="size-3.5" data-icon="inline-start" />
                    Hesabım
                    <ChevronDown className="size-3" data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link href="/profil">
                      <User className="size-3.5" />
                      Hesabıma Git
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-muted-foreground">
                    <LogOut className="size-3.5" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Popover open={showLoginForm} onOpenChange={setShowLoginForm}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LogIn className="size-3.5" data-icon="inline-start" />
                    Giriş
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4">
                  {loginFormContent}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Mobile: sheet trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon-sm">
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="text-left text-base">#MilletNeDer</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 mt-4">
                {navLinks.map((link) => (
                  <Button key={link.href} variant="ghost" className="justify-start" asChild>
                    <Link href={link.href} onClick={() => setMobileMenuOpen(false)}>
                      {link.label}
                    </Link>
                  </Button>
                ))}
                {isLoggedIn && (
                  <Button variant="ghost" className="justify-start" asChild>
                    <Link href="/profil" onClick={() => setMobileMenuOpen(false)}>
                      <User className="size-4" data-icon="inline-start" />
                      Hesabım
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" className="justify-start" asChild>
                  <a href="https://github.com/milletneder/milletneder" target="_blank" rel="noopener noreferrer">
                    <GithubIcon className="size-4" />
                    GitHub
                  </a>
                </Button>
              </div>

              {totalVotes !== undefined && (
                <div className="text-xs text-muted-foreground pt-3 mt-3 border-t border-border tabular-nums">
                  <span className="text-foreground font-medium"><Counter value={totalVotes} className="text-foreground text-xs" /> oy</span>
                  {daysRemaining !== undefined && daysRemaining > 0 && <span className="ml-3">{daysRemaining} gün</span>}
                </div>
              )}

              <Separator className="my-3" />

              <div className="space-y-3">
                {isLoggedIn ? (
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    <LogOut className="size-4" data-icon="inline-start" />
                    Çıkış Yap
                  </Button>
                ) : (
                  loginFormContent
                )}
              </div>

              {onVoteClick && (
                <Button className="w-full mt-3" onClick={() => { onVoteClick(); setMobileMenuOpen(false); }}>
                  <Vote className="size-4" data-icon="inline-start" />
                  {userHasVoted ? 'Oy Değiştir' : 'Oy Ver'}
                </Button>
              )}
            </SheetContent>
          </Sheet>
        </div>
        <DemographicBanner />
        <RecoveryCodesTopbar />
      </header>
      <div style={{ height: headerHeight }} />
    </>
  );
}
