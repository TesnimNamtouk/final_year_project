import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logActivity } from '../lib/activityLogger';
import { systemLog } from '../lib/systemLogger';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─── Schema ──────────────────────────────────────────────────────────────────

const feedbackSchema = z.object({
  liked: z.boolean(),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/recommendations
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      // Try to fetch fresh recommendations from ML service
      try {
        // Fetch user's genre preferences to pass to ML service
        const userPref = await prisma.userPreference.findUnique({
          where: { userId },
          select: { preferredGenres: true },
        });

        const startMs = Date.now();
        const mlRes = await axios.post(
          `${ML_SERVICE_URL}/recommend`,
          { user_id: userId, preferred_genres: userPref?.preferredGenres ?? [], top_n: 60 },
          { timeout: 60000 }
        );
        const executionMs = Date.now() - startMs;

        const mlData = mlRes.data as {
          algorithm: string;
          log_details?: Record<string, unknown>;
          recommendations: Array<{
            content_id: number;
            hybrid_score: number;
            cbf_score: number;
            cf_score: number;
          }>;
        };
        const mlItems = mlData.recommendations ?? (mlRes.data as Array<{ content_id: number; hybrid_score: number; cbf_score: number; cf_score: number }>);

        // Upsert each recommendation returned by the ML service
        const upsertOps = mlItems.map((item) =>
          prisma.recommendation.upsert({
            where: { userId_contentId: { userId, contentId: item.content_id } },
            create: {
              userId,
              contentId: item.content_id,
              hybridScore: item.hybrid_score,
              cbfScore: item.cbf_score,
              cfScore: item.cf_score,
            },
            update: {
              hybridScore: item.hybrid_score,
              cbfScore: item.cbf_score,
              cfScore: item.cf_score,
              generatedAt: new Date(),
            },
          })
        );
        await Promise.all(upsertOps);

        // Log recommendation session
        const algorithm = mlData.algorithm ?? 'hybrid';
        const isColdStart = algorithm.includes('cold_start');
        await prisma.recommendationLog.create({
          data: { userId, algorithm, itemCount: mlItems.length, executionMs, isColdStart },
        });
        logActivity({ userId, action: 'get_recommendations', metadata: { algorithm, itemCount: mlItems.length } });

        // Write detailed system log with ML calculation info
        const logDetails = mlData.log_details ?? {};
        const weights = (logDetails.weights as Record<string, number> | undefined) ?? {};
        const cbfInfo = (logDetails.cbf as Record<string, unknown> | undefined) ?? {};
        const cfInfo = (logDetails.cf as Record<string, unknown> | undefined) ?? {};
        const top5 = (logDetails.top5_recommendations as unknown[]) ?? [];
        const genres = (logDetails.preferred_genres as string[]) ?? [];

        const isCold = (logDetails.is_cold_start as boolean) ?? isColdStart;

        let message: string;
        if (isCold && algorithm === 'cold_start_genre') {
          message = `Kullanıcı ${userId} için soğuk başlangıç (cold-start) önerisi üretildi. ` +
            `Yeterli derecelendirme bulunamadığından tür tabanlı öneri kullanıldı. ` +
            `Tercih edilen türler: [${genres.join(', ')}]. ` +
            `Toplam ${mlItems.length} içerik önerildi. Süre: ${executionMs}ms.`;
        } else {
          message = `Kullanıcı ${userId} için hibrit öneri hesaplandı (${algorithm}). ` +
            `CBF ağırlığı: ${weights.cbf_weight ?? '-'}, CF ağırlığı: ${weights.cf_weight ?? '-'}, ` +
            `Tür ağırlığı: ${weights.genre_weight ?? '-'}. ` +
            `${mlItems.length} içerik önerildi, süre: ${executionMs}ms.`;
        }

        systemLog({
          userId,
          category: 'ML_HYBRID',
          message,
          details: {
            algorithm,
            executionMs,
            isColdStart: isCold,
            preferredGenres: genres,
            ratingCount: logDetails.rating_count,
            userContentCount: logDetails.user_content_count,
            candidateCount: logDetails.candidate_count,
            totalReturned: mlItems.length,
            weights: {
              cbf: weights.cbf_weight,
              cf: weights.cf_weight,
              genre: weights.genre_weight,
            },
            cbf: cbfInfo.tfidf_features !== undefined ? {
              tfidfFeatures: cbfInfo.tfidf_features,
              totalContentIndexed: cbfInfo.total_content_indexed,
              userItemsUsedForProfile: cbfInfo.user_items_used_for_profile,
              description: `TF-IDF matrisi ${cbfInfo.tfidf_features} özellik ile oluşturuldu. ` +
                `Kullanıcının ${cbfInfo.user_items_used_for_profile}/${cbfInfo.total_content_indexed} içeriği profil vektörüne dahil edildi.`,
            } : undefined,
            cf: cfInfo.user_item_matrix_users !== undefined ? {
              matrixUsers: cfInfo.user_item_matrix_users,
              matrixItems: cfInfo.user_item_matrix_items,
              knnNeighbors: cfInfo.knn_neighbors,
              userInMatrix: cfInfo.user_in_matrix,
              description: `KNN modeli ${cfInfo.user_item_matrix_users} kullanıcı × ${cfInfo.user_item_matrix_items} içerik matrisine fitlendi. ` +
                `${cfInfo.knn_neighbors} en yakın komşu arandı. Kullanıcı matris içinde: ${cfInfo.user_in_matrix ? 'Evet' : 'Hayır'}.`,
            } : undefined,
            top5Recommendations: top5,
          },
        });

        // Separate CBF log
        if (cbfInfo.tfidf_features !== undefined) {
          systemLog({
            userId,
            category: 'ML_CBF',
            message: `İçerik tabanlı filtreleme (CBF): TF-IDF vektörizasyonu ile ${cbfInfo.tfidf_features} özellik kullanıldı. ` +
              `Kullanıcının beğendiği ${cbfInfo.user_items_used_for_profile} içeriğin ortalama vektörü profil olarak alındı. ` +
              `Kosinüs benzerliği ile ${logDetails.candidate_count} aday içerik puanlandı.`,
            details: {
              tfidfMaxFeatures: cbfInfo.tfidf_features,
              ngramRange: '(1, 2)',
              stopWords: 'english',
              totalContentIndexed: cbfInfo.total_content_indexed,
              userProfileItemCount: cbfInfo.user_items_used_for_profile,
              candidatesScored: logDetails.candidate_count,
              method: 'cosine_similarity',
            },
          });
        }

        // Separate CF log
        if (cfInfo.user_item_matrix_users !== undefined) {
          systemLog({
            userId,
            category: 'ML_CF',
            message: `İşbirlikçi filtreleme (CF): ${cfInfo.user_item_matrix_users} kullanıcı × ${cfInfo.user_item_matrix_items} içerik matrisi üzerinde ` +
              `KNN (K=${cfInfo.knn_neighbors}, metrik=kosinüs) modeli çalıştırıldı. ` +
              `${cfInfo.user_in_matrix ? 'Kullanıcı matris içinde bulundu, benzer kullanıcıların puanları hesaplandı.' : 'Kullanıcı matris dışında, CF puanları sıfır olarak atandı.'}`,
            details: {
              matrixShape: `${cfInfo.user_item_matrix_users} x ${cfInfo.user_item_matrix_items}`,
              algorithm: 'KNN',
              metric: 'cosine',
              kNeighbors: cfInfo.knn_neighbors,
              userInMatrix: cfInfo.user_in_matrix,
            },
          });
        }

      } catch {
        // ML service is unreachable – fall back to DB data silently
      }

      // Return top-60 recommendations from DB (sorted by hybrid_score desc)
      const recommendations = await prisma.recommendation.findMany({
        where: { userId },
        orderBy: { hybridScore: 'desc' },
        take: 60,
        include: {
          content: {
            select: {
              id: true,
              externalId: true,
              type: true,
              title: true,
              description: true,
              genres: true,
              year: true,
              posterUrl: true,
              rating: true,
            },
          },
        },
      });

      res.json({ data: recommendations });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/recommendations/:id/feedback
router.post(
  '/:id/feedback',
  authMiddleware,
  validate(feedbackSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id, 10);
      const { liked } = req.body as z.infer<typeof feedbackSchema>;

      const existing = await prisma.recommendation.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Recommendation not found' });
        return;
      }
      if (existing.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const updated = await prisma.recommendation.update({
        where: { id },
        data: { liked },
      });

      logActivity({ userId, action: 'feedback_recommendation', entityType: 'recommendation', entityId: id, metadata: { liked } });
      systemLog({
        userId,
        category: 'USER_ACTION',
        message: `Kullanıcı ${userId}, öneri #${id} için ${liked ? 'beğendi' : 'beğenmedi'} geri bildirimi verdi.`,
        details: { recommendationId: id, liked, hybridScore: existing.hybridScore, cbfScore: existing.cbfScore, cfScore: existing.cfScore },
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
