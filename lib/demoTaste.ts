import type { SlotId } from './config';
import type { PlayerState, Taste } from './types';

const DEMO_TASTE_VERSION = 4;
// Curated catalog links avoid network lookup failures while filling demo seats.
const DEMO_TASTES: Record<'p1' | 'p2' | 'p3' | 'p4', Taste> = {
  p1: {
    song: 'Frank Ocean – White Ferrari', tags: ['quiet longing', 'bittersweet memories'],
    preview: { provider: 'apple', title: 'Frank Ocean – White Ferrari', url: 'https://music.apple.com/us/album/white-ferrari/1146195596?i=1146195725' },
  },
  p2: {
    song: 'Daft Punk – One More Time', tags: ['shared euphoria', 'endless possibility'],
    preview: { provider: 'youtube', title: 'Daft Punk – One More Time', url: 'https://www.youtube.com/watch?v=FGBhQbmPwH8' },
  },
  p3: {
    song: 'Nujabes – Feather', tags: ['inner peace', 'gentle optimism'],
    preview: { provider: 'apple', title: 'Nujabes – Feather', url: 'https://music.apple.com/us/song/1445812701' },
  },
  p4: {
    song: 'Paramore – Hard Times', tags: ['restless energy', 'defiant joy'],
    preview: { provider: 'apple', title: 'Paramore – Hard Times', url: 'https://music.apple.com/us/album/after-laughter/1227049864?i=1227049868' },
  },
};

export function demoTaste(slot: SlotId): Taste {
  const index = Number(slot.slice(1)) - 1;
  const taste = DEMO_TASTES[`p${index % 4 + 1}` as keyof typeof DEMO_TASTES];
  const extraTags = [
    ['tender hope', 'distant wonder'], ['wild freedom', 'fearless love'],
    ['silent awe', 'open horizons'], ['sweet melancholy', 'fragile trust'],
    ['cosmic solitude', 'weightless dreams'], ['radiant gratitude', 'playful mischief'],
    ['secret yearning', 'soft courage'], ['electric anticipation', 'reckless abandon'],
    ['restful belonging', 'patient healing'], ['wistful nostalgia', 'fading summer'],
    ['unspoken affection', 'deep reflection'], ['fierce resolve', 'beautiful chaos'],
    ['peaceful surrender', 'timeless wonder'], ['aching distance', 'new beginnings'],
    ['unbridled delight', 'curious uncertainty'], ['dreamlike escape', 'steadfast devotion'],
  ];
  if (index >= 4) return { ...taste, tags: [...extraTags[index - 4]], preview: { ...taste.preview! } };
  return { ...taste, tags: [...taste.tags], preview: { ...taste.preview! } };
}

/** Upgrade only demo Taste Drops, leaving the rest of a saved session intact. */
export function upgradeDemoTaste(player: PlayerState, slot: SlotId): PlayerState {
  if (!player.bot || (player.demoTasteVersion || 0) >= DEMO_TASTE_VERSION) return player;
  return { ...player, taste: demoTaste(slot), demoTasteVersion: DEMO_TASTE_VERSION };
}
