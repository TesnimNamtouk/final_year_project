import axios from 'axios';

const BASE = 'https://www.googleapis.com/books/v1';

export async function searchBooks(query: string) {
  const res = await axios.get(`${BASE}/volumes`, {
    params: {
      q: query,
      ...(process.env.GOOGLE_BOOKS_API_KEY ? { key: process.env.GOOGLE_BOOKS_API_KEY } : {}),
      maxResults: 20,
    },
    timeout: 5000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((res.data.items || []) as any[]).map((item) => {
    const info = item.volumeInfo;
    return {
      id: item.id as string,
      externalId: item.id as string,
      type: 'book',
      title: info.title as string,
      description: (info.description as string) || null,
      genres: (info.categories as string[]) || [],
      year: parseInt((info.publishedDate || '').slice(0, 4)) || null,
      posterUrl: (info.imageLinks?.thumbnail as string) || null,
      rating: (info.averageRating as number) || null,
    };
  });
}
