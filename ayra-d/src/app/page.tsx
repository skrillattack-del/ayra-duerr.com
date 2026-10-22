'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bone,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  Leaf,
  Loader2,
  LockKeyhole,
  Mail,
  PawPrint,
  Snowflake,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  PENDO_INSTAGRAM_HANDLE,
  PENDO_INSTAGRAM_URL,
  PENDO_PORTRAIT_ALT,
  PENDO_PORTRAIT_URL,
} from '@/lib/pendo';
import { getEmailSector, mapAuthErrorToToast, type FieldErrors } from '@/lib/authFeedback';

type AuthMode = 'login' | 'signup';

const mascotImage = PENDO_PORTRAIT_URL;

const heroPhoto = {
  imageUrl: '/images/pendo/gallery/hero-grass.png',
  title: 'Pendo the Poodle',
  body: 'Cream-coated, curly-haired, and photographed in every season.',
};

const galleryFilters = ['All photos', 'Snow mode', 'Outdoor mode', 'Cushion mode', 'Dressed up'] as const;

const galleryPhotos = [
  { title: 'Snow stand', mode: 'Snow mode', imageUrl: '/images/pendo/gallery/snow-stand.png' },
  { title: 'Snow sit', mode: 'Snow mode', imageUrl: '/images/pendo/gallery/snow-sit.png' },
  { title: 'Deck in snow', mode: 'Snow mode', imageUrl: '/images/pendo/gallery/deck-in-snow.png' },
  { title: 'Snow nap', mode: 'Snow mode', imageUrl: '/images/pendo/gallery/snow-nap.png' },
  { title: 'Leaf pile', mode: 'Outdoor mode', imageUrl: '/images/pendo/gallery/leaf-pile.png' },
  { title: 'Hillside sit', mode: 'Outdoor mode', imageUrl: '/images/pendo/gallery/hillside-sit.png' },
  { title: 'Garden stroll', mode: 'Outdoor mode', imageUrl: '/images/pendo/gallery/garden-stroll.png' },
  { title: 'Paw mat', mode: 'Cushion mode', imageUrl: '/images/pendo/gallery/paw-mat.png' },
  { title: 'Red cushion', mode: 'Cushion mode', imageUrl: '/images/pendo/gallery/red-cushion.png' },
  { title: 'Heart tag', mode: 'Dressed up', imageUrl: '/images/pendo/gallery/heart-tag.png' },
  { title: 'Green bandana', mode: 'Dressed up', imageUrl: '/images/pendo/gallery/green-bandana.png' },
  { title: 'Christmas lights', mode: 'Dressed up', imageUrl: '/images/pendo/gallery/christmas-lights.png' },
] as const;

const galleryMarkers = [
  { label: 'Heart tag', Icon: Heart, color: '#a92845' },
  { label: 'Paw-print mat', Icon: PawPrint, color: '#80634f' },
  { label: 'Red bone', Icon: Bone, color: '#a92845' },
  { label: 'Snow day', Icon: Snowflake, color: '#181414' },
  { label: 'Leaf pile', Icon: Leaf, color: '#4d7b45' },
];

export default function PendoLanding() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf6e3]" />}>
      <PendoLandingInner />
    </Suspense>
  );
}

function PendoLandingInner() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codename, setCodename] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<(typeof galleryFilters)[number]>('All photos');
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledReasonRef = useRef(false);
  const { login, register, loading, user } = useAuth();
  const { toast } = useToast();

  const isLockedOut = cooldownSeconds !== null && cooldownSeconds > 0;
  const scrollToGallery = () => {
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (handledReasonRef.current) return;
    const reason = searchParams.get('reason');
    if (!reason) return;

    handledReasonRef.current = true;

    if (reason === 'session-expired') {
      toast({
        status: 'WARN',
        title: 'SESSION EXPIRED',
        message: 'Sign in again to continue.',
        sector: 'AUTH',
      });
    } else if (reason === 'login-required') {
      toast({
        status: 'INFO',
        title: 'LOGIN REQUIRED',
        message: 'Authenticate to access Pendo.',
        sector: 'AUTH',
      });
    } else if (reason === 'signed-out') {
      toast({
        status: 'OK',
        title: 'SIGNED OUT',
        message: 'You are safely signed out.',
        sector: 'AUTH',
      });
    }

    router.replace('/');
  }, [router, searchParams, toast]);

  useEffect(() => {
    if (redirecting) return;
    if (loading) return;
    if (!user) return;

    toast({
      status: 'INFO',
      title: 'SESSION ACTIVE',
      message: 'Opening your dashboard.',
      sector: 'AUTH',
    });

    setRedirecting(true);
    router.replace('/dashboard');
  }, [loading, redirecting, router, toast, user]);

  useEffect(() => {
    if (!isLockedOut) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev === null) return prev;
        if (prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut]);

  const submitDisabled = useMemo(
    () => loading || redirecting || isLockedOut,
    [loading, redirecting, isLockedOut]
  );

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateInputs = ():
    { ok: true; email: string; password: string; codename: string } | { ok: false } => {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();
    const trimmedCodename = codename.trim();

    if (!trimmedEmail) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      nextErrors.email = 'Enter a valid email address';

    if (!password) nextErrors.password = 'Password is required';
    else if (mode === 'signup' && password.length < 8)
      nextErrors.password = 'Password must be at least 8 characters';

    if (mode === 'signup' && !trimmedCodename) nextErrors.codename = 'Codename is required';

    setFieldErrors(nextErrors);

    const firstError = nextErrors.email || nextErrors.password || nextErrors.codename;
    if (firstError) {
      toast({
        status: 'WARN',
        title: 'CHECK YOUR INPUTS',
        message: firstError,
        sector: 'AUTH',
      });
      return { ok: false };
    }

    return { ok: true, email: trimmedEmail, password, codename: trimmedCodename };
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;

    const validated = validateInputs();
    if (!validated.ok) return;

    try {
      if (mode === 'login') {
        await login(validated.email, validated.password);
        toast({
          status: 'OK',
          title: 'WELCOME BACK',
          message: 'Opening your dashboard.',
          sector: 'AUTH',
        });
      } else {
        await register(validated.email, validated.password, validated.codename);
        toast({
          status: 'OK',
          title: 'ACCOUNT READY',
          message: 'Your Pendo space is ready.',
          sector: getEmailSector(validated.email),
        });
      }
      setRedirecting(true);
      router.push('/dashboard');
    } catch (error: any) {
      const mapped = mapAuthErrorToToast({ mode, email: validated.email, error });
      if (mode === 'signup' && mapped.toast.title === 'OPERATIVE EXISTS') {
        setMode('login');
        setCodename('');
        setCapsLockOn(false);
      }
      if (mapped.fieldErrors) setFieldErrors(prev => ({ ...prev, ...mapped.fieldErrors }));
      if (mapped.retryAfterSeconds) setCooldownSeconds(mapped.retryAfterSeconds);
      toast(mapped.toast);
    }
  };

  const handleEnterSubmit = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleSubmit();
  };

  const handleGuest = () => {
    sessionStorage.setItem('pendo-guest', '1');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fdf6e3] text-[#002b36] selection:bg-[#b58900] selection:text-[#fdf6e3]">
      <main className="min-h-screen p-3 sm:p-5 lg:p-7">
        <section className="relative min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[28px] border border-[#eee8d5]/80 bg-[#fdf6e3] shadow-[0_24px_80px_rgba(0,43,54,0.18)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#fdf6e3] via-[#eee8d5] to-[#eee8d5]" />
          <img
            src={heroPhoto.imageUrl}
            alt={heroPhoto.title}
            className="absolute bottom-0 right-0 top-0 hidden h-full w-[68%] object-cover object-center lg:block"
          />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[#fdf6e3] via-[#fdf6e3]/90 to-[#fdf6e3]/16 lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#eee8d5] to-transparent" />

          <div className="relative z-10 flex min-h-[calc(100vh-1.5rem)] flex-col sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)]">
            <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
              <button
                type="button"
                className="flex items-center gap-3"
                aria-label="Pendo home"
                onClick={() => router.push('/')}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dc322f] text-3xl font-black text-white shadow-[0_10px_20px_rgba(220,50,47,0.28)]">
                  P
                </span>
                <span className="text-2xl font-black text-[#002b36]">
                  Pendo<span className="text-[#dc322f]"> the Poodle</span>
                </span>
              </button>

              <nav className="hidden items-center gap-8 text-sm font-black text-[#002b36] lg:flex">
                <button type="button" onClick={scrollToGallery} className="transition-colors hover:text-[#a92845]">
                  Gallery
                </button>
                <a href={PENDO_INSTAGRAM_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[#a92845]">
                  Instagram
                </a>
                <Link href="/contact" className="hover:text-[#dc322f] transition-colors">
                  Contact
                </Link>
              </nav>

              <button
                type="button"
                onClick={() => setMode('signup')}
                className="hidden items-center gap-2 rounded-full bg-[#859900] px-5 py-3 text-sm font-black text-[#002b36] shadow-[0_12px_24px_rgba(133,153,0,0.22)] transition hover:-translate-y-0.5 hover:bg-[#859900] sm:inline-flex"
              >
                Join Pendo
                <ChevronRight className="h-4 w-4" />
              </button>
            </header>

            <div className="grid flex-1 auto-rows-max content-start items-start gap-6 px-5 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:px-10 lg:pb-24">
              <div className="max-w-4xl pt-5 lg:pt-0">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-[#80634f] sm:mb-5">
                  The poodle-doodle
                </p>
                <motion.h1
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="max-w-3xl font-serif text-5xl font-black leading-[0.96] text-[#002b36] sm:text-7xl lg:text-8xl"
                >
                  Pendo
                </motion.h1>
                <motion.p
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
                  className="mt-4 max-w-xl text-lg font-medium leading-7 text-[#586e75] sm:mt-6 sm:text-xl sm:leading-8"
                >
                  Cream-coated, curly-haired, and photographed in every season, from fresh snow to the Christmas tree.
                </motion.p>

                <motion.div
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.14, ease: 'easeOut' }}
                  className="mt-6 flex flex-wrap gap-3 sm:mt-8 sm:gap-4"
                >
                  <a
                    href={PENDO_INSTAGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-14 items-center gap-3 rounded-full bg-[#dc322f] px-6 text-base font-black text-white shadow-[0_16px_30px_rgba(220,50,47,0.3)] transition hover:-translate-y-0.5 hover:bg-[#cb4b16]"
                  >
                    Follow {PENDO_INSTAGRAM_HANDLE}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <button
                    type="button"
                    onClick={scrollToGallery}
                    className="inline-flex h-14 items-center rounded-full border border-[#93a1a1] bg-[#eee8d5]/90 px-6 text-base font-black text-[#002b36] shadow-[0_10px_24px_rgba(0,43,54,0.10)] transition hover:-translate-y-0.5 hover:border-[#dc322f]"
                  >
                    See the photos
                  </button>
                  <button
                    type="button"
                    onClick={handleGuest}
                    className="inline-flex h-14 items-center gap-2 rounded-full border border-dashed border-[#93a1a1] bg-transparent px-6 text-base font-semibold text-[#657b83] transition hover:-translate-y-0.5 hover:border-[#b58900] hover:text-[#b58900]"
                  >
                    Continue as guest
                  </button>
                </motion.div>

              </div>

              <AuthPanel
                mode={mode}
                setMode={setMode}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                codename={codename}
                setCodename={setCodename}
                fieldErrors={fieldErrors}
                clearFieldError={clearFieldError}
                capsLockOn={capsLockOn}
                setCapsLockOn={setCapsLockOn}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                submitDisabled={submitDisabled}
                redirecting={redirecting}
                isLockedOut={isLockedOut}
                cooldownSeconds={cooldownSeconds}
                loading={loading}
                handleSubmit={handleSubmit}
                handleEnterSubmit={handleEnterSubmit}
              />

              <div className="lg:hidden">
                <div className="mb-5 overflow-hidden rounded-[24px] bg-[#eee8d5]/92 shadow-[0_18px_44px_rgba(0,43,54,0.18)] backdrop-blur">
                  <div className="h-56 sm:h-64">
                    <img
                      src={heroPhoto.imageUrl}
                      alt={heroPhoto.title}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-base font-black text-[#002b36]">{heroPhoto.title}</p>
                    <p className="mt-1 text-sm font-medium leading-5 text-[#657b83]">{heroPhoto.body}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
        <PendoGallery activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      </main>
    </div>
  );
}

function PendoGallery({
  activeFilter,
  setActiveFilter,
}: {
  activeFilter: (typeof galleryFilters)[number];
  setActiveFilter: (filter: (typeof galleryFilters)[number]) => void;
}) {
  const visiblePhotos = galleryPhotos.filter(
    photo => activeFilter === 'All photos' || photo.mode === activeFilter
  );

  return (
    <section id="gallery" className="mx-auto max-w-7xl scroll-mt-8 py-16 sm:py-24">
      <div className="mb-10 grid gap-7 border-y border-[#dccfbd] bg-[#e8ddce] px-5 py-6 sm:grid-cols-5 sm:px-10">
        {galleryMarkers.map(({ label, Icon, color }) => (
          <div key={label} className="flex items-center gap-3 text-sm font-black text-[#2a211d]">
            <Icon className="h-6 w-6" style={{ color }} strokeWidth={2.4} />
            {label}
          </div>
        ))}
      </div>

      <div className="px-2 sm:px-4">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#80634f]">A seasonal archive</p>
        <h2 className="mt-3 font-serif text-5xl font-black tracking-[-0.04em] text-[#181414] sm:text-6xl">
          The photos
        </h2>
        <p className="mt-3 text-base font-medium text-[#806f64]">Pick a mode to filter the gallery.</p>

        <div className="mt-7 flex flex-wrap gap-2.5" role="group" aria-label="Filter Pendo's photos">
          {galleryFilters.map(filter => {
            const active = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-4 py-2.5 text-sm font-black transition ${
                  active
                    ? 'border-[#181414] bg-[#181414] text-[#f8f3eb]'
                    : 'border-[#7b7068] bg-transparent text-[#2a211d] hover:border-[#a92845] hover:text-[#a92845]'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {visiblePhotos.map(photo => (
            <figure key={photo.title} className="group min-w-0">
              <div className="aspect-[1.3] overflow-hidden rounded-[18px] bg-[#e8ddce]">
                <img
                  src={photo.imageUrl}
                  alt={`Pendo: ${photo.title}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                />
              </div>
              <figcaption className="mt-3 text-sm font-black leading-5 text-[#181414]">
                {photo.title}
                <span className="font-medium text-[#80634f]"> · {photo.mode}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <footer className="mt-20 flex flex-col gap-5 bg-[#181414] px-6 py-9 text-[#f8f3eb] sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <p className="font-serif text-3xl font-black tracking-[-0.03em]">Pendo the Poodle</p>
          <p className="mt-2 text-sm font-medium text-[#d9cbbd]">One curly coat, every season. Follow along on Instagram.</p>
        </div>
        <a
          href={PENDO_INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit rounded-full bg-[#f8f3eb] px-5 py-3 text-sm font-black text-[#181414] transition hover:bg-[#e8ddce]"
        >
          {PENDO_INSTAGRAM_HANDLE}
        </a>
      </footer>
    </section>
  );
}

type AuthPanelProps = {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  codename: string;
  setCodename: (value: string) => void;
  fieldErrors: FieldErrors;
  clearFieldError: (field: keyof FieldErrors) => void;
  capsLockOn: boolean;
  setCapsLockOn: (value: boolean) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  submitDisabled: boolean;
  redirecting: boolean;
  isLockedOut: boolean;
  cooldownSeconds: number | null;
  loading: boolean;
  handleSubmit: () => void;
  handleEnterSubmit: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function AuthPanel({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  codename,
  setCodename,
  fieldErrors,
  clearFieldError,
  capsLockOn,
  setCapsLockOn,
  showPassword,
  setShowPassword,
  submitDisabled,
  redirecting,
  isLockedOut,
  cooldownSeconds,
  loading,
  handleSubmit,
  handleEnterSubmit,
}: AuthPanelProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
      className="rounded-[30px] border border-[#eee8d5] bg-[#eee8d5]/95 p-6 shadow-[0_24px_70px_rgba(0,43,54,0.18)] backdrop-blur md:p-8"
    >
      <div className="mb-7 flex items-center justify-between gap-5">
        <div>
          <h2 className="text-4xl font-black text-[#002b36]">
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </h2>
          <p className="mt-2 text-base font-medium text-[#657b83]">
            {mode === 'login'
              ? "Welcome back. Let's get you moving."
              : 'Create your Pendo account.'}
          </p>
        </div>
        <img
          src={mascotImage}
          alt={PENDO_PORTRAIT_ALT}
          className="h-20 w-20 rounded-3xl object-cover shadow-[0_12px_24px_rgba(181,137,0,0.25)]"
        />
      </div>

      <div className="space-y-4">
        {fieldErrors.general && (
          <div className="rounded-2xl bg-[#dc322f]/10 border border-[#dc322f] p-4 text-sm font-bold text-[#cb4b16] shadow-sm">
            {fieldErrors.general}
          </div>
        )}

        <label className="block text-sm font-black text-[#002b36]">
          Email
          <span
            className={`mt-2 flex h-12 items-center gap-3 rounded-2xl border bg-[#fdf6e3] px-4 ${
              fieldErrors.email ? 'border-[#dc322f]' : 'border-[#93a1a1]'
            }`}
          >
            <Mail className="h-5 w-5 text-[#657b83]" />
            <input
              value={email}
              onChange={event => {
                setEmail(event.target.value);
                clearFieldError('email');
              }}
              onKeyDown={handleEnterSubmit}
              type="email"
              autoComplete="email"
              aria-invalid={fieldErrors.email ? true : undefined}
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#002b36] outline-none placeholder:text-[#93a1a1]"
            />
          </span>
        </label>
        {fieldErrors.email && (
          <p className="-mt-2 text-xs font-bold text-[#dc322f]">{fieldErrors.email}</p>
        )}

        <label className="block text-sm font-black text-[#002b36]">
          Password
          <span
            className={`mt-2 flex h-12 items-center gap-3 rounded-2xl border bg-[#fdf6e3] px-4 ${
              fieldErrors.password ? 'border-[#dc322f]' : 'border-[#93a1a1]'
            }`}
          >
            <LockKeyhole className="h-5 w-5 text-[#657b83]" />
            <input
              value={password}
              onChange={event => {
                setPassword(event.target.value);
                clearFieldError('password');
              }}
              onKeyDown={event => {
                setCapsLockOn(event.getModifierState('CapsLock'));
                handleEnterSubmit(event);
              }}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              aria-invalid={fieldErrors.password ? true : undefined}
              placeholder="Enter your password"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#002b36] outline-none placeholder:text-[#93a1a1]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#657b83] transition hover:text-[#002b36]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </span>
        </label>

        {(fieldErrors.password || capsLockOn) && (
          <div className="-mt-2 flex items-start justify-between gap-3">
            <div>
              {fieldErrors.password && (
                <p className="text-xs font-bold text-[#dc322f]">{fieldErrors.password}</p>
              )}
              {capsLockOn && <p className="text-xs font-bold text-[#b58900]">Caps lock is on</p>}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {mode === 'signup' && (
            <motion.label
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="block overflow-hidden text-sm font-black text-[#002b36]"
            >
              Display name
              <span
                className={`mt-2 flex h-12 items-center gap-3 rounded-2xl border bg-[#fdf6e3] px-4 ${
                  fieldErrors.codename ? 'border-[#dc322f]' : 'border-[#93a1a1]'
                }`}
              >
                <Users className="h-5 w-5 text-[#657b83]" />
                <input
                  value={codename}
                  onChange={event => {
                    setCodename(event.target.value);
                    clearFieldError('codename');
                  }}
                  onKeyDown={handleEnterSubmit}
                  type="text"
                  autoComplete="nickname"
                  aria-invalid={fieldErrors.codename ? true : undefined}
                  placeholder="Your name"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#002b36] outline-none placeholder:text-[#93a1a1]"
                />
              </span>
              {fieldErrors.codename && (
                <p className="mt-2 text-xs font-bold text-[#dc322f]">{fieldErrors.codename}</p>
              )}
            </motion.label>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          whileHover={{ scale: submitDisabled ? 1 : 1.02 }}
          whileTap={{ scale: submitDisabled ? 1 : 0.98 }}
          layout
          className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#dc322f] text-base font-black text-white shadow-[0_14px_28px_rgba(220,50,47,0.32)] transition-colors hover:bg-[#cb4b16] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {redirecting
            ? 'Opening...'
            : isLockedOut
              ? `Wait ${cooldownSeconds}s`
              : loading
                ? 'Working...'
                : mode === 'login'
                  ? 'Log in'
                  : 'Create account'}
          {submitDisabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </motion.button>

        <div className="flex items-center justify-center gap-2 pt-2 text-sm font-semibold text-[#657b83]">
          <span>{mode === 'login' ? 'New here?' : 'Already moving?'}</span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setCodename('');
            }}
            className="font-black text-[#dc322f] transition hover:text-[#cb4b16]"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
