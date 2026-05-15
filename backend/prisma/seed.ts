import { PrismaClient, ContentType, ContentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Users ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const [user1, user2, user3] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'test1@example.com' },
      update: {},
      create: {
        email: 'test1@example.com',
        username: 'testuser1',
        passwordHash,
        language: 'tr',
      },
    }),
    prisma.user.upsert({
      where: { email: 'test2@example.com' },
      update: {},
      create: {
        email: 'test2@example.com',
        username: 'testuser2',
        passwordHash,
        language: 'en',
      },
    }),
    prisma.user.upsert({
      where: { email: 'test3@example.com' },
      update: {},
      create: {
        email: 'test3@example.com',
        username: 'testuser3',
        passwordHash,
        language: 'tr',
      },
    }),
  ]);

  console.log(`Created users: ${user1.id}, ${user2.id}, ${user3.id}`);

  // ─── Content – 10 movies ─────────────────────────────────────────────────
  const movies = await Promise.all([
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0111161', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0111161',
        type: ContentType.movie,
        title: 'Esaretin Bedeli',
        titleEn: 'The Shawshank Redemption',
        description: 'İki hapis mahkumunun yıllar içinde umut ve arkadaşlık bağı kurmasını anlatan film.',
        genres: ['Drama'],
        year: 1994,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_.jpg',
        rating: 9.3,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0068646', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0068646',
        type: ContentType.movie,
        title: 'Baba',
        titleEn: 'The Godfather',
        description: 'Amerika\'nın en güçlü Sicilya mafyası ailesinin hikayesi.',
        genres: ['Crime', 'Drama'],
        year: 1972,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg',
        rating: 9.2,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0468569', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0468569',
        type: ContentType.movie,
        title: 'Kara Şövalye',
        titleEn: 'The Dark Knight',
        description: 'Batman, Joker ile karşı karşıya gelir.',
        genres: ['Action', 'Crime', 'Drama'],
        year: 2008,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg',
        rating: 9.0,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0109830', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0109830',
        type: ContentType.movie,
        title: 'Forrest Gump',
        titleEn: 'Forrest Gump',
        description: 'Basit bir Alabama\'lının olağanüstü yaşam hikayesi.',
        genres: ['Drama', 'Romance'],
        year: 1994,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg',
        rating: 8.8,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0816692', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0816692',
        type: ContentType.movie,
        title: 'Yıldızlararası',
        titleEn: 'Interstellar',
        description: 'İnsanlığı kurtarmak için uzay-zaman tünelinden geçen bir grup kaşif.',
        genres: ['Sci-Fi', 'Drama'],
        year: 2014,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg',
        rating: 8.7,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0120737', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0120737',
        type: ContentType.movie,
        title: 'Yüzüklerin Efendisi: Yüzük Kardeşliği',
        titleEn: 'The Lord of the Rings: The Fellowship of the Ring',
        description: 'Yüzüğü Kaderim Dağı\'na götürmek için bir kardeşlik kurulur.',
        genres: ['Action', 'Adventure', 'Drama'],
        year: 2001,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzUtNWUzMi00MTgxLWI0NTctMzY4M2VlOTdjZWRiXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_.jpg',
        rating: 8.8,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0245429', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0245429',
        type: ContentType.movie,
        title: 'Ruhların Kaçışı',
        titleEn: 'Spirited Away',
        description: 'Ailesiyle birlikte büyülü bir dünyaya giren küçük kız Chihiro\'nun hikayesi.',
        genres: ['Animation', 'Adventure', 'Drama'],
        year: 2001,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjlmZmI5MDctNDE2YS00YWE0LWE5ZWItZDBhYWQ0NTcxNWRhXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg',
        rating: 8.6,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt1375666', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt1375666',
        type: ContentType.movie,
        title: 'Başlangıç',
        titleEn: 'Inception',
        description: 'Bir hırsız, rüyalar aracılığıyla insanların bilinçaltına girerek sır çalıyor.',
        genres: ['Action', 'Sci-Fi', 'Thriller'],
        year: 2010,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg',
        rating: 8.8,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt6751668', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt6751668',
        type: ContentType.movie,
        title: 'Parazit',
        titleEn: 'Parasite',
        description: 'Yoksul bir ailenin hayatlarını değiştirmek için zengin bir aileyle yakınlaşması.',
        genres: ['Comedy', 'Drama', 'Thriller'],
        year: 2019,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_.jpg',
        rating: 8.5,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'tt0137523', type: ContentType.movie } },
      update: {},
      create: {
        externalId: 'tt0137523',
        type: ContentType.movie,
        title: 'Dövüş Kulübü',
        titleEn: 'Fight Club',
        description: 'Uykusuzluk çeken bir anlatıcı, sabun satıcısıyla tanışarak yeraltı dövüş kulübü kurar.',
        genres: ['Drama', 'Thriller'],
        year: 1999,
        posterUrl: 'https://m.media-amazon.com/images/M/MV5BNDIzNDU0YzEtYzE5Ni00ZjlkLTk5ZjgtNjM3NWE4YzA3Nzk3XkEyXkFqcGdeQXVyMjUzOTY1NTc@._V1_.jpg',
        rating: 8.8,
      },
    }),
  ]);

  console.log(`Created ${movies.length} movies`);

  // ─── Content – 5 books ───────────────────────────────────────────────────
  const books = await Promise.all([
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'book_1984', type: ContentType.book } },
      update: {},
      create: {
        externalId: 'book_1984',
        type: ContentType.book,
        title: '1984',
        titleEn: '1984',
        description: 'George Orwell\'ın distopik başyapıtı: gözetim devleti ve düşünce özgürlüğü.',
        genres: ['Sci-Fi', 'Dystopian', 'Classic'],
        year: 1949,
        rating: 4.7,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'book_dune', type: ContentType.book } },
      update: {},
      create: {
        externalId: 'book_dune',
        type: ContentType.book,
        title: 'Dune',
        titleEn: 'Dune',
        description: 'Frank Herbert\'ın bilim kurgu klasiği: çöl gezegeni Arrakis\'in destansı hikayesi.',
        genres: ['Sci-Fi', 'Adventure'],
        year: 1965,
        rating: 4.8,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'book_sapiens', type: ContentType.book } },
      update: {},
      create: {
        externalId: 'book_sapiens',
        type: ContentType.book,
        title: 'Sapiens: İnsan Türünün Kısa Bir Tarihi',
        titleEn: 'Sapiens: A Brief History of Humankind',
        description: 'Yuval Noah Harari\'nin insanlık tarihini anlatan çığır açan eseri.',
        genres: ['Non-Fiction', 'History'],
        year: 2011,
        rating: 4.4,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'book_little_prince', type: ContentType.book } },
      update: {},
      create: {
        externalId: 'book_little_prince',
        type: ContentType.book,
        title: 'Küçük Prens',
        titleEn: 'The Little Prince',
        description: 'Antoine de Saint-Exupéry\'nin çocuklar ve yetişkinler için evrensel masalı.',
        genres: ['Classic', 'Fantasy', 'Romance'],
        year: 1943,
        rating: 4.8,
      },
    }),
    prisma.content.upsert({
      where: { externalId_type: { externalId: 'book_crime_punishment', type: ContentType.book } },
      update: {},
      create: {
        externalId: 'book_crime_punishment',
        type: ContentType.book,
        title: 'Suç ve Ceza',
        titleEn: 'Crime and Punishment',
        description: 'Dostoyevski\'nin psikolojik gerilim şaheseri.',
        genres: ['Classic', 'Drama', 'Thriller'],
        year: 1866,
        rating: 4.6,
      },
    }),
  ]);

  console.log(`Created ${books.length} books`);

  // ─── UserContent ─────────────────────────────────────────────────────────
  const allContent = [...movies, ...books];

  // user1 – 6 entries
  await Promise.all([
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user1.id, contentId: allContent[0].id } },
      update: {},
      create: { userId: user1.id, contentId: allContent[0].id, rating: 10, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user1.id, contentId: allContent[2].id } },
      update: {},
      create: { userId: user1.id, contentId: allContent[2].id, rating: 9, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user1.id, contentId: allContent[4].id } },
      update: {},
      create: { userId: user1.id, contentId: allContent[4].id, rating: 8, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user1.id, contentId: allContent[7].id } },
      update: {},
      create: { userId: user1.id, contentId: allContent[7].id, rating: 9, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user1.id, contentId: allContent[10].id } },
      update: {},
      create: { userId: user1.id, contentId: allContent[10].id, rating: 7, status: ContentStatus.read },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user1.id, contentId: allContent[11].id } },
      update: {},
      create: { userId: user1.id, contentId: allContent[11].id, rating: 10, status: ContentStatus.read },
    }),
  ]);

  // user2 – 5 entries
  await Promise.all([
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user2.id, contentId: allContent[1].id } },
      update: {},
      create: { userId: user2.id, contentId: allContent[1].id, rating: 10, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user2.id, contentId: allContent[3].id } },
      update: {},
      create: { userId: user2.id, contentId: allContent[3].id, rating: 8, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user2.id, contentId: allContent[5].id } },
      update: {},
      create: { userId: user2.id, contentId: allContent[5].id, rating: 9, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user2.id, contentId: allContent[8].id } },
      update: {},
      create: { userId: user2.id, contentId: allContent[8].id, rating: 7, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user2.id, contentId: allContent[12].id } },
      update: {},
      create: { userId: user2.id, contentId: allContent[12].id, rating: 9, status: ContentStatus.read },
    }),
  ]);

  // user3 – 6 entries
  await Promise.all([
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user3.id, contentId: allContent[0].id } },
      update: {},
      create: { userId: user3.id, contentId: allContent[0].id, rating: 8, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user3.id, contentId: allContent[6].id } },
      update: {},
      create: { userId: user3.id, contentId: allContent[6].id, rating: 9, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user3.id, contentId: allContent[9].id } },
      update: {},
      create: { userId: user3.id, contentId: allContent[9].id, rating: 6, status: ContentStatus.watched },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user3.id, contentId: allContent[10].id } },
      update: {},
      create: { userId: user3.id, contentId: allContent[10].id, rating: 9, status: ContentStatus.read },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user3.id, contentId: allContent[13].id } },
      update: {},
      create: { userId: user3.id, contentId: allContent[13].id, rating: 8, status: ContentStatus.read },
    }),
    prisma.userContent.upsert({
      where: { userId_contentId: { userId: user3.id, contentId: allContent[14].id } },
      update: {},
      create: { userId: user3.id, contentId: allContent[14].id, rating: 7, status: ContentStatus.reading },
    }),
  ]);

  console.log('Created UserContent records');

  // ─── UserPreferences ─────────────────────────────────────────────────────
  await Promise.all([
    prisma.userPreference.upsert({
      where: { userId: user1.id },
      update: {},
      create: {
        userId: user1.id,
        preferredGenres: ['Drama', 'Sci-Fi', 'Thriller'],
        onboardingDone: true,
      },
    }),
    prisma.userPreference.upsert({
      where: { userId: user2.id },
      update: {},
      create: {
        userId: user2.id,
        preferredGenres: ['Action', 'Adventure', 'Romance'],
        onboardingDone: true,
      },
    }),
    prisma.userPreference.upsert({
      where: { userId: user3.id },
      update: {},
      create: {
        userId: user3.id,
        preferredGenres: ['Classic', 'Drama', 'Comedy'],
        onboardingDone: true,
      },
    }),
  ]);

  console.log('Created UserPreferences');
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
