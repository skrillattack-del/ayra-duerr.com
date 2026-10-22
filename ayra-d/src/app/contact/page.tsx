'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { SiteRepository, type BusinessProfile } from '@/repositories/SiteRepository'
import Image from 'next/image'

export default function ContactPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    SiteRepository.getBusinessProfile()
      .then((data) => {
        setProfile(data)
      })
      .catch((err) => {
        console.error('Failed to load business profile', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-clean-accent selection:text-white pb-20">
      {/* Navbar Minimal */}
      <nav className="fixed top-0 left-0 right-0 h-20 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl z-50 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
            </div>
            <span className="font-bold tracking-wider">BACK TO SITE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Image src="/images/pendo/pendo-portrait.png" alt="Pendo the doodle" width={32} height={32} className="rounded-full object-cover" />
            <span className="font-black text-xl tracking-tight hidden sm:block">GONGAFIT</span>
          </div>
        </div>
      </nav>

      <div className="pt-32 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            GET IN <span className="text-clean-accent">TOUCH</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Find us at our main facility or reach out with any questions. We are here to help you hit your targets.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-clean-accent animate-spin" />
          </div>
        ) : profile ? (
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {profile.address && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-clean-accent/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-clean-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 uppercase tracking-wider text-zinc-300">Location</h3>
                    <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed">{profile.address}</p>
                  </div>
                </div>
              )}

              {(profile.phone || profile.email) && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-clean-accent/10 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-clean-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 uppercase tracking-wider text-zinc-300">Contact</h3>
                    {profile.phone && (
                      <a href={`tel:${profile.phone.replace(/[^0-9+]/g, '')}`} className="block text-zinc-400 hover:text-white transition-colors mb-2 font-medium text-lg">
                        {profile.phone}
                      </a>
                    )}
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium">
                        <Mail className="w-4 h-4" />
                        {profile.email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {profile.hours && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-clean-accent/10 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-clean-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 uppercase tracking-wider text-zinc-300">Hours</h3>
                    <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed">{profile.hours}</p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="h-[400px] md:h-full min-h-[400px] rounded-2xl overflow-hidden border border-zinc-800/50 bg-zinc-900/50 relative"
            >
              {profile.mapsEmbedUrl ? (
                <iframe
                  src={profile.mapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                  <MapPin className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-medium tracking-wide uppercase text-sm">Map not available</p>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-500">
            <p className="font-medium">Business profile information is not yet configured.</p>
          </div>
        )}
      </div>
    </div>
  )
}
