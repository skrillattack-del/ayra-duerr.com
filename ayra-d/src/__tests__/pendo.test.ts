import { describe, expect, it } from 'vitest'
import {
  PENDO_BREED,
  PENDO_CARDS,
  PENDO_INSTAGRAM_HANDLE,
  PENDO_INSTAGRAM_URL,
  PENDO_NAME,
  PENDO_PORTRAIT_URL,
} from '@/lib/pendo'
import { DEFAULT_HOMEPAGE_PEOPLE } from '@/lib/gongafitHomepage'

describe('pendo content contract', () => {
  it('links the real Instagram profile for credit', () => {
    expect(PENDO_INSTAGRAM_URL).toBe('https://www.instagram.com/pendothedoodle/')
    expect(PENDO_INSTAGRAM_HANDLE).toBe('@pendothedoodle')
    expect(PENDO_NAME).toBe('Pendo')
    expect(PENDO_BREED).toBe('Goldendoodle')
  })

  it('keeps every card photo inside the curated pendo asset folder', () => {
    expect(PENDO_CARDS.length).toBe(3)
    expect(new Set(PENDO_CARDS.map((card) => card.id)).size).toBe(3)
    for (const card of PENDO_CARDS) {
      expect(card.name.trim().length).toBeGreaterThan(0)
      expect(card.role.trim().length).toBeGreaterThan(0)
      expect(card.imageUrl.startsWith('/images/pendo/')).toBe(true)
    }
    expect(PENDO_PORTRAIT_URL.startsWith('/images/pendo/')).toBe(true)
  })

  it('mirrors the pendo cards as the homepage defaults', () => {
    expect(DEFAULT_HOMEPAGE_PEOPLE).toEqual(PENDO_CARDS.map((card) => ({ ...card })))
  })
})
