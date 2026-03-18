process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./test.db';
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin_dev_token';
process.env.BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? 'gyg_user';
process.env.BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS ?? 'gyg_pass';
