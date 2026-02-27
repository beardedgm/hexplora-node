import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

const PATREON_OAUTH_BASE = 'https://www.patreon.com/oauth2';          // Browser-facing (authorize)
const PATREON_API_BASE   = 'https://www.patreon.com/api/oauth2/v2';   // API v2 (identity, etc.)
const PATREON_TOKEN_URL  = 'https://www.patreon.com/api/oauth2/token'; // Token exchange

// GET /api/patreon/link — get Patreon OAuth URL (requires auth)
router.get('/link', auth, (req, res) => {
  try {
    // Encode user ID in state param so callback knows which user to link
    const state = jwt.sign({ userId: req.user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '10m' });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.PATREON_CLIENT_ID,
      redirect_uri: process.env.PATREON_REDIRECT_URI,
      scope: 'identity identity.memberships',
      state,
    });

    const url = `${PATREON_OAUTH_BASE}/authorize?${params.toString()}`;
    res.json({ url });
  } catch (error) {
    console.error('Patreon link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/patreon/callback — Patreon OAuth callback
router.get('/callback', async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const { code, state } = req.query;
    console.log('[Patreon] Callback hit, code:', !!code, 'state:', !!state);

    if (!code || !state) {
      console.warn('[Patreon] Missing code or state params');
      return res.redirect(`${clientUrl}/profile?patreon=error&message=missing_params`);
    }

    // Verify state to get userId
    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      console.warn('[Patreon] Invalid state JWT');
      return res.redirect(`${clientUrl}/profile?patreon=error&message=invalid_state`);
    }
    console.log('[Patreon] State verified, userId:', decoded.userId);

    // Exchange code for access token
    console.log('[Patreon] Exchanging code for token, client_id set:', !!process.env.PATREON_CLIENT_ID);
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
    console.log('[Patreon] Token exchange successful');

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
    console.log('[Patreon] Identity fetched, patreonUserId:', patreonUserId);

    // Check if user is an active patron of our campaign
    let isActivePatron = false;
    const included = patreonData.included || [];
    console.log('[Patreon] Included items:', included.length, 'campaignId:', process.env.PATREON_CAMPAIGN_ID);
    for (const item of included) {
      if (item.type === 'member') {
        const campaignRelation = item.relationships?.campaign?.data;
        console.log('[Patreon] Member found, campaign:', campaignRelation?.id, 'status:', item.attributes.patron_status);
        if (campaignRelation?.id === process.env.PATREON_CAMPAIGN_ID) {
          isActivePatron = item.attributes.patron_status === 'active_patron';
          break;
        }
      }
    }
    console.log('[Patreon] isActivePatron:', isActivePatron);

    // Update user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.warn('[Patreon] User not found:', decoded.userId);
      return res.redirect(`${clientUrl}/profile?patreon=error&message=user_not_found`);
    }

    user.patreonId = patreonUserId;
    user.patreonAccessToken = accessToken;
    user.isPatron = isActivePatron;
    if (isActivePatron) {
      user.mapLimit = 25; // Member limit
    }
    await user.save();
    console.log('[Patreon] User updated — patreonId:', patreonUserId, 'isPatron:', isActivePatron, 'mapLimit:', user.mapLimit);

    res.redirect(`${clientUrl}/profile?patreon=linked`);
  } catch (error) {
    console.error('[Patreon] Callback error:', error.response?.data || error.message);
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
    user.mapLimit = 5; // Revert to free limit
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Patreon unlink error:', error);
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
