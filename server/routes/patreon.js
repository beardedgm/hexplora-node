import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import { encrypt } from '../util/crypto.js';
import {
  JWT_STATE_EXPIRY,
  PATRON_MAP_LIMIT,
  FREE_MAP_LIMIT,
  PATREON_PATRON_STATUS,
} from '../config/constants.js';

const router = Router();

const PATREON_OAUTH_BASE = 'https://www.patreon.com/oauth2';
const PATREON_API_BASE   = 'https://www.patreon.com/api/oauth2/v2';
const PATREON_TOKEN_URL  = 'https://www.patreon.com/api/oauth2/token';

const isDev = process.env.NODE_ENV !== 'production';

// Minimal logger — verbose in dev, quiet in production
function log(...args) { if (isDev) console.log('[Patreon]', ...args); }
function warn(...args) { console.warn('[Patreon]', ...args); }

// GET /api/patreon/link — get Patreon OAuth URL (requires auth)
router.get('/link', auth, (req, res) => {
  try {
    const state = jwt.sign(
      { userId: req.user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: JWT_STATE_EXPIRY },
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.PATREON_CLIENT_ID,
      redirect_uri: process.env.PATREON_REDIRECT_URI,
      scope: 'identity identity.memberships campaigns',
      state,
    });

    const url = `${PATREON_OAUTH_BASE}/authorize?${params.toString()}`;
    res.json({ url });
  } catch (error) {
    console.error('Patreon link error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/patreon/callback — Patreon OAuth callback
router.get('/callback', async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const { code, state } = req.query;
    log('Callback received');

    if (!code || !state) {
      warn('Missing code or state params');
      return res.redirect(`${clientUrl}/profile?patreon=error&message=missing_params`);
    }

    // Verify state to get userId
    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      warn('Invalid state JWT');
      return res.redirect(`${clientUrl}/profile?patreon=error&message=invalid_state`);
    }
    log('State verified');

    // Exchange code for access token
    const tokenResponse = await axios.post(PATREON_TOKEN_URL, new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.PATREON_CLIENT_ID,
      client_secret: process.env.PATREON_CLIENT_SECRET,
      redirect_uri: process.env.PATREON_REDIRECT_URI,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenResponse.data.access_token;
    log('Token exchange successful');

    // Get Patreon identity + memberships
    const identityResponse = await axios.get(`${PATREON_API_BASE}/identity`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        'include': 'memberships.campaign',
        'fields[user]': 'full_name',
        'fields[member]': 'patron_status,currently_entitled_amount_cents',
      },
    });

    const patreonData = identityResponse.data;
    const patreonUserId = patreonData.data.id;

    // Check if user is an active patron of our campaign
    let isActivePatron = false;
    const included = patreonData.included || [];
    for (const item of included) {
      if (item.type === 'member') {
        const campaignRelation = item.relationships?.campaign?.data;
        if (campaignRelation?.id === process.env.PATREON_CAMPAIGN_ID) {
          isActivePatron = item.attributes.patron_status === PATREON_PATRON_STATUS;
          break;
        }
      }
    }

    // If not found as a patron, check if user is the campaign creator/owner
    if (!isActivePatron) {
      try {
        const campaignsResponse = await axios.get(`${PATREON_API_BASE}/campaigns`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const campaigns = campaignsResponse.data?.data || [];
        const isCreator = campaigns.some(c => c.id === process.env.PATREON_CAMPAIGN_ID);
        if (isCreator) {
          log('User is campaign owner — granting patron status');
          isActivePatron = true;
        }
      } catch (campErr) {
        log('Could not check campaign ownership:', campErr.message);
      }
    }

    log('Patron status resolved:', isActivePatron);

    // Update user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      warn('User not found for linking');
      return res.redirect(`${clientUrl}/profile?patreon=error&message=user_not_found`);
    }

    user.patreonId = patreonUserId;
    user.patreonAccessToken = encrypt(accessToken);
    user.isPatron = isActivePatron;
    if (isActivePatron) {
      user.mapLimit = PATRON_MAP_LIMIT;
    }
    await user.save();
    log('User linked, isPatron:', isActivePatron);

    res.redirect(`${clientUrl}/profile?patreon=linked`);
  } catch (error) {
    console.error('[Patreon] Callback error:', error.message);
    res.redirect(`${clientUrl}/profile?patreon=error&message=server_error`);
  }
});

// POST /api/patreon/unlink — unlink Patreon (requires auth)
router.post('/unlink', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.patreonId = null;
    user.patreonAccessToken = null;
    user.isPatron = false;
    user.mapLimit = FREE_MAP_LIMIT;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Patreon unlink error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/patreon/status — get Patreon link status (requires auth)
router.get('/status', auth, (req, res) => {
  res.json({
    isPatron: req.user.isPatron,
    patreonId: req.user.patreonId || null,
    mapLimit: req.user.mapLimit,
  });
});

export default router;
