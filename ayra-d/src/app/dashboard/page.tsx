'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BarChart3,
  Bone,
  CalendarDays,
  Check,
  GraduationCap,
  HeartPulse,
  Image as ImageIcon,
  PawPrint,
  Smile,
  Trophy,
  Utensils,
  UsersRound,
} from 'lucide-react'

function IconBubble({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="pendo-icon-bubble" aria-hidden="true">
      <Icon className="h-5 w-5" strokeWidth={2.2} />
    </span>
  )
}

function OpenLink({ href, children }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="pendo-open-link">
      {children || 'Open'} <ArrowRight className="h-4 w-4" strokeWidth={2.3} />
    </Link>
  )
}

function StatCard({
  icon,
  label,
  title,
  detail,
  href,
  children,
}: {
  icon: LucideIcon
  label: string
  title: string
  detail: string
  href?: string
  children?: React.ReactNode
}) {
  const content = (
    <>
      <IconBubble icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="pendo-eyebrow">{label}</p>
        <p className="pendo-stat-title">{title}</p>
        <p className="pendo-stat-detail">{detail}</p>
      </div>
      {children}
      {href && <ArrowRight className="h-5 w-5 shrink-0 text-[#b9cbe4]" />}
    </>
  )

  return href ? (
    <Link href={href} className="pendo-stat-card">
      {content}
    </Link>
  ) : (
    <div className="pendo-stat-card">{content}</div>
  )
}

function FeatureCard({
  href,
  icon,
  title,
  subtitle,
  description,
  image,
  imageAlt,
  className = '',
}: {
  href: string
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  image: string
  imageAlt: string
  className?: string
}) {
  return (
    <div className={`pendo-feature-card ${className}`}>
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start gap-3">
          <IconBubble icon={icon} />
          <div>
            <h2 className="pendo-card-title">{title}</h2>
            <p className="pendo-card-subtitle">{subtitle}</p>
          </div>
        </div>
        <p className="pendo-card-description">{description}</p>
        <OpenLink href={href}>{`Open ${title}`}</OpenLink>
      </div>
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(max-width: 900px) 100vw, 30vw"
        className="pendo-feature-image"
      />
      <div className="pendo-feature-shade" aria-hidden="true" />
    </div>
  )
}

function SimpleCard({
  href,
  icon,
  title,
  subtitle,
  description,
  children,
  className = '',
}: {
  href: string
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`pendo-simple-card ${className}`}>
      <div className="relative z-10 flex h-full min-w-0 flex-col">
        <div className="flex items-start gap-3">
          <IconBubble icon={icon} />
          <div className="min-w-0">
            <h2 className="pendo-card-title">{title}</h2>
            <p className="pendo-card-subtitle">{subtitle}</p>
          </div>
        </div>
        <p className="pendo-card-description">{description}</p>
        <OpenLink href={href}>{`Open ${title}`}</OpenLink>
      </div>
      {children}
    </div>
  )
}

function ProgressVisual() {
  return (
    <div className="pendo-progress-visual" aria-hidden="true">
      <ArrowRight className="pendo-progress-arrow" />
      <div className="pendo-progress-bars">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function PhotoStack() {
  return (
    <div className="pendo-photo-stack" aria-hidden="true">
      <div className="pendo-photo pendo-photo-back">
        <Image src="/images/pendo/gallery/heart-tag.png" alt="" fill sizes="120px" />
      </div>
      <div className="pendo-photo pendo-photo-front">
        <Image src="/images/pendo/gallery/green-bandana.png" alt="" fill sizes="120px" />
      </div>
      <span className="pendo-photo-heart">♡</span>
    </div>
  )
}

export default function DashboardOverview() {
  const { user } = useAuth()
  const firstName = user?.display_name?.trim().split(/\s+/)[0] || 'John'
  const profileName = user?.display_name || 'john'
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="pendo-dashboard" data-testid="pendo-dashboard">
      <section className="pendo-stat-grid" aria-label="Today at a glance">
        <StatCard icon={PawPrint} label="This week’s walks" title="4" detail="walks completed">
          <div className="pendo-mini-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </StatCard>
        <StatCard
          icon={CalendarDays}
          label="Next up"
          title="Evening Walk"
          detail="Today at 5:00 PM"
          href="/dashboard/workouts"
        />
        <StatCard
          icon={Utensils}
          label="Meal today"
          title="Breakfast"
          detail="1 cup · 8:00 AM"
          href="/dashboard/nutrition"
        />
        <StatCard icon={Smile} label="Pendo’s mood" title="Happy" detail="Tail’s up! 💗">
          <span className="pendo-mood-paw" aria-hidden="true">
            ✦
          </span>
        </StatCard>
      </section>

      <section className="pendo-feature-grid" aria-label="Pendo’s day">
        <div className="pendo-hero-card">
          <div className="pendo-hero-copy">
            <h1>
              Good
              <br />
              morning, {firstName}!
            </h1>
            <p className="pendo-hero-lead">Pendo’s ready for a great day!</p>
            <p className="pendo-hero-description">
              Walks, good food, belly rubs, and new adventures ahead.
            </p>
            <Link href="/dashboard/workouts" className="pendo-primary-button">
              See today&apos;s plan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Image
            src="/images/pendo/gallery/hero-grass.png"
            alt="Pendo relaxing in the grass"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 45vw"
            className="pendo-hero-image"
          />
          <div className="pendo-hero-edge" aria-hidden="true" />
          <div className="pendo-hero-note" aria-hidden="true">
            <span>♡</span>
            Same day, more adventures!
            <small>✦</small>
          </div>
        </div>

        <FeatureCard
          href="/dashboard/workouts"
          icon={PawPrint}
          title="Walks"
          subtitle="Explore together"
          description="Log walks, discover new routes, and keep Pendo happy and healthy."
          image="/images/pendo/gallery/hero-grass.png"
          imageAlt="Pendo enjoying a sunny walk"
        />
        <FeatureCard
          href="/dashboard/programs"
          icon={GraduationCap}
          title="Training & Tricks"
          subtitle="A smarter, happier Pendo"
          description="Teach new tricks, follow training programs, and celebrate progress."
          image="/images/pendo/pendo-happy.png"
          imageAlt="Pendo ready to learn a new trick"
        />
      </section>

      <section className="pendo-simple-grid pendo-simple-grid--three" aria-label="Pendo’s tools">
        <SimpleCard
          href="/dashboard/nutrition"
          icon={Utensils}
          title="Nutrition"
          subtitle="Fuel for more good days"
          description="Track meals, recipes, and treats to keep Pendo healthy and strong."
          className="pendo-nutrition-card"
        >
          <div className="pendo-bowl" aria-hidden="true">
            <div className="pendo-bowl-food">••••••</div>
            <div className="pendo-bowl-base" />
            <Bone className="pendo-bowl-bone" />
          </div>
        </SimpleCard>
        <SimpleCard
          href="/dashboard/progress"
          icon={BarChart3}
          title="Progress"
          subtitle="See the journey"
          description="Track walks, training, weight, and milestones all in one place."
        >
          <ProgressVisual />
        </SimpleCard>
        <SimpleCard
          href="/"
          icon={ImageIcon}
          title="Photo Diary"
          subtitle="Capture the moments"
          description="Save and share Pendo’s best moments, big and small."
        >
          <PhotoStack />
        </SimpleCard>
      </section>

      <section className="pendo-simple-grid pendo-simple-grid--four" aria-label="More Pendo features">
        <SimpleCard
          href="/dashboard/nutrition"
          icon={HeartPulse}
          title="Health & Vet"
          subtitle="A healthy Pendo is a happy Pendo"
          description="Track vet visits, vaccinations, medications, and more."
        >
          <div className="pendo-health-kit" aria-hidden="true">
            <span>+</span>
          </div>
        </SimpleCard>
        <SimpleCard
          href="/dashboard/community"
          icon={UsersRound}
          title="Community"
          subtitle="Dog people, Pendo people"
          description="Join a community of poodle lovers. Share stories, get advice, and make new friends."
        >
          <div className="pendo-community-doodle" aria-hidden="true">
            ♡
            <small>♧</small>
          </div>
        </SimpleCard>
        <SimpleCard
          href="/dashboard/challenges"
          icon={Trophy}
          title="Challenges"
          subtitle="Small steps, big adventures"
          description="Take on fun challenges and earn badges with Pendo."
        >
          <div className="pendo-challenge-badge" aria-hidden="true">
            <PawPrint className="h-7 w-7" />
          </div>
        </SimpleCard>
        <SimpleCard
          href="/dashboard/challenges"
          icon={Bone}
          title="Toy Box"
          subtitle="Play, discover, repeat"
          description="Keep track of Pendo’s favorite toys and find new ones."
        >
          <div className="pendo-toy-visual" aria-hidden="true">
            <span className="pendo-ball" />
            <Bone className="h-10 w-10 rotate-[-20deg] text-[#f6c58b]" />
          </div>
        </SimpleCard>
      </section>

      {isAdmin && (
        <div className="pendo-admin-note">
          <Check className="h-4 w-4" />
          Admin tools are ready in your settings menu.
        </div>
      )}

      <span className="sr-only">Signed in as {profileName}</span>
    </div>
  )
}
