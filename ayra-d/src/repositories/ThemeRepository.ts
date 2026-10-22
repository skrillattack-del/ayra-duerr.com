import apiClient from '@/lib/apiClient'
import { isThemeId, type ThemeId } from '@/lib/themes'

interface ThemeResponse {
  data: {
    theme: ThemeId
  }
}

function extractTheme(response: ThemeResponse): ThemeId {
  const theme = response?.data?.theme
  if (!isThemeId(theme)) {
    throw new Error('The site theme response contained an unsupported theme id.')
  }
  return theme
}

export const ThemeRepository = {
  async getSiteTheme(): Promise<ThemeId> {
    return extractTheme(await apiClient.get<ThemeResponse>('/api/site/theme'))
  },

  async updateSiteTheme(theme: ThemeId): Promise<ThemeId> {
    return extractTheme(
      await apiClient.put<ThemeResponse>('/api/admin/site/theme', { theme }),
    )
  },
}
