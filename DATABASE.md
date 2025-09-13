# Database Management

This document explains how the Vwap ingredient database is managed, backed up, and restored.

## Database Strategy

- **Production Database**: SQLite file (`vwap_ingredients.db`) stored locally
- **Version Control**: Database files are **excluded** from Git (too large, binary files)
- **Backup Strategy**: Regular local backups + cloud storage options
- **Seeding**: Automated import from OpenFoodFacts API

## Database Location

```
src/backend-api/vwap_ingredients.db    # Main database (not in Git)
src/backend-api/backups/               # Local backups (not in Git)
```

## Backup Management

### Create a Backup

```bash
cd src/backend-api
node backup-database.js create
```

This creates a timestamped backup file like `vwap_ingredients_2024-01-15_14-30-00.db` in the `backups/` directory.

### List Available Backups

```bash
node backup-database.js list
```

### Restore from Backup

```bash
node backup-database.js restore vwap_ingredients_2024-01-15_14-30-00.db
```

### Automatic Cleanup

The backup script automatically keeps only the 10 most recent backups to save disk space.

## Cloud Backup Options

Since the database isn't in Git, consider these options for additional backup security:

### Option 1: Google Drive / Dropbox
- Sync the `backups/` folder to cloud storage
- Set up automatic backup scripts with cloud upload

### Option 2: AWS S3 / Azure Blob Storage
- Upload backups to cloud object storage
- Use environment variables for credentials

### Option 3: Database Hosting Service
- PostgreSQL on Heroku/Railway/Supabase
- MongoDB Atlas
- AWS RDS

## Database Seeding

### From OpenFoodFacts
```bash
cd src/backend-api
npm run seed
```

### From Backup
```bash
node backup-database.js restore <backup-filename>
```

## Development Workflow

1. **Daily Development**: Work with local SQLite database
2. **Before Major Changes**: Create a backup
3. **Weekly**: Review and clean up old backups
4. **Monthly**: Consider uploading recent backup to cloud storage

## Production Deployment

For production deployment, consider:

1. **Environment Variables**: Database path configuration
2. **Automated Backups**: Cron jobs for regular backups
3. **Cloud Database**: Migration to hosted database service
4. **Monitoring**: Database size and performance monitoring

## Schema Changes

When modifying the database schema:

1. Create a backup before changes
2. Update the database migration scripts
3. Test with a small dataset first
4. Document the schema version

## Security Notes

- Database files contain no sensitive personal data
- Ingredients are public food information
- No authentication data is stored in the ingredient database
- Regular backups help prevent data loss

## File Sizes

Expected database sizes:
- 1,000 ingredients: ~100 KB
- 10,000 ingredients: ~1 MB  
- 50,000 ingredients: ~5 MB

Backup retention keeps ~10 backups, so expect ~50MB max for backup storage.
