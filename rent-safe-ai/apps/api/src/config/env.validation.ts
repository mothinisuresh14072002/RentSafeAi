import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    MINIO_ENDPOINT: z.string(),
    MINIO_PORT: z.string(),
    MINIO_ROOT_USER: z.string(),
    MINIO_ROOT_PASSWORD: z.string(),
    ENABLE_SWAGGER: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    JWT_SECRET: z
      .string()
      .min(32)
      .default('development-only-jwt-secret-change-me-32'),
    PAYMENT_WEBHOOK_SECRET: z
      .string()
      .min(16)
      .default('development-only-webhook-secret'),
    MALWARE_SCAN_SECRET: z
      .string()
      .min(16)
      .default('development-only-malware-secret'),
    KYC_WEBHOOK_SECRET: z
      .string()
      .min(16)
      .default('development-only-kyc-webhook-secret'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      for (const [name, value] of [
        ['JWT_SECRET', env.JWT_SECRET],
        ['PAYMENT_WEBHOOK_SECRET', env.PAYMENT_WEBHOOK_SECRET],
        ['MALWARE_SCAN_SECRET', env.MALWARE_SCAN_SECRET],
        ['KYC_WEBHOOK_SECRET', env.KYC_WEBHOOK_SECRET],
      ] as const) {
        if (value.startsWith('development-only-'))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [name],
            message: `${name} must be explicitly configured in production`,
          });
      }
      if (env.ENABLE_SWAGGER)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ENABLE_SWAGGER'],
          message: 'Swagger must be disabled in production',
        });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('Environment validation error:', result.error.format());
    process.exit(1);
  }
  return result.data;
}
