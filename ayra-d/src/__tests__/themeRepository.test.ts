import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/lib/apiClient'
import { ThemeRepository } from '@/repositories/ThemeRepository'

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

const mockedApiClient = vi.mocked(apiClient)

describe('ThemeRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the public site theme through the split API client', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { theme: 'mana' } })

    await expect(ThemeRepository.getSiteTheme()).resolves.toBe('mana')
    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/site/theme')
  })

  it('persists the exact admin theme payload', async () => {
    mockedApiClient.put.mockResolvedValue({ data: { theme: 'lava' } })

    await expect(ThemeRepository.updateSiteTheme('lava')).resolves.toBe('lava')
    expect(mockedApiClient.put).toHaveBeenCalledWith('/api/admin/site/theme', { theme: 'lava' })
  })

  it('rejects an unsupported backend response instead of applying it', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { theme: 'arena' } })
    await expect(ThemeRepository.getSiteTheme()).rejects.toThrow('unsupported theme id')
  })
})
