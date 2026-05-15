import axios from 'axios';

const BASE = 'https://api.themoviedb.org/3';

export async function searchMovies(query: string, type: 'movie' | 'tv') {
  const res = await axios.get(`${BASE}/search/${type}`, {
    params: {
      api_key: process.env.TMDB_API_KEY,
      query,
      language: 'tr-TR',
    },
    timeout: 5000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data.results as any[]).map((item) => ({
    id: String(item.id),
    externalId: String(item.id),
    type: type === 'tv' ? 'series' : 'movie',
    title: item.title || item.name,
    description: item.overview,
    genres: [] as string[],
    year: parseInt((item.release_date || item.first_air_date || '').slice(0, 4)) || null,
    posterUrl: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : null,
    rating: item.vote_average ?? null,
  }));
}
