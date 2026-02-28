import { body, validationResult } from 'express-validator';
import {
  PASSWORD_MIN_LENGTH,
  MAX_MAP_NAME_LENGTH,
  MAX_TOKENS_PER_MAP,
  MAX_REVEALED_HEXES,
  MAX_TOKEN_LABEL_LENGTH,
  MAX_TOKEN_NOTES_LENGTH,
} from '../config/constants.js';

// --- Standardized error response ---

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// --- Reusable field-level rules ---

export const usernameRules = () => body('username')
  .trim()
  .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
  .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores');

export const emailRules = () => body('email')
  .isEmail().withMessage('Valid email required')
  .normalizeEmail();

export const passwordRules = () => body('password')
  .isLength({ min: PASSWORD_MIN_LENGTH })
  .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);

export const mapNameRules = () => body('name')
  .optional()
  .trim()
  .isString().withMessage('Map name must be a string')
  .isLength({ max: MAX_MAP_NAME_LENGTH }).withMessage(`Map name must be under ${MAX_MAP_NAME_LENGTH} characters`);

export const mapImageDataRules = () => body('mapImageData')
  .optional()
  .isString().withMessage('Invalid map image data');

// --- Complex object validators for map data ---

const isPlainObject = (val) => val !== null && typeof val === 'object' && !Array.isArray(val);
const isHexColor = (val) => /^#[0-9A-Fa-f]{3,8}$/.test(val);

export const settingsRules = () => body('settings')
  .optional()
  .custom((val) => {
    if (!isPlainObject(val)) throw new Error('Settings must be an object');

    const numFields = ['hexSize', 'offsetX', 'offsetY', 'columnCount', 'rowCount', 'mapScale', 'fogOpacity', 'gridThickness'];
    for (const f of numFields) {
      if (val[f] !== undefined && typeof val[f] !== 'number') throw new Error(`settings.${f} must be a number`);
    }

    const colorFields = ['fogColor', 'gridColor', 'tokenColor'];
    for (const f of colorFields) {
      if (val[f] !== undefined && (typeof val[f] !== 'string' || !isHexColor(val[f]))) {
        throw new Error(`settings.${f} must be a valid hex color`);
      }
    }

    if (val.orientation !== undefined && !['pointy', 'flat'].includes(val.orientation)) {
      throw new Error('settings.orientation must be "pointy" or "flat"');
    }

    return true;
  });

export const viewRules = () => body('view')
  .optional()
  .custom((val) => {
    if (!isPlainObject(val)) throw new Error('View must be an object');

    for (const f of ['zoomLevel', 'panX', 'panY']) {
      if (val[f] !== undefined && typeof val[f] !== 'number') throw new Error(`view.${f} must be a number`);
    }

    return true;
  });

export const tokensRules = () => body('tokens')
  .optional()
  .isArray({ max: MAX_TOKENS_PER_MAP }).withMessage(`Tokens array cannot exceed ${MAX_TOKENS_PER_MAP} items`)
  .custom((tokens) => {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (!isPlainObject(t)) throw new Error(`tokens[${i}] must be an object`);
      if (typeof t.x !== 'number' || typeof t.y !== 'number') {
        throw new Error(`tokens[${i}].x and .y must be numbers`);
      }
      if (t.color !== undefined && (typeof t.color !== 'string' || !isHexColor(t.color))) {
        throw new Error(`tokens[${i}].color must be a valid hex color`);
      }
      if (t.label !== undefined && (typeof t.label !== 'string' || t.label.length > MAX_TOKEN_LABEL_LENGTH)) {
        throw new Error(`tokens[${i}].label must be a string under ${MAX_TOKEN_LABEL_LENGTH} chars`);
      }
      if (t.icon !== undefined && typeof t.icon !== 'string') {
        throw new Error(`tokens[${i}].icon must be a string`);
      }
      if (t.notes !== undefined && (typeof t.notes !== 'string' || t.notes.length > MAX_TOKEN_NOTES_LENGTH)) {
        throw new Error(`tokens[${i}].notes must be a string under ${MAX_TOKEN_NOTES_LENGTH} chars`);
      }
      if (t.zIndex !== undefined && typeof t.zIndex !== 'number') {
        throw new Error(`tokens[${i}].zIndex must be a number`);
      }
    }
    return true;
  });

export const revealedHexesRules = () => body('revealedHexes')
  .optional()
  .custom((val) => {
    if (!isPlainObject(val)) throw new Error('revealedHexes must be an object');

    const keys = Object.keys(val);
    if (keys.length > MAX_REVEALED_HEXES) {
      throw new Error(`revealedHexes cannot exceed ${MAX_REVEALED_HEXES} entries`);
    }

    for (const k of keys) {
      if (typeof val[k] !== 'boolean') {
        throw new Error('revealedHexes values must be booleans');
      }
    }

    return true;
  });

// Pre-built validation chains for map create/update
export const mapBodyRules = () => [
  mapNameRules(),
  mapImageDataRules(),
  settingsRules(),
  viewRules(),
  tokensRules(),
  revealedHexesRules(),
];
