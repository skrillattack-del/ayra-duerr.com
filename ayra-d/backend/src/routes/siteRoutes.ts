import { Router } from 'express';
import { siteSettingRepository } from '../repositories/siteSettingRepository';

const router: Router = Router();

const THEME_KEY = 'site_theme';
const VALID_THEMES = ['cyberpunk', 'retro', 'lava', 'mana', 'mythic'] as const;
const DEFAULT_THEME = 'cyberpunk';

/**
 * GET /api/site/theme
 * Public endpoint — returns the current site-wide theme id.
 */
router.get('/theme', async (_req, res) => {
  try {
    const value = await siteSettingRepository.get(THEME_KEY);
    const theme = value && (VALID_THEMES as readonly string[]).includes(value) ? value : DEFAULT_THEME;
    res.json({ data: { theme } });
  } catch (error) {
    console.error('Failed to get site theme:', error);
    // Appearance configuration must never prevent the public app from
    // rendering. If persistence is temporarily unavailable, use the same
    // deterministic default as an unset or stale setting.
    res.json({ data: { theme: DEFAULT_THEME } });
  }
});
/**
 * GET /api/site/business-profile
 * Public endpoint — returns the business profile.
 */
router.get('/business-profile', async (_req, res) => {
  try {
    const value = await siteSettingRepository.get('business_profile');
    if (value) {
      res.json({ data: JSON.parse(value) });
    } else {
      res.json({ data: null });
    }
  } catch (error) {
    console.error('Failed to get business profile:', error);
    res.json({ data: null });
  }
});

export default router;
