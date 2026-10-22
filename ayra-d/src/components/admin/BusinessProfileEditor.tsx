import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock, Globe, Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { SiteRepository, type BusinessProfile } from '@/repositories/SiteRepository'
import { AdminRepository } from '@/repositories/AdminRepository'

export default function BusinessProfileEditor() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<BusinessProfile>({
    name: 'GongaFit',
    address: '',
    phone: '',
    email: '',
    hours: '',
    mapsEmbedUrl: '',
  })

  useEffect(() => {
    SiteRepository.getBusinessProfile()
      .then((data) => {
        if (data) setProfile(data)
      })
      .catch((err) => console.error('Failed to load business profile', err))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await AdminRepository.updateBusinessProfile(profile)
      toast({
        title: 'Profile Updated',
        message: 'The public business profile has been saved successfully.',
        status: 'SUCCESS',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Update Failed',
        message: 'Could not save business profile. Please try again.',
        status: 'ERROR',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-2">{'// Public Business Profile'}</h2>
          <p className="text-zinc-400 text-sm">Manage the contact and location information shown on the public site.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 p-6 space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="space-y-4 relative z-10">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Globe className="w-4 h-4" /> Business Name
            </label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="e.g. GongaFit"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <MapPin className="w-4 h-4" /> Physical Address
            </label>
            <textarea
              name="address"
              value={profile.address || ''}
              onChange={handleChange}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="123 Fitness Ave&#10;City, State 12345"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <Phone className="w-4 h-4" /> Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={profile.phone || ''}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <Mail className="w-4 h-4" /> Public Email
              </label>
              <input
                type="email"
                name="email"
                value={profile.email || ''}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="contact@gongafitness.com"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Clock className="w-4 h-4" /> Operating Hours
            </label>
            <textarea
              name="hours"
              value={profile.hours || ''}
              onChange={handleChange}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Mon-Fri: 5AM - 10PM&#10;Sat-Sun: 7AM - 8PM"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <MapPin className="w-4 h-4" /> Google Maps Embed URL
            </label>
            <input
              type="url"
              name="mapsEmbedUrl"
              value={profile.mapsEmbedUrl || ''}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
              Used to display the interactive map on the contact page.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
