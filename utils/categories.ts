import type { Category } from '~/models/Game';

// The icon (a Material Icons ligature) and the label each word card shows, so the player describing knows what kind of word it is
export const CATEGORY_INFO: Record<Category, { icon: string, label: string }> = {
    people: { icon: 'person', label: 'Persoon' },
    places: { icon: 'place', label: 'Plaats' },
    wildcards: { icon: 'auto_awesome', label: 'Wildcard' },
    media: { icon: 'movie', label: 'Film, serie of muziek' },
    brands: { icon: 'sell', label: 'Merk' },
};
