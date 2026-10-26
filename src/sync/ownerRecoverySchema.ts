// Codec metadata only; importing this never opens or migrates the database.
export const SYNC_DATABASE_VERSION = 3;
export const OWNER_RECOVERY_STORES = ['documents', 'local-states', 'outbox',
  'learning-command-outbox', 'learning-projections', 'lesson-resumes', 'assessment-resumes'] as const;
