import dotenv from 'dotenv';
import fs from 'fs';
import logger from './logger';

if (fs.existsSync('.env')) {
  logger.debug('Using .env file to supply config environment variables');
  dotenv.config({ path: '.env' });
} else {
  logger.error('No .env file. Create an .env file in the root directory');
}

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === 'production'; // Anything else is treated as 'dev'

// Extract environment variables and ensure they are set
export const { SESSION_SECRET, PGUSER, PGHOST, PGDATABASE, PGPASSWORD, PGPORT } = process.env;

if (!SESSION_SECRET) {
  logger.error('No client secret. Set SESSION_SECRET environment variable.');
  process.exit(1);
}

if (!PGUSER) {
  logger.error('No PostgreSQL user. Set PGUSER environment variable.');
  process.exit(1);
}

if (!PGHOST) {
  logger.error('No PostgreSQL host. Set PGHOST environment variable.');
  process.exit(1);
}

if (!PGDATABASE) {
  logger.error('No PostgreSQL database. Set PGDATABASE environment variable.');
  process.exit(1);
}

if (!PGPASSWORD) {
  logger.error('No PostgreSQL password. Set PGPASSWORD environment variable.');
  process.exit(1);
}

if (!PGPORT) {
  logger.error('No PostgreSQL port. Set PGPORT environment variable.');
  process.exit(1);
}
