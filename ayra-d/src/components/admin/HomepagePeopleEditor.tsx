'use client'

import { useEffect, useState } from 'react'
import { Image as ImageIcon, RotateCcw, Save } from 'lucide-react'
import {
  DEFAULT_HOMEPAGE_PEOPLE,
  type HomepagePerson,
  readHomepagePeople,
  writeHomepagePeople,
} from '@/lib/gongafitHomepage'

type PersonField = 'name' | 'role' | 'imageUrl' | 'accent'

export default function HomepagePeopleEditor() {
  const [people, setPeople] = useState<HomepagePerson[]>(DEFAULT_HOMEPAGE_PEOPLE)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPeople(readHomepagePeople())
  }, [])

  const updatePerson = (index: number, field: PersonField, value: string) => {
    setSaved(false)
    setPeople((current) =>
      current.map((person, personIndex) =>
        personIndex === index ? { ...person, [field]: value } : person
      )
    )
  }

  const savePeople = () => {
    setPeople(writeHomepagePeople(people))
    setSaved(true)
  }

  const resetPeople = () => {
    setPeople(writeHomepagePeople(DEFAULT_HOMEPAGE_PEOPLE))
    setSaved(true)
  }

  return (
    <section className="mb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.4em] text-slate-500">{'// Homepage People'}</h2>
          <p className="mt-2 text-sm text-slate-400">Edit the three frontpage Pendo cards.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetPeople}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={savePeople}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-xs font-black uppercase tracking-wide text-black hover:bg-emerald-400"
          >
            <Save className="h-4 w-4" />
            Save People
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {people.map((person, index) => (
          <div key={person.id} className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-zinc-800">
                {person.imageUrl ? (
                  <img src={person.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-slate-500" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black text-white">{person.name || `Person ${index + 1}`}</p>
                <p className="truncate text-sm text-slate-400">{person.role || 'Role'}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Name
                <input
                  value={person.name}
                  onChange={(event) => updatePerson(index, 'name', event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Role
                <input
                  value={person.role}
                  onChange={(event) => updatePerson(index, 'role', event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Image URL
                <input
                  value={person.imageUrl}
                  onChange={(event) => updatePerson(index, 'imageUrl', event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-emerald-400"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Accent
                <input
                  value={person.accent}
                  onChange={(event) => updatePerson(index, 'accent', event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-zinc-700 bg-black px-2 outline-none focus:border-emerald-400"
                  type="color"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {saved && <p className="mt-3 text-xs font-bold uppercase tracking-wide text-emerald-400">Homepage people saved</p>}
    </section>
  )
}
