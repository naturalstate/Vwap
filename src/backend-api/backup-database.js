/**
 * Database Backup Script
 * Creates timestamped backups of the SQLite database
 */

const fs = require('fs');
const path = require('path');

class DatabaseBackup {
  constructor() {
    this.dbPath = path.join(__dirname, 'vwap_ingredients.db');
    this.backupDir = path.join(__dirname, 'backups');
  }

  /**
   * Create a timestamped backup of the database
   */
  async createBackup() {
    try {
      // Create backup directory if it doesn't exist
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        console.log('📁 Created backup directory');
      }

      // Check if database exists
      if (!fs.existsSync(this.dbPath)) {
        console.log('⚠️  Database file not found, nothing to backup');
        return;
      }

      // Create timestamp for backup filename
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace(/T/, '_')
        .split('.')[0];
      
      const backupFileName = `vwap_ingredients_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);

      // Get file size for reporting
      const stats = fs.statSync(backupPath);
      const fileSizeKB = Math.round(stats.size / 1024);

      console.log(`✅ Database backup created: ${backupFileName}`);
      console.log(`📊 Backup size: ${fileSizeKB} KB`);
      
      // Clean up old backups (keep last 10)
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old backup files, keeping only the most recent ones
   */
  async cleanupOldBackups(keepCount = 10) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('vwap_ingredients_') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

      if (files.length > keepCount) {
        const filesToDelete = files.slice(keepCount);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`🗑️  Deleted old backup: ${file.name}`);
        }

        console.log(`🧹 Cleaned up ${filesToDelete.length} old backup(s)`);
      }
    } catch (error) {
      console.warn('⚠️  Could not clean up old backups:', error.message);
    }
  }

  /**
   * List all available backups
   */
  listBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        console.log('📁 No backup directory found');
        return [];
      }

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('vwap_ingredients_') && file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: Math.round(stats.size / 1024) + ' KB',
            created: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      console.log('\n📋 Available backups:');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.size}) - ${file.created}`);
      });

      return files;
    } catch (error) {
      console.error('❌ Could not list backups:', error);
      return [];
    }
  }

  /**
   * Restore database from a backup file
   */
  async restoreFromBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      // Create a backup of current database before restoring
      if (fs.existsSync(this.dbPath)) {
        const currentBackupName = `current_backup_${Date.now()}.db`;
        const currentBackupPath = path.join(this.backupDir, currentBackupName);
        fs.copyFileSync(this.dbPath, currentBackupPath);
        console.log(`💾 Current database backed up as: ${currentBackupName}`);
      }

      // Restore from backup
      fs.copyFileSync(backupPath, this.dbPath);
      console.log(`✅ Database restored from: ${backupFileName}`);

    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const backup = new DatabaseBackup();
  const command = process.argv[2];

  switch (command) {
    case 'create':
      backup.createBackup();
      break;
    case 'list':
      backup.listBackups();
      break;
    case 'restore':
      const backupFile = process.argv[3];
      if (!backupFile) {
        console.error('❌ Please specify a backup file to restore from');
        console.log('Usage: node backup-database.js restore <backup_filename>');
        process.exit(1);
      }
      backup.restoreFromBackup(backupFile);
      break;
    default:
      console.log('🌱 Vwap Database Backup Utility');
      console.log('');
      console.log('Usage:');
      console.log('  node backup-database.js create   - Create a new backup');
      console.log('  node backup-database.js list     - List all backups');
      console.log('  node backup-database.js restore <filename> - Restore from backup');
      console.log('');
      console.log('Examples:');
      console.log('  node backup-database.js create');
      console.log('  node backup-database.js restore vwap_ingredients_2024-01-15_14-30-00.db');
  }
}

module.exports = DatabaseBackup;
