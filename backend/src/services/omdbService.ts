import axios from 'axios';

const BASE = 'https://www.omdbapi.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDetail(item: any) {
  return {
    id: item.imdbID as string,
    externalId: item.imdbID as string,
    type: 'movie' as const,
    title: item.Title as string,
    description: item.Plot !== 'N/A' ? (item.Plot as string) : null,
    genres: item.Genre && item.Genre !== 'N/A' ? (item.Genre as string).split(', ') : [],
    year: parseInt(item.Year) || null,
    posterUrl: item.Poster !== 'N/A' ? (item.Poster as string) : null,
    rating: item.imdbRating !== 'N/A' ? parseFloat(item.imdbRating) : null,
    director: item.Director !== 'N/A' ? (item.Director as string) : null,
    cast: item.Actors !== 'N/A' ? (item.Actors as string) : null,
    runtime: item.Runtime !== 'N/A' ? (item.Runtime as string) : null,
  };
}

export async function getMovieDetail(imdbId: string) {
  const key = process.env.OMDB_API_KEY;
  if (!key) return null;

  const res = await axios.get(BASE, {
    params: { apikey: key, i: imdbId, plot: 'full' },
    timeout: 5000,
  });

  if (res.data.Response === 'False') return null;
  return mapDetail(res.data);
}

export async function searchMovies(query: string) {
  const key = process.env.OMDB_API_KEY;
  if (!key) return [];

  const first = await axios.get(BASE, {
    params: { apikey: key, s: query, type: 'movie', page: 1 },
    timeout: 5000,
  });

  if (first.data.Response === 'False') return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchItems: any[] = first.data.Search ?? [];

  // Enrich top 10 results with genres/description in parallel
  const enriched = await Promise.all(
    searchItems.slice(0, 10).map((item) =>
      axios.get(BASE, { params: { apikey: key, i: item.imdbID, plot: 'short' }, timeout: 5000 })
        .then((r) => (r.data.Response !== 'False' ? mapDetail(r.data) : null))
        .catch(() => null)
    )
  );

  return enriched.filter(Boolean);
}
