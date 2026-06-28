import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const getConnectionConfig = () => {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      multipleStatements: true,
      ssl: (url.searchParams.get('ssl-mode') === 'REQUIRED' || url.searchParams.get('ssl') === 'true') ? {
        rejectUnauthorized: false
      } : undefined
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };
};

async function runSetup() {
  try {
    const connection = await mysql.createConnection(getConnectionConfig());
    console.log('Connected. Running schema.sql...');
    const schemaSql = fs.readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf8');
    await connection.query(schemaSql);
    console.log('Schema created. Running seed.sql...');
    const seedSql = fs.readFileSync(join(__dirname, 'db', 'seed.sql'), 'utf8');
    await connection.query(seedSql);
    console.log('Seed data inserted successfully!');
    await connection.end();
  } catch (err) {
    console.error('Error setting up DB:', err);
  }
}
runSetup();
