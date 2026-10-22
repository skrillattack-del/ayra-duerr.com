/**
 * Pendo — the resident doodle of GongaFit.
 *
 * Single source of truth for Pendo imagery and copy. Photos are curated
 * from the owner's collection (see `dev-docs/pendo the poodle.docx`);
 * the Instagram profile is linked for credit, not hotlinked.
 */

export const PENDO_INSTAGRAM_URL = 'https://www.instagram.com/pendothedoodle/';
export const PENDO_INSTAGRAM_HANDLE = '@pendothedoodle';
export const PENDO_NAME = 'Pendo';
export const PENDO_BREED = 'Goldendoodle';
export const PENDO_CREDIT = `Photos of Pendo · ${PENDO_INSTAGRAM_HANDLE}`;

export interface PendoCard {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  accent: string;
}

export const PENDO_CARDS: readonly PendoCard[] = [
  {
    id: 'walk-buddy',
    name: 'Walk Buddy',
    role: 'Daily miles with Pendo',
    imageUrl: '/images/pendo/pendo-happy.png',
    accent: '#859900',
  },
  {
    id: 'rest-coach',
    name: 'Rest Coach',
    role: 'Recovery naps, modeled daily',
    imageUrl: '/images/pendo/pendo-pillow.png',
    accent: '#b58900',
  },
  {
    id: 'play-captain',
    name: 'Play Captain',
    role: 'Sprints, fetch, and joy',
    imageUrl: '/images/pendo/pendo-grass.png',
    accent: '#dc322f',
  },
];

export const PENDO_PORTRAIT_URL = '/images/pendo/pendo-portrait.png';
export const PENDO_PORTRAIT_ALT = 'Pendo the white doodle sitting up and looking at the camera';
