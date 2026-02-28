// --- Server Configuration Constants ---
// Centralized values previously hardcoded across route/middleware files.

export const JWT_EXPIRY = '7d';
export const JWT_STATE_EXPIRY = '10m';        // Patreon OAuth state token

export const PASSWORD_MIN_LENGTH = 8;

export const FREE_MAP_LIMIT = 5;
export const PATRON_MAP_LIMIT = 25;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;  // 15 minutes
export const RATE_LIMIT_MAX_GENERAL = 100;
export const RATE_LIMIT_MAX_AUTH = 15;
export const RATE_LIMIT_MAX_MAP_WRITE = 30;
export const RATE_LIMIT_MAP_WRITE_WINDOW_MS = 60 * 1000;  // 1 minute

export const BODY_SIZE_LIMIT = '20mb';

export const MAX_TOKENS_PER_MAP = 500;
export const MAX_REVEALED_HEXES = 50000;
export const MAX_MAP_NAME_LENGTH = 200;
export const MAX_TOKEN_LABEL_LENGTH = 100;
export const MAX_TOKEN_NOTES_LENGTH = 2000;

export const PATREON_PATRON_STATUS = 'active_patron';
