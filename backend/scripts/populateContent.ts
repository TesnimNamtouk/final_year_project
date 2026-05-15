/**
 * Bulk content population: TVMaze (series) + OpenLibrary (books) + hardcoded movies.
 * Run: npx ts-node scripts/populateContent.ts
 */
import axios from 'axios';
import { PrismaClient, ContentType } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

// ─── TVMaze genre normalization ───────────────────────────────────────────────
const GENRE_MAP: Record<string, string> = {
  'Science-Fiction': 'Sci-Fi',
  'Science Fiction': 'Sci-Fi',
  'Supernatural': 'Fantasy',
  'Espionage': 'Thriller',
  'Sports': 'Drama',
  'Legal': 'Drama',
  'Medical': 'Drama',
  'War': 'War',
  'Western': 'Western',
  'Anime': 'Animation',
  'Adult': 'Drama',
  'Erotic': 'Drama',
  'Family': 'Family',
  'Children': 'Family',
  'Music': 'Music',
  'Documentary': 'Documentary',
  'Nature': 'Documentary',
  'Food': 'Documentary',
  'Travel': 'Documentary',
  'History': 'History',
  'Biography': 'Biography',
};

function normalizeGenre(g: string): string {
  return GENRE_MAP[g] ?? g;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim().slice(0, 500) || null;
}

async function upsertContent(data: {
  externalId: string;
  type: ContentType;
  title: string;
  description?: string | null;
  genres: string[];
  year?: number | null;
  posterUrl?: string | null;
  rating?: number | null;
}) {
  if (!data.title || !data.externalId) return false;
  try {
    await prisma.content.upsert({
      where: { externalId_type: { externalId: data.externalId, type: data.type } },
      update: {
        ...(data.genres.length > 0 ? { genres: data.genres } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.posterUrl ? { posterUrl: data.posterUrl } : {}),
        ...(data.rating ? { rating: data.rating } : {}),
      },
      create: data,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── TVMaze: fetch multiple pages ─────────────────────────────────────────────

async function fetchTvmazePage(page: number): Promise<number> {
  try {
    const r = await axios.get(`https://api.tvmaze.com/shows?page=${page}`, { timeout: 8000 });
    const shows: any[] = r.data;
    let saved = 0;
    for (const show of shows) {
      const rating = show.rating?.average ?? 0;
      if (rating < 6.5) continue;                      // skip low-rated
      if (!show.genres?.length) continue;              // skip genre-less
      const genres = (show.genres as string[]).map(normalizeGenre).filter(Boolean);
      const year = show.premiered ? parseInt(show.premiered.slice(0, 4)) : null;
      const poster = show.image?.medium ?? show.image?.original ?? null;
      const ok = await upsertContent({
        externalId: `tvmaze-${show.id}`,
        type: ContentType.series,
        title: show.name,
        description: stripHtml(show.summary),
        genres,
        year,
        posterUrl: poster,
        rating: rating || null,
      });
      if (ok) saved++;
    }
    return saved;
  } catch {
    return 0;
  }
}

// ─── OpenLibrary: fetch by subject ───────────────────────────────────────────

const OL_SUBJECTS = [
  // Mevcut konular
  { subject: 'fiction',                   genre: 'Drama'         },
  { subject: 'science_fiction',           genre: 'Sci-Fi'        },
  { subject: 'mystery',                   genre: 'Mystery'       },
  { subject: 'thriller',                  genre: 'Thriller'      },
  { subject: 'romance',                   genre: 'Romance'       },
  { subject: 'fantasy',                   genre: 'Fantasy'       },
  { subject: 'horror',                    genre: 'Horror'        },
  { subject: 'biography',                 genre: 'Biography'     },
  { subject: 'history',                   genre: 'History'       },
  { subject: 'adventure',                 genre: 'Adventure'     },
  { subject: 'classic_literature',        genre: 'Classic'       },
  { subject: 'crime',                     genre: 'Crime'         },
  { subject: 'historical_fiction',        genre: 'History'       },
  { subject: 'dystopia',                  genre: 'Sci-Fi'        },
  { subject: 'detective',                 genre: 'Crime'         },
  // Aksiyon/Macera odaklı yeni konular
  { subject: 'action_and_adventure',      genre: 'Adventure'     },
  { subject: 'spy_stories',               genre: 'Thriller'      },
  { subject: 'espionage',                 genre: 'Thriller'      },
  { subject: 'war_stories',               genre: 'War'           },
  { subject: 'pirates',                   genre: 'Adventure'     },
  { subject: 'survival_stories',          genre: 'Adventure'     },
  { subject: 'sea_stories',               genre: 'Adventure'     },
  { subject: 'quest_romances',            genre: 'Adventure'     },
  { subject: 'military_fiction',          genre: 'War'           },
  { subject: 'superhero',                 genre: 'Action'        },
  { subject: 'martial_arts',              genre: 'Action'        },
  { subject: 'heist',                     genre: 'Crime'         },
  { subject: 'bounty_hunters',            genre: 'Action'        },
  { subject: 'assassins',                 genre: 'Thriller'      },
  // Ek kurgu türleri
  { subject: 'young_adult_fiction',       genre: 'Adventure'     },
  { subject: 'magic',                     genre: 'Fantasy'       },
  { subject: 'dragons',                   genre: 'Fantasy'       },
  { subject: 'vampires',                  genre: 'Horror'        },
  { subject: 'werewolves',                genre: 'Horror'        },
  { subject: 'ghost_stories',             genre: 'Horror'        },
  { subject: 'psychological_fiction',     genre: 'Thriller'      },
  { subject: 'satire',                    genre: 'Comedy'        },
  { subject: 'humorous_fiction',          genre: 'Comedy'        },
  { subject: 'love_stories',              genre: 'Romance'       },
  { subject: 'graphic_novels',            genre: 'Action'        },
  { subject: 'manga',                     genre: 'Action'        },
  { subject: 'post_apocalyptic_fiction',  genre: 'Sci-Fi'        },
  { subject: 'time_travel',               genre: 'Sci-Fi'        },
  { subject: 'space_opera',               genre: 'Sci-Fi'        },
  { subject: 'cyberpunk',                 genre: 'Sci-Fi'        },
  { subject: 'epic_fantasy',              genre: 'Fantasy'       },
  { subject: 'dark_fantasy',              genre: 'Fantasy'       },
  { subject: 'mythology',                 genre: 'Fantasy'       },
  { subject: 'memoirs',                   genre: 'Biography'     },
  { subject: 'true_crime',               genre: 'Crime'         },
  { subject: 'western_fiction',          genre: 'Western'       },
  { subject: 'cooking',                  genre: 'Documentary'   },
  { subject: 'travel',                   genre: 'Documentary'   },
  { subject: 'philosophy',               genre: 'Classic'       },
];

async function fetchOpenLibrarySubject(subject: string, primaryGenre: string): Promise<number> {
  try {
    const r = await axios.get(
      `https://openlibrary.org/subjects/${subject}.json?limit=100`,
      { timeout: 10000 }
    );
    const works: any[] = r.data.works ?? [];
    let saved = 0;
    for (const w of works) {
      if (!w.key || !w.title) continue;
      const year = w.first_publish_year ?? null;
      const authorNames: string[] = (w.authors ?? []).map((a: any) => a.name).filter(Boolean);
      const description = authorNames.length ? `${authorNames[0]} tarafından yazılmış ${primaryGenre} türünde kitap.` : null;
      // Build genres: use primary + any matching subjects
      const rawSubjects: string[] = (w.subject ?? []).slice(0, 15).map((s: string) => s.toLowerCase());
      const genres = [primaryGenre];
      if (rawSubjects.some(s => s.includes('action') || s.includes('spy') || s.includes('espionage') || s.includes('martial') || s.includes('bounty') || s.includes('assassin') || s.includes('superhero') || s.includes('manga') || s.includes('graphic novel'))) genres.push('Action');
      if (rawSubjects.some(s => s.includes('adventure') || s.includes('quest') || s.includes('survival') || s.includes('pirate') || s.includes('sea') || s.includes('expedition'))) genres.push('Adventure');
      if (rawSubjects.some(s => s.includes('fantasy') || s.includes('magic') || s.includes('dragon') || s.includes('wizard') || s.includes('fairy'))) genres.push('Fantasy');
      if (rawSubjects.some(s => s.includes('romance') || s.includes('love stor') || s.includes('romantic'))) genres.push('Romance');
      if (rawSubjects.some(s => s.includes('classic') || s.includes('literature'))) genres.push('Classic');
      if (rawSubjects.some(s => s.includes('horror') || s.includes('vampire') || s.includes('ghost') || s.includes('werewolf'))) genres.push('Horror');
      if (rawSubjects.some(s => s.includes('crime') || s.includes('detective') || s.includes('mystery') || s.includes('noir') || s.includes('heist'))) genres.push('Crime');
      if (rawSubjects.some(s => s.includes('thriller') || s.includes('suspense') || s.includes('psychological'))) genres.push('Thriller');
      if (rawSubjects.some(s => s.includes('sci-fi') || s.includes('science fiction') || s.includes('dystop') || s.includes('space') || s.includes('cyberpunk') || s.includes('post-apocal'))) genres.push('Sci-Fi');
      if (rawSubjects.some(s => s.includes('histor') || s.includes('war') || s.includes('military'))) genres.push('History');
      if (rawSubjects.some(s => s.includes('biograph') || s.includes('memoir') || s.includes('autobio'))) genres.push('Biography');
      if (rawSubjects.some(s => s.includes('humor') || s.includes('satire') || s.includes('comic') || s.includes('funny'))) genres.push('Comedy');
      const uniqueGenres = [...new Set(genres)];
      const ok = await upsertContent({
        externalId: w.key,
        type: ContentType.book,
        title: w.title,
        description,
        genres: uniqueGenres,
        year: typeof year === 'number' && year > 0 && year <= 2025 ? year : null,
        posterUrl: w.cover_id ? `https://covers.openlibrary.org/b/id/${w.cover_id}-M.jpg` : null,
        rating: null,
      });
      if (ok) saved++;
    }
    return saved;
  } catch {
    return 0;
  }
}

// ─── Hardcoded movies (no API needed) ────────────────────────────────────────

const EXTRA_MOVIES = [
  // Action
  { id: 'tt0133093', title: 'Matrix',                genres: ['Action', 'Sci-Fi'],              year: 1999, rating: 8.7, desc: 'Bilgisayar simülasyonunda yaşayan bir programcının gerçeği keşfetme yolculuğu.' },
  { id: 'tt0082971', title: 'Kayıp Sandık Akıncıları', genres: ['Action', 'Adventure'],           year: 1981, rating: 8.4, desc: 'Indiana Jones\'un kutsal Ahit Sandığını ele geçirme peşine düşen macerası.' },
  { id: 'tt0172495', title: 'Gladyatör',              genres: ['Action', 'Adventure', 'Drama'],   year: 2000, rating: 8.5, desc: 'Roma\'nın en güçlü generali, imparatorun ihanetinden sonra gladyatöre dönüşür.' },
  { id: 'tt0095016', title: 'Zor Ölüm',              genres: ['Action', 'Thriller'],             year: 1988, rating: 8.2, desc: 'Yabancı bir şehirde teröristlere karşı yalnız savaşan polis John McClane.' },
  { id: 'tt1392190', title: 'Mad Max: Öfke Yolu',    genres: ['Action', 'Adventure', 'Sci-Fi'],  year: 2015, rating: 8.1, desc: 'Post-apokaliptik çöl dünyasında hayatta kalma mücadelesi.' },
  { id: 'tt4154796', title: 'Yenilmezler: Son Oyun', genres: ['Action', 'Adventure', 'Sci-Fi'],  year: 2019, rating: 8.4, desc: 'Marvel kahramanlarının evreni kurtarmak için son savaşı.' },
  { id: 'tt0090605', title: 'Yaratıklar 2',          genres: ['Action', 'Sci-Fi', 'Thriller'],   year: 1986, rating: 8.4, desc: 'Ripley ve bir grup asker gezegeni uzaylı varlıklardan temizlemeye gider.' },
  { id: 'tt0080684', title: 'Yıldız Savaşları: İmparatorun Dönüşü', genres: ['Action', 'Adventure', 'Sci-Fi'], year: 1980, rating: 8.7, desc: 'Luke Skywalker babasıyla yüzleşirken Galaktik İmparatorluk yeniden saldırır.' },
  { id: 'tt0076759', title: 'Yıldız Savaşları: Yeni Bir Umut', genres: ['Action', 'Adventure', 'Sci-Fi'], year: 1977, rating: 8.6, desc: 'Genç Luke Skywalker galaksik bir özgürlük savaşına katılır.' },
  { id: 'tt0266697', title: 'Kill Bill: Bölüm 1',    genres: ['Action', 'Crime', 'Thriller'],    year: 2003, rating: 8.1, desc: 'Kocasının emriyle öldürülmekten kurtulan kadın usta savaşçının intikamı.' },
  { id: 'tt0112573', title: 'Cesur Yürek',           genres: ['Action', 'Biography', 'Drama'],   year: 1995, rating: 8.3, desc: 'İskoç isyancı William Wallace\'ın İngiliz işgaline karşı mücadelesi.' },
  { id: 'tt0499549', title: 'Avatar',                genres: ['Action', 'Adventure', 'Sci-Fi'],  year: 2009, rating: 7.9, desc: 'Uzak bir gezegende insanlık ile yerli halk arasındaki savaş.' },
  // Drama
  { id: 'tt0253474', title: 'Piyanist',              genres: ['Biography', 'Drama', 'Music'],    year: 2002, rating: 8.5, desc: 'İkinci Dünya Savaşı\'nda Varşova\'da hayatta kalmaya çalışan Yahudi piyanist.' },
  { id: 'tt0120689', title: 'Yeşil Yol',            genres: ['Drama', 'Fantasy', 'Mystery'],    year: 1999, rating: 8.6, desc: 'Ölüm koridorunda mucizevi güçlere sahip bir mahkumun hikayesi.' },
  { id: 'tt0169547', title: 'Amerikan Güzelliği',   genres: ['Drama', 'Romance'],               year: 1999, rating: 8.3, desc: 'Varoşlarda sıkışıp kalmış bir ailenin çöküşünün içten anlatımı.' },
  { id: 'tt0119217', title: 'Good Will Hunting',    genres: ['Drama', 'Romance'],               year: 1997, rating: 8.3, desc: 'Dahi genç matematikçinin Boston sokaklarından yükselmesi.' },
  { id: 'tt0268978', title: 'Güzel Bir Akıl',       genres: ['Biography', 'Drama', 'Romance'],  year: 2001, rating: 8.2, desc: 'Şizofreniyle mücadele eden Nobel ödüllü matematikçi John Nash\'in hayatı.' },
  { id: 'tt0120586', title: 'Amerikan Tarihi X',    genres: ['Crime', 'Drama'],                 year: 1998, rating: 8.5, desc: 'Eski bir neo-Nazi liderinin kardeşini ırkçılıktan kurtarma çabası.' },
  { id: 'tt0118799', title: 'Hayat Güzeldir',       genres: ['Comedy', 'Drama', 'Romance'],     year: 1997, rating: 8.6, desc: 'Yahudi bir baba oğlunu Nazi toplama kampının korkunçluğundan korumak için hayal gücünü kullanır.' },
  { id: 'tt0093058', title: 'Metal Ceket',          genres: ['Drama', 'War'],                   year: 1987, rating: 8.3, desc: 'Vietnam Savaşı\'na gönderilen askerlerin ağır eğitim sürecinden savaş gerçeğine.' },
  { id: 'tt0075314', title: 'Taksi Şoförü',         genres: ['Crime', 'Drama', 'Thriller'],     year: 1976, rating: 8.2, desc: 'New York\'un karanlık sokaklarında çürüyen şehri temizlemek isteyen uykusuz taksi şoförü.' },
  { id: 'tt0117951', title: 'Köstebek',             genres: ['Drama'],                          year: 1996, rating: 7.9, desc: 'Uyuşturucu batağına saplanmış genç bir İskoçyalının çıkış arayışı.' },
  { id: 'tt6966692', title: 'Yeşil Kitap',          genres: ['Biography', 'Comedy', 'Drama'],   year: 2018, rating: 8.2, desc: 'Siyah piyanist ve beyaz korumacının ABD\'nin ırkçı güneyinde yaptıkları turnede yakınlaşması.' },
  { id: 'tt0087843', title: 'Bir Zamanlar Amerika\'da', genres: ['Crime', 'Drama'],              year: 1984, rating: 8.4, desc: 'New York gettosundan yükselen Yahudi suç çetesinin 30 yıllık destanı.' },
  // Crime / Thriller
  { id: 'tt0110912', title: 'Ucuz Roman',           genres: ['Crime', 'Drama', 'Thriller'],     year: 1994, rating: 8.9, desc: 'Los Angeles\'ın suç dünyasında iç içe geçen birden fazla hikayelerin ritimli anlatımı.' },
  { id: 'tt0114369', title: 'Yedi',                 genres: ['Crime', 'Drama', 'Mystery'],      year: 1995, rating: 8.6, desc: 'Yedi ölümcül günaha göre cinayet işleyen bir seri katili izleyen dedektifler.' },
  { id: 'tt0407887', title: 'Ayrılmış',             genres: ['Crime', 'Drama', 'Thriller'],     year: 2006, rating: 8.5, desc: 'Boston polisi ve mafyası arasında çifte ajan gerilimi.' },
  { id: 'tt0364569', title: 'Oldboy',               genres: ['Action', 'Drama', 'Mystery'],     year: 2003, rating: 8.4, desc: 'Nedensizce 15 yıl hapsedilen adamın intikam yolculuğu.' },
  { id: 'tt0209144', title: 'Hafıza',               genres: ['Mystery', 'Thriller'],            year: 2000, rating: 8.4, desc: 'Kısa süreli hafıza kaybıyla yaşayan adamın karısının katilini araması.' },
  { id: 'tt0102926', title: 'Kuzuların Sessizliği', genres: ['Crime', 'Drama', 'Horror'],       year: 1991, rating: 8.6, desc: 'FBI stajyerinin seri katilin yardımıyla başka bir katilin peşine düşmesi.' },
  { id: 'tt0099685', title: 'Suç Sokakları',        genres: ['Biography', 'Crime', 'Drama'],    year: 1990, rating: 8.7, desc: 'New York mafyasında yükselen genç bir suçlunun ihanet dolu hikayesi.' },
  { id: 'tt0105236', title: 'Rezervuar Köpekleri',  genres: ['Crime', 'Drama', 'Thriller'],     year: 1992, rating: 8.3, desc: 'Mücevher soygunu sonrası dağılan suçluların gerilimli anlatımı.' },
  { id: 'tt7286456', title: 'Joker',                genres: ['Crime', 'Drama', 'Thriller'],     year: 2019, rating: 8.4, desc: 'Gotham\'ın ihmal edilmiş komedyeninin kaosa sürüklenişi.' },
  { id: 'tt0208092', title: 'Snatch',               genres: ['Comedy', 'Crime', 'Thriller'],    year: 2000, rating: 8.3, desc: 'Londra\'nın suç dünyasında iç içe geçen komik ve tehlikeli hikayeler.' },
  { id: 'tt0317248', title: 'Tanrının Şehri',       genres: ['Crime', 'Drama'],                 year: 2002, rating: 8.6, desc: 'Rio\'nun varoşlarında suç ve şiddetin içinde büyüyen gençlerin hikayesi.' },
  // Sci-Fi
  { id: 'tt0910970', title: 'WALL-E',               genres: ['Animation', 'Adventure', 'Sci-Fi'], year: 2008, rating: 8.4, desc: 'Gelecekte Dünya\'yı temizlemekle görevli yalnız bir robotun aşk ve macera hikayesi.' },
  { id: 'tt0338013', title: 'Sonsuz Güneşin Durgun Aklı', genres: ['Drama', 'Romance', 'Sci-Fi'], year: 2004, rating: 8.3, desc: 'Acı veren bir ayrılıktan sonra belleği silinen çiftin yeniden karşılaşması.' },
  { id: 'tt1454468', title: 'Yerçekimi',            genres: ['Drama', 'Sci-Fi', 'Thriller'],    year: 2013, rating: 7.7, desc: 'Uzayda yüzen astronotların Dünya\'ya dönmek için hayatta kalma savaşı.' },
  { id: 'tt0062622', title: '2001: Uzay Yolu Macerası', genres: ['Mystery', 'Sci-Fi'],          year: 1968, rating: 8.3, desc: 'Kubrick\'in insanlığın evrimiyle yapay zekanın çarpıştığı dönüm noktası.' },
  { id: 'tt0285403', title: 'Donnie Darko',         genres: ['Drama', 'Mystery', 'Sci-Fi'],     year: 2001, rating: 8.0, desc: 'Kıyametin yaklaştığını söyleyen devasa bir tavşanın ziyaret ettiği sorunlu genç.' },
  { id: 'tt0078748', title: 'Yaratık',              genres: ['Horror', 'Sci-Fi', 'Thriller'],   year: 1979, rating: 8.5, desc: 'Uzay gemisinde korkunç bir yaratığa karşı hayatta kalma savaşı.' },
  { id: 'tt2283362', title: 'Varış',                genres: ['Drama', 'Mystery', 'Sci-Fi'],     year: 2016, rating: 7.9, desc: 'Uzaylıların dili çözmeye çalışan dilbilimcinin zaman ve hafıza keşfi.' },
  // Romance / Comedy
  { id: 'tt0381681', title: 'Gün Batmadan',         genres: ['Drama', 'Romance'],               year: 2004, rating: 8.1, desc: 'Dokuz yıl önce ayrılan iki yabancının Paris\'te beklenmedik yeniden buluşması.' },
  { id: 'tt1375670', title: 'Gece Yarısı Paris\'te', genres: ['Comedy', 'Fantasy', 'Romance'],  year: 2011, rating: 7.7, desc: 'Nostaljik bir senaryo yazarının Paris\'te gece yarısı gizemli bir yolculuğa çıkması.' },
  { id: 'tt0195788', title: 'Amelie',               genres: ['Comedy', 'Romance'],              year: 2001, rating: 8.3, desc: 'Paris\'in sıradan görünümlü garsonunun insanların hayatını gizlice iyileştirmesi.' },
  { id: 'tt0095765', title: 'Sinema Cenneti',       genres: ['Drama', 'Romance'],               year: 1988, rating: 8.5, desc: 'Küçük bir İtalyan kasabasında büyüyen çocuğun sinemaya aşkı ve hayata dair dersleri.' },
  { id: 'tt3783958', title: 'La La Land',           genres: ['Comedy', 'Drama', 'Romance'],     year: 2016, rating: 8.0, desc: 'Los Angeles\'ta hayallerinin peşinden koşan aktrist ve caz müzisyeninin birbirlerine aşık olmaları.' },
  { id: 'tt0120338', title: 'Titanik',              genres: ['Drama', 'Romance'],               year: 1997, rating: 7.9, desc: 'Titanik\'in son yolculuğunda birbirine aşık olan iki genç arasındaki aşk hikayesi.' },
  // Horror
  { id: 'tt0054215', title: 'Sapık',                genres: ['Horror', 'Mystery', 'Thriller'],  year: 1960, rating: 8.5, desc: 'Hitchcock\'un psikolojik gerilim şaheseri: ıssız bir motel ve trajik bir cinayet.' },
  { id: 'tt0073195', title: 'Çeneliler',            genres: ['Adventure', 'Horror', 'Thriller'], year: 1975, rating: 8.0, desc: 'Küçük bir kasabanın açık denizde büyük bir köpek balığıyla mücadelesi.' },
  { id: 'tt0081505', title: 'Parlama',              genres: ['Drama', 'Horror', 'Thriller'],    year: 1980, rating: 8.4, desc: 'Kışın ücra bir otele kapanan aile: Kubrick\'in gerilim başyapıtı.' },
  { id: 'tt0103064', title: 'Terminatör 2',         genres: ['Action', 'Sci-Fi', 'Thriller'],   year: 1991, rating: 8.6, desc: 'Geleceği değiştirmek için geçmişe gönderilen terminatör ile insanın işbirliği.' },
  // War / Historical
  { id: 'tt0120815', title: 'Er Ryan\'ı Kurtarmak', genres: ['Drama', 'War'],                   year: 1998, rating: 8.6, desc: 'D-Day\'den sonra kaybolan tek sağ kalan askeri bulmak için bir ekibin tehlikeli görevi.' },
  { id: 'tt5013056', title: 'Dunkirk',              genres: ['Action', 'Drama', 'History'],     year: 2017, rating: 7.9, desc: 'İkinci Dünya Savaşı\'nda 400.000 askerin tahliye edildiği Dunkirk mucizesi.' },
  { id: 'tt2119532', title: 'Hacksaw Ridge',        genres: ['Biography', 'Drama', 'War'],      year: 2016, rating: 8.1, desc: 'Silah kullanmayı reddeden sağlıkçının Okinawa savaşındaki destan yazan cesareti.' },
  { id: 'tt8267602', title: '1917',                 genres: ['Drama', 'Thriller', 'War'],       year: 2019, rating: 8.3, desc: 'İki İngiliz askerin intihar misyonu: mesajı ölümden önce teslim etmek.' },
  { id: 'tt0056172', title: 'Arabistan\'ın Lawrence\'ı', genres: ['Adventure', 'Biography', 'Drama', 'History', 'War'], year: 1962, rating: 8.3, desc: 'İngiliz subayın Arap isyanını yönettiği tarihin en büyük maceralarından biri.' },
  { id: 'tt0361748', title: 'Soysuzlar Çetesi',    genres: ['Adventure', 'Drama', 'War'],      year: 2009, rating: 8.3, desc: 'Tarantino\'nun Nazi Almanyası\'nda geçen intikam ve gerilim başyapıtı.' },
  // Animation
  { id: 'tt0119698', title: 'Prenses Mononoke',     genres: ['Action', 'Adventure', 'Animation', 'Fantasy'], year: 1997, rating: 8.4, desc: 'Miyazaki\'nin insanlık ile doğanın çatışmasını anlattığı animasyon başyapıtı.' },
  { id: 'tt0347149', title: 'Yürüyen Şato',        genres: ['Adventure', 'Animation', 'Fantasy', 'Romance'], year: 2004, rating: 8.2, desc: 'Büyü ile yaşlıya dönüştürülen genç kızın yürüyen şatoda sığınak bulması.' },
  { id: 'tt0266543', title: 'Kayıp Balık Nemo',    genres: ['Adventure', 'Animation', 'Comedy', 'Family'], year: 2003, rating: 8.2, desc: 'Oğlunu bulmak için okyanusa açılan panikakobalık babanın macerası.' },
  { id: 'tt0114709', title: 'Oyuncak Hikayesi',    genres: ['Adventure', 'Animation', 'Comedy', 'Family'], year: 1995, rating: 8.3, desc: 'Sahibinin yokluğunda hayat bulan oyuncakların dünyasına ilk bakış.' },
  { id: 'tt0435761', title: 'Oyuncak Hikayesi 3',  genres: ['Adventure', 'Animation', 'Comedy', 'Drama', 'Family'], year: 2010, rating: 8.3, desc: 'Üniversiteye giden sahibinin bıraktığı oyuncakların yuvayı bulmak için mücadelesi.' },
  { id: 'tt2380307', title: 'Coco',                genres: ['Adventure', 'Animation', 'Family', 'Music'], year: 2017, rating: 8.4, desc: 'Müzik yasağına rağmen müzisyen olmak isteyen çocuğun ölüler diyarındaki yolculuğu.' },
  // Biography
  { id: 'tt0482571', title: 'Prestij',             genres: ['Drama', 'Mystery', 'Sci-Fi'],     year: 2006, rating: 8.5, desc: 'İki rakip sihirbazın yıkıcı rekabetle birbirini yok etmeye çalışması.' },
  { id: 'tt0088763', title: 'Geleceğe Dönüş',      genres: ['Adventure', 'Comedy', 'Sci-Fi'],  year: 1985, rating: 8.5, desc: 'DeLorean arabasıyla geçmişe giden gencin tarihi değiştirme mücadelesi.' },
  { id: 'tt0057012', title: 'Dr. Garip Sevda',     genres: ['Comedy', 'War'],                  year: 1964, rating: 8.4, desc: 'Kubrick\'in nükleer savaşı hicveden karanlık komedisi.' },
  { id: 'tt0070735', title: 'İhtiras',             genres: ['Comedy', 'Crime', 'Drama'],       year: 1973, rating: 8.3, desc: '1930\'larda iki dolandırıcının intikam planı.' },
  { id: 'tt0050083', title: '12 Kızgın Adam',      genres: ['Crime', 'Drama'],                 year: 1957, rating: 9.0, desc: 'Bir cinayet davasında karar vermek zorunda olan 12 jüri üyesi arasındaki gerilimli tartışma.' },
];

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const before = await prisma.content.count();
  console.log(`\n📊 Starting content count: ${before}\n`);

  // ── OpenLibrary books (yeni konular dahil) ──
  console.log('📚 Fetching OpenLibrary books by subject...');
  let totalBooks = 0;
  for (const { subject, genre } of OL_SUBJECTS) {
    const n = await fetchOpenLibrarySubject(subject, genre);
    totalBooks += n;
    process.stdout.write(`[${subject}:${n}]`);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`\n✅ ${totalBooks} books saved\n`);

  const after = await prisma.content.count();
  const byType = await prisma.content.groupBy({ by: ['type'], _count: true });
  console.log(`\n🎉 Done!  ${before} → ${after} content items (+${after - before})`);
  console.log('By type:', JSON.stringify(byType));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
