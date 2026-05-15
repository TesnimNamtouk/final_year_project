import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Geçerli bir e-posta giriniz'),
    password: z
      .string()
      .min(6, 'Şifre en az 6 karakter olmalı')
      .max(72, 'Şifre çok uzun'), // bcrypt 72 char limiti
    username: z
      .string()
      .min(3, 'Kullanıcı adı en az 3 karakter')
      .max(30, 'Kullanıcı adı en fazla 30 karakter')
      .regex(/^[a-zA-Z0-9_]+$/, 'Sadece harf, rakam ve alt çizgi'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export type RegisterBody = z.infer<typeof registerSchema>['body'];
export type LoginBody = z.infer<typeof loginSchema>['body'];
