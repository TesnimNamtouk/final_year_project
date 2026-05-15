import { z } from 'zod';

export const userContentSchema = z.object({
  body: z.object({
    externalId: z.string().min(1),
    type: z.enum(['movie', 'series', 'book']),
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    genres: z.array(z.string()).optional(),
    year: z.number().int().min(1800).max(2100).optional().nullable(),
    posterUrl: z.string().url().optional().nullable(),
    rating: z.number().int().min(1).max(10).optional().nullable(),
    status: z
      .enum(['watched', 'want', 'reading', 'read'])
      .optional(),
  }),
});

export const onboardingSchema = z.object({
  body: z.object({
    genres: z
      .array(z.string())
      .min(1, 'En az 1 tür seçiniz')
      .max(10),
    contentIds: z.array(z.number().int()).max(20).optional(),
  }),
});

export type UserContentBody = z.infer<typeof userContentSchema>['body'];
export type OnboardingBody = z.infer<typeof onboardingSchema>['body'];
