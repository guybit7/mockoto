import type { HttpMethod } from '@mockoto/shared';

export const METHOD_COLOR: Record<HttpMethod, string> = {
  GET:     'bg-emerald-50  text-emerald-600  dark:bg-emerald-500/10  dark:text-emerald-400',
  POST:    'bg-blue-50     text-blue-600     dark:bg-blue-500/10     dark:text-blue-400',
  PUT:     'bg-amber-50    text-amber-600    dark:bg-amber-500/10    dark:text-amber-400',
  PATCH:   'bg-orange-50   text-orange-600   dark:bg-orange-500/10   dark:text-orange-400',
  DELETE:  'bg-red-50      text-red-600      dark:bg-red-500/10      dark:text-red-400',
  HEAD:    'bg-violet-50   text-violet-600   dark:bg-violet-500/10   dark:text-violet-400',
  OPTIONS: 'bg-zinc-100    text-zinc-600     dark:bg-zinc-800        dark:text-zinc-400',
};
