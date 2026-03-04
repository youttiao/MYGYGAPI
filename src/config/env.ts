import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  basicAuthUser: required('BASIC_AUTH_USER', 'gyg_user'),
  basicAuthPass: required('BASIC_AUTH_PASS', 'gyg_pass'),
  adminToken: required('ADMIN_TOKEN', 'admin_dev_token'),
  defaultSupplierId: process.env.DEFAULT_SUPPLIER_ID ?? 'supplier123',
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 200),
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIME_WINDOW ?? '1 minute'
};
