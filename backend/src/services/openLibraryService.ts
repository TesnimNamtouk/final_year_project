import axios from 'axios';

const BASE = 'https://openlibrary.org';

export async function getBookDetail(workId: string) {
  const res = await axios.get(`${BASE}${workId}.json`, { timeout: 8000 });
  const work = res.data;
  const coverId = (work.covers as number[] | undefined)?.[0];
  const desc =
    typeof work.description === 'string'
      ? work.description
      : (work.description?.value as string | undefined) ?? null;
  return {
    id: workId,
    externalId: workId,
    type: 'book' as const,
    title: work.title as string,
    description: desc,
    genres: ((work.subjects as string[] | undefined) ?? []).slice(0, 5),
    year: work.first_publish_date ? parseInt(work.first_publish_date as string) || null : null,
    posterUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    rating: null,
  };
}

export async function searchBooks(query: string) {
  const res = await axios.get(`${BASE}/search.json`, {
    params: { q: query, limit: 50, fields: 'key,title,author_name,first_publish_year,cover_i,subject' },
    timeout: 8000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((res.data.docs ?? []) as any[]).map((item) => {
    const coverId = item.cover_i;
    return {
      id: item.key as string,
      externalId: item.key as string,
      type: 'book',
      title: item.title as string,
      description: null,
      genres: (item.subject ?? []).slice(0, 5) as string[],
      year: item.first_publish_year ?? null,
      posterUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
      rating: null,
    };
  });
}
