import { CATEGORIES } from '../models/Game.ts';

// Which built files the service worker stores on install, as paths relative to dist/.
// Everything the app loads, and nothing it doesn't.
const SKIP: RegExp[] = [
    // The service worker itself
    /^sw\.js$/,
    /^robots\.txt$/,
    // Read by Cloudflare, never served
    /^_headers$/,
    // The word lists and sounds in public/ are bundled into assets/ (utils/words.ts, utils/sounds.ts);
    // their public copies are served too, but nothing fetches them
    ...CATEGORIES.map(category => new RegExp(`^${category}\\.json$`)),
    /^sounds\//,
];

export function precacheFiles(files: string[]): string[] {
    return files.filter(file => !SKIP.some(pattern => pattern.test(file))).sort();
}
