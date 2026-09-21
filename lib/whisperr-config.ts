export function browserWhisperrOptions(rawKey: string | undefined) {
  const apiKey = rawKey?.trim() ?? '';
  return {
    apiKey,
    baseUrl: 'https://api.whisperr.net',
    disabled: !apiKey.startsWith('wpk_'),
  };
}

export function assertWhisperrProductionConfig(env: Readonly<Record<string, string | undefined>>) {
  if (env.VERCEL_ENV !== 'production') return;
  if (!env.VITE_WHISPERR_INGESTION_API_KEY?.trim().startsWith('wpk_')) {
    throw new Error(
      'Whisperr tracking is not configured. Set VITE_WHISPERR_INGESTION_API_KEY to a ' +
      'Lesiko Browser / mobile key (wpk_) in Vercel Production, then rebuild. ' +
      'NEXT_PUBLIC_WHISPERR_INGESTION_API_KEY is a Next.js variable and is not read by this Vite app. ' +
      'Server keys (wrk_) belong only in Supabase Edge Function secrets.',
    );
  }
}
