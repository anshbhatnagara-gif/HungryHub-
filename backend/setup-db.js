import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runSetup() {
  try {
    const connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      multipleStatements: true
    });
    console.log('Connected. Running schema.sql...');
    const schemaSql = fs.readFileSync('./db/schema.sql', 'utf8');
    await connection.query(schemaSql);
    console.log('Schema created. Running seed.sql...');
    const seedSql = fs.readFileSync('./db/seed.sql', 'utf8');
    await connection.query(seedSql);
    console.log('Seed data inserted successfully!');
    await connection.end();
  } catch (err) {
    console.error('Error setting up DB:', err);
  }
}
runSetup();
