import axios from 'axios';

const BASE = 'https://api.tvmaze.com';

export async function getShowDetail(tvmazeId: string) {
  const numId = tvmazeId.replace('tvmaze-', '');
  const res = await axios.get(`${BASE}/shows/${numId}`, { timeout: 5000 });
  const show = res.data;
  return {
    id: `tvmaze-${show.id}`,
    externalId: `tvmaze-${show.id}`,
    type: 'series' as const,
    title: show.name as string,
    description: show.summary ? (show.summary as string).replace(/<[^>]+>/g, '') : null,
    genres: (show.genres as string[]) ?? [],
    year: show.premiered ? parseInt((show.premiered as string).slice(0, 4)) : null,
    posterUrl: (show.image?.original ?? show.image?.medium ?? null) as string | null,
    rating: (show.rating?.average ?? null) as number | null,
    status: (show.status ?? null) as string | null,
    network: (show.network?.name ?? null) as string | null,
  };
}

export async function searchSeries(query: string) {
  const res = await axios.get(`${BASE}/search/shows`, {
    params: { q: query },
    timeout: 5000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any[]).map(({ show }) => ({
    id: `tvmaze-${show.id}`,
    externalId: `tvmaze-${show.id}`,
    type: 'series',
    title: show.name,
    description: show.summary ? show.summary.replace(/<[^>]+>/g, '') : null,
    genres: show.genres ?? [],
    year: show.premiered ? parseInt(show.premiered.slice(0, 4)) : null,
    posterUrl: show.image?.medium ?? null,
    rating: show.rating?.average ?? null,
  }));
}
