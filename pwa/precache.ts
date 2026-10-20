import { CATEGORIES } from '../models/Game.ts';

// Which built files the service worker stores on install, as paths relative to dist/.
// Everything the app loads, and nothing it doesn't.
const SKIP: RegExp[] = [
    // The service worker itself
    /^sw\.js$/,
    // Copies of index.html for GitHub Pages; the worker answers every page with index.html
    /^404\.html$/,
    /^game\/index\.html$/,
    /^robots\.txt$/,
    // The word lists and sounds in public/ are bundled into assets/ (utils/words.ts, utils/sounds.ts);
    // their public copies are served too, but nothing fetches them
    ...CATEGORIES.map(category => new RegExp(`^${category}\\.json$`)),
    /^sounds\//,
];

export function precacheFiles(files: string[]): string[] {
    return files.filter(file => !SKIP.some(pattern => pattern.test(file))).sort();
}
