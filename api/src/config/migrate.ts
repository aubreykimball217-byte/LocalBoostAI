import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrate = async () => {
  try {
    console.log('Starting migrations...');
    
    const migrationsPath = path.join(__dirname, '../../../database/migrations');
    if (!fs.existsSync(migrationsPath)) {
      console.error(`Migrations path not found: ${migrationsPath}`);
      process.exit(1);
    }
    
    const migrationFiles = fs.readdirSync(migrationsPath).sort();

    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
        await db.query(sql);
      }
    }

    console.log('Migrations completed successfully.');

    if (process.argv.includes('--seed')) {
      console.log('Starting seeding...');
      const seedsPath = path.join(__dirname, '../../../database/seeds');
      if (!fs.existsSync(seedsPath)) {
        console.error(`Seeds path not found: ${seedsPath}`);
      } else {
        const seedFiles = fs.readdirSync(seedsPath).sort();

        for (const file of seedFiles) {
          if (file.endsWith('.sql')) {
            console.log(`Running seed: ${file}`);
            const sql = fs.readFileSync(path.join(seedsPath, file), 'utf8');
            await db.query(sql);
          }
        }
        console.log('Seeding completed successfully.');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
