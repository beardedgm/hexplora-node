import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

const PATREON_OAUTH_BASE = 'https://www.patreon.com/oauth2';
const PATREON_API_BASE = 'https://www.patreon.com/api/oauth2/v2';

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

    if (!code || !state) {
      return res.redirect(`${clientUrl}/?patreon=error&message=missing_params`);
    }

    // Verify state to get userId
    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return res.redirect(`${clientUrl}/?patreon=error&message=invalid_state`);
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(`${PATREON_OAUTH_BASE}/token`, new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.PATREON_CLIENT_ID,
      client_secret: process.env.PATREON_CLIENT_SECRET,
      redirect_uri: process.env.PATREON_REDIRECT_URI,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenResponse.data.access_token;

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
        // Check if this membership is for our campaign
        const campaignRelation = item.relationships?.campaign?.data;
        if (campaignRelation?.id === process.env.PATREON_CAMPAIGN_ID) {
          isActivePatron = item.attributes.patron_status === 'active_patron';
          break;
        }
      }
    }

    // Update user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.redirect(`${clientUrl}/?patreon=error&message=user_not_found`);
    }

    user.patreonId = patreonUserId;
    user.patreonAccessToken = accessToken;
    user.isPatron = isActivePatron;
    if (isActivePatron) {
      user.mapLimit = 9999; // Effectively unlimited
    }
    await user.save();

    res.redirect(`${clientUrl}/?patreon=linked`);
  } catch (error) {
    console.error('Patreon callback error:', error.response?.data || error.message);
    res.redirect(`${clientUrl}/?patreon=error&message=server_error`);
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
