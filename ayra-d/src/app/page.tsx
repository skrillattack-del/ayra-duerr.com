'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bike,
  ChevronRight,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  HeartPulse,
  Loader2,
  LockKeyhole,
  Mail,
  Target,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import PendoMascot from '@/components/pendo/PendoMascot';
import {
  PENDO_INSTAGRAM_HANDLE,
  PENDO_INSTAGRAM_URL,
  PENDO_PORTRAIT_ALT,
  PENDO_PORTRAIT_URL,
  PENDO_BREED,
} from '@/lib/pendo';
import { getEmailSector, mapAuthErrorToToast, type FieldErrors } from '@/lib/authFeedback';
import {
  DEFAULT_HOMEPAGE_PEOPLE,
  HOMEPAGE_PEOPLE_EVENT,
  type HomepagePerson,
  readHomepagePeople,
} from '@/lib/gongafitHomepage';

type AuthMode = 'login' | 'signup';

const mascotImage = PENDO_PORTRAIT_URL;

const trainerSlides = [
  {
    imageUrl: '/images/pendo/pendo-portrait.png',
    title: 'Meet Pendo',
    body: 'Our chief morale officer. A white doodle who treats every walk like the best one yet.',
  },
  {
    imageUrl: '/images/pendo/pendo-happy.png',
    title: 'Walk happy',
    body: 'Tongue out, ears up. Every mile is the best mile.',
  },
  {
    imageUrl: '/images/pendo/pendo-grass.png',
    title: 'Play hard',
    body: 'Sprints, rolls, and full-body wiggles in the grass.',
  },
  {
    imageUrl: '/images/pendo/pendo-rest-rocks.png',
    title: 'Rest well',
    body: 'Even high-energy pups nap. Recovery is training.',
  },
  {
    imageUrl: '/images/pendo/pendo-pillow.png',
    title: 'Recover cozy',
    body: 'Chin on the pillow. Sleep is part of the plan.',
  },
];

const workoutChips = [
  { label: 'HIIT', Icon: Flame, color: '#dc322f', bg: '#fce4e1' },
  { label: 'Strength', Icon: Dumbbell, color: '#859900', bg: '#e8f5c8' },
  { label: 'Yoga', Icon: HeartPulse, color: '#2aa198', bg: '#d5eff7' },
  { label: 'Cycling', Icon: Bike, color: '#b58900', bg: '#f5e6c4' },
  { label: 'Community', Icon: Users, color: '#cb4b16', bg: '#fce4e1' },
];

const toolHighlights = [
  {
    title: 'Track progress',
    body: 'See stats and celebrate wins.',
    Icon: ArrowRight,
    color: '#268bd2',
  },
  { title: 'Stay consistent', body: 'Build streaks and habits.', Icon: Target, color: '#859900' },
  { title: 'Train together', body: 'Move with friends.', Icon: Users, color: '#b58900' },
];

export default function GongaFitLanding() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf6e3]" />}>
      <GongaFitLandingInner />
    </Suspense>
  );
}

function GongaFitLandingInner() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codename, setCodename] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [people, setPeople] = useState<HomepagePerson[]>(DEFAULT_HOMEPAGE_PEOPLE);
  const [activeSlide, setActiveSlide] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledReasonRef = useRef(false);
  const { login, register, loading, user } = useAuth();
  const { toast } = useToast();

  const isLockedOut = cooldownSeconds !== null && cooldownSeconds > 0;
  const currentSlide = trainerSlides[activeSlide];

  useEffect(() => {
    setPeople(readHomepagePeople());

    const syncPeople = () => setPeople(readHomepagePeople());
    window.addEventListener('storage', syncPeople);
    window.addEventListener(HOMEPAGE_PEOPLE_EVENT, syncPeople);

    return () => {
      window.removeEventListener('storage', syncPeople);
      window.removeEventListener(HOMEPAGE_PEOPLE_EVENT, syncPeople);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide(current => (current + 1) % trainerSlides.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

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
        message: 'Authenticate to access GongaFit.',
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
          message: 'Your GongaFit space is ready.',
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

  return (
    <div className="min-h-screen overflow-hidden bg-[#fdf6e3] text-[#002b36] selection:bg-[#b58900] selection:text-[#fdf6e3]">
      <main className="min-h-screen p-3 sm:p-5 lg:p-7">
        <section className="relative min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[28px] border border-[#eee8d5]/80 bg-[#fdf6e3] shadow-[0_24px_80px_rgba(0,43,54,0.18)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#fdf6e3] via-[#eee8d5] to-[#eee8d5]" />
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide.imageUrl}
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute bottom-0 right-0 top-0 hidden h-full w-[68%] object-cover object-center lg:block"
            />
          </AnimatePresence>
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[#fdf6e3] via-[#fdf6e3]/90 to-[#fdf6e3]/16 lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#eee8d5] to-transparent" />

          <div className="relative z-10 flex min-h-[calc(100vh-1.5rem)] flex-col sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)]">
            <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
              <button
                type="button"
                className="flex items-center gap-3"
                aria-label="GongaFit home"
                onClick={() => router.push('/')}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dc322f] text-3xl font-black text-white shadow-[0_10px_20px_rgba(220,50,47,0.28)]">
                  G
                </span>
                <span className="text-2xl font-black text-[#002b36]">
                  Gonga<span className="text-[#dc322f]">Fit</span>
                </span>
              </button>

              <nav className="hidden items-center gap-8 text-sm font-black text-[#002b36] lg:flex">
                <span>Workouts</span>
                <span>Programs</span>
                <span>Community</span>
                <span>Progress</span>
                <Link href="/contact" className="hover:text-[#dc322f] transition-colors">
                  Contact
                </Link>
              </nav>

              <button
                type="button"
                onClick={() => setMode('signup')}
                className="hidden items-center gap-2 rounded-full bg-[#859900] px-5 py-3 text-sm font-black text-[#002b36] shadow-[0_12px_24px_rgba(133,153,0,0.22)] transition hover:-translate-y-0.5 hover:bg-[#859900] sm:inline-flex"
              >
                Start training
                <ChevronRight className="h-4 w-4" />
              </button>
            </header>

            <div className="grid flex-1 auto-rows-max content-start items-start gap-6 px-5 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:px-10 lg:pb-24">
              <div className="max-w-4xl pt-5 lg:pt-0">
                <motion.h1
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="max-w-3xl text-5xl font-black leading-[0.96] text-[#002b36] sm:text-7xl lg:text-8xl"
                >
                  Walk, play, rest with <span className="text-[#dc322f]">Pendo</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
                  className="mt-4 max-w-xl text-lg font-medium leading-7 text-[#586e75] sm:mt-6 sm:text-xl sm:leading-8"
                >
                  Move with coaches, friends, and Pendo — the {PENDO_BREED} who never skips a walk.
                </motion.p>

                <motion.div
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.14, ease: 'easeOut' }}
                  className="mt-6 flex flex-wrap gap-3 sm:mt-8 sm:gap-4"
                >
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="inline-flex h-14 items-center gap-3 rounded-full bg-[#dc322f] px-6 text-base font-black text-white shadow-[0_16px_30px_rgba(220,50,47,0.3)] transition hover:-translate-y-0.5 hover:bg-[#cb4b16]"
                  >
                    Start training
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="inline-flex h-14 items-center rounded-full border border-[#93a1a1] bg-[#eee8d5]/90 px-6 text-base font-black text-[#002b36] shadow-[0_10px_24px_rgba(0,43,54,0.10)] transition hover:-translate-y-0.5 hover:border-[#dc322f]"
                  >
                    Log in
                  </button>
                </motion.div>

                <a
                  href={PENDO_INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center gap-3 rounded-full border border-[#eee8d5] bg-[#eee8d5]/90 py-2 pl-2 pr-5 text-sm font-black text-[#002b36] shadow-[0_10px_20px_rgba(0,43,54,0.10)] transition hover:-translate-y-0.5 hover:border-[#dc322f]"
                >
                  <PendoMascot className="h-9 w-9" />
                  Follow Pendo on Instagram · {PENDO_INSTAGRAM_HANDLE}
                </a>

                <div className="mt-10 hidden max-w-2xl grid-cols-3 gap-3 lg:grid">
                  {people.map(person => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>

                <div className="mt-6 hidden max-w-3xl flex-wrap gap-3 lg:flex">
                  {workoutChips.map(({ label, Icon, color, bg }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full border border-[#eee8d5] bg-[#eee8d5]/90 px-4 py-3 text-sm font-black text-[#002b36] shadow-[0_10px_20px_rgba(0,43,54,0.10)]"
                    >
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: bg, color }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </span>
                  ))}
                </div>
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
                <TrainerSlideshow
                  activeSlide={activeSlide}
                  setActiveSlide={setActiveSlide}
                  className="mb-5"
                />
                <div className="grid grid-cols-3 gap-3">
                  {people.map(person => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {workoutChips.map(({ label, Icon, color, bg }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full border border-[#eee8d5] bg-[#eee8d5]/90 px-4 py-3 text-sm font-black text-[#002b36] shadow-[0_10px_20px_rgba(0,43,54,0.10)]"
                    >
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: bg, color }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-32 right-[470px] z-20 hidden gap-2 lg:flex">
              {trainerSlides.map((item, index) => (
                <button
                  key={item.imageUrl}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeSlide
                      ? 'w-8 bg-[#dc322f]'
                      : 'w-2 bg-[#eee8d5]/80 hover:bg-[#eee8d5]'
                  }`}
                  aria-label={`Show ${item.title}`}
                />
              ))}
            </div>

            <div className="relative z-10 mx-5 mb-5 rounded-[28px] bg-[#eee8d5]/92 px-6 py-6 shadow-[0_18px_44px_rgba(0,43,54,0.12)] sm:mx-8 lg:mx-10">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_repeat(3,1fr)] lg:items-center">
                <h2 className="text-3xl font-black leading-tight text-[#002b36]">
                  All the tools to reach your goals
                </h2>
                {toolHighlights.map(({ title, body, Icon, color }) => (
                  <div key={title} className="flex items-center gap-4">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[#002b36]"
                      style={{ backgroundColor: color }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-black text-[#002b36]">{title}</p>
                      <p className="text-sm font-medium leading-5 text-[#657b83]">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function PersonCard({ person }: { person: HomepagePerson }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#eee8d5] shadow-[0_14px_30px_rgba(0,43,54,0.18)]">
      <div className="h-28 bg-[#fdf6e3] sm:h-32 lg:h-24" style={{ backgroundColor: person.accent }}>
        <img src={person.imageUrl} alt="" className="h-full w-full object-cover object-top" />
      </div>
      <div className="min-h-[72px] px-2 py-3 text-center sm:px-3">
        <p className="text-sm font-black leading-tight text-[#002b36] sm:text-base lg:text-lg">
          {person.name}
        </p>
        <p className="mt-1 text-[11px] font-bold leading-tight text-[#657b83] sm:text-xs">
          {person.role}
        </p>
      </div>
    </div>
  );
}

function TrainerSlideshow({
  activeSlide,
  setActiveSlide,
  className = '',
  compact = false,
}: {
  activeSlide: number;
  setActiveSlide: (index: number) => void;
  className?: string;
  compact?: boolean;
}) {
  const slide = trainerSlides[activeSlide];

  return (
    <div
      className={`overflow-hidden rounded-[24px] bg-[#eee8d5]/92 shadow-[0_18px_44px_rgba(0,43,54,0.18)] backdrop-blur ${className}`}
    >
      <div className={compact ? 'h-40' : 'h-56 sm:h-64'}>
        <AnimatePresence mode="wait">
          <motion.img
            key={slide.imageUrl}
            src={slide.imageUrl}
            alt={slide.title}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="h-full w-full object-cover object-top"
          />
        </AnimatePresence>
      </div>
      <div className="p-4">
        <p className="text-base font-black text-[#002b36]">{slide.title}</p>
        {!compact && (
          <p className="mt-1 text-sm font-medium leading-5 text-[#657b83]">{slide.body}</p>
        )}
        <div className="mt-3 flex gap-2">
          {trainerSlides.map((item, index) => (
            <button
              key={item.imageUrl}
              type="button"
              onClick={() => setActiveSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === activeSlide ? 'w-7 bg-[#dc322f]' : 'w-2 bg-[#93a1a1] hover:bg-[#657b83]'
              }`}
              aria-label={`Show ${item.title}`}
            />
          ))}
        </div>
      </div>
    </div>
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
              : 'Create your GongaFit account.'}
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
