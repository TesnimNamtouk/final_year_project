export const GENRE_TR: Record<string, string> = {
  Action: 'Aksiyon', Adventure: 'Macera', Animation: 'Animasyon',
  Biography: 'Biyografi', Comedy: 'Komedi', Crime: 'Suç',
  Documentary: 'Belgesel', Drama: 'Dram', Family: 'Aile',
  Fantasy: 'Fantezi', History: 'Tarih', Horror: 'Korku',
  Music: 'Müzik', Musical: 'Müzikal', Mystery: 'Gizem',
  Romance: 'Romantik', 'Sci-Fi': 'Bilim Kurgu', 'Science Fiction': 'Bilim Kurgu',
  Sport: 'Spor', Thriller: 'Gerilim', War: 'Savaş', Western: 'Kovboy',
  Superhero: 'Süper Kahraman', Supernatural: 'Doğaüstü',
};

export function localizeGenre(genre: string, lang: string): string {
  if (lang !== 'tr') return genre;
  return GENRE_TR[genre] ?? genre;
}

export const ALL_GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror',
  'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War',
];
