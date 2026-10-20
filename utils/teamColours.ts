import type { TeamColour } from '~/models/Team';

// Tailwind only generates classes it can find written out in full, so every class is spelled out here.
// `solid` is a screen background behind white text: all -700 shades, ≥ 4.5:1 against white.
interface TeamStyle {
    solid: string;
    text: string;
    bar: string;
    border: string;
    soft: string;
    confetti: string[];
}

export const TEAM_STYLES: Record<TeamColour, TeamStyle> = {
    emerald: { solid: 'bg-emerald-700', text: 'text-emerald-700', bar: 'bg-emerald-600', border: 'border-emerald-600', soft: 'bg-emerald-50', confetti: ['#047857', '#34d399', '#a7f3d0'] },
    sky: { solid: 'bg-sky-700', text: 'text-sky-700', bar: 'bg-sky-600', border: 'border-sky-600', soft: 'bg-sky-50', confetti: ['#0369a1', '#38bdf8', '#bae6fd'] },
    amber: { solid: 'bg-amber-700', text: 'text-amber-700', bar: 'bg-amber-600', border: 'border-amber-600', soft: 'bg-amber-50', confetti: ['#b45309', '#fbbf24', '#fde68a'] },
    rose: { solid: 'bg-rose-700', text: 'text-rose-700', bar: 'bg-rose-600', border: 'border-rose-600', soft: 'bg-rose-50', confetti: ['#be123c', '#fb7185', '#fecdd3'] },
    violet: { solid: 'bg-violet-700', text: 'text-violet-700', bar: 'bg-violet-600', border: 'border-violet-600', soft: 'bg-violet-50', confetti: ['#6d28d9', '#a78bfa', '#ddd6fe'] },
    orange: { solid: 'bg-orange-700', text: 'text-orange-700', bar: 'bg-orange-600', border: 'border-orange-600', soft: 'bg-orange-50', confetti: ['#c2410c', '#fb923c', '#fed7aa'] },
    teal: { solid: 'bg-teal-700', text: 'text-teal-700', bar: 'bg-teal-600', border: 'border-teal-600', soft: 'bg-teal-50', confetti: ['#0f766e', '#2dd4bf', '#99f6e4'] },
    pink: { solid: 'bg-pink-700', text: 'text-pink-700', bar: 'bg-pink-600', border: 'border-pink-600', soft: 'bg-pink-50', confetti: ['#be185d', '#f472b6', '#fbcfe8'] },
};
