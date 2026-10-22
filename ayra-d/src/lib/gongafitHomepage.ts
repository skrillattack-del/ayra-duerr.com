import { PENDO_CARDS } from '@/lib/pendo'

export type HomepagePerson = {
  id: string
  name: string
  role: string
  imageUrl: string
  accent: string
}

const HOMEPAGE_PEOPLE_STORAGE_KEY = 'gongafit.homepage.people'
export const HOMEPAGE_PEOPLE_EVENT = 'gongafit-homepage-people-updated'

export const DEFAULT_HOMEPAGE_PEOPLE: HomepagePerson[] = PENDO_CARDS.map((card) => ({
  ...card,
}))

function normalizePeople(value: unknown): HomepagePerson[] {
  if (!Array.isArray(value)) return DEFAULT_HOMEPAGE_PEOPLE

  return DEFAULT_HOMEPAGE_PEOPLE.map((fallback, index) => {
    const candidate = value[index] as Partial<HomepagePerson> | undefined
    return {
      ...fallback,
      ...candidate,
      id: candidate?.id || fallback.id,
      name: candidate?.name?.trim() || fallback.name,
      role: candidate?.role?.trim() || fallback.role,
      imageUrl: candidate?.imageUrl?.trim() || fallback.imageUrl,
      accent: candidate?.accent?.trim() || fallback.accent,
    }
  })
}

export function readHomepagePeople(): HomepagePerson[] {
  if (typeof window === 'undefined') return DEFAULT_HOMEPAGE_PEOPLE

  try {
    const raw = window.localStorage.getItem(HOMEPAGE_PEOPLE_STORAGE_KEY)
    return raw ? normalizePeople(JSON.parse(raw)) : DEFAULT_HOMEPAGE_PEOPLE
  } catch {
    return DEFAULT_HOMEPAGE_PEOPLE
  }
}

export function writeHomepagePeople(people: HomepagePerson[]): HomepagePerson[] {
  const normalized = normalizePeople(people)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(HOMEPAGE_PEOPLE_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(HOMEPAGE_PEOPLE_EVENT, { detail: normalized }))
  }

  return normalized
}
