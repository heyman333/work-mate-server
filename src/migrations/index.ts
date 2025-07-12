import { migrateWorkPlaceDescription } from './001_migrate_workplace_description';
import { migrateUserLikes } from './002_migrate_user_likes';

export const migrations = [
  {
    name: '001_migrate_workplace_description',
    description: 'Migrate WorkPlace description from string to array of objects',
    run: migrateWorkPlaceDescription
  },
  {
    name: '002_migrate_user_likes',
    description: 'Migrate user likes from arrays to separate Like model with counts',
    run: migrateUserLikes
  }
];

export async function runMigrations() {
  console.log('Starting migrations...');
  
  for (const migration of migrations) {
    console.log(`Running migration: ${migration.name}`);
    console.log(`Description: ${migration.description}`);
    
    try {
      await migration.run();
      console.log(`✓ Migration ${migration.name} completed successfully`);
    } catch (error) {
      console.error(`✗ Migration ${migration.name} failed:`, error);
      throw error;
    }
  }
  
  console.log('All migrations completed successfully');
}