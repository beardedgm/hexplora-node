import { Router } from 'express';
import auth from '../middleware/auth.js';
import mapLimit from '../middleware/mapLimit.js';
import Map from '../models/Map.js';
import { mapBodyRules, handleValidationErrors } from '../middleware/validators.js';

const router = Router();

// All routes require auth
router.use(auth);

// GET /api/maps — list user's maps (no image data for performance)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const [maps, total] = await Promise.all([
      Map.find({ userId: req.user._id })
        .select('name createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Map.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      maps: maps.map(m => ({
        _id: m._id,
        name: m.name,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List maps error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/maps/:id — get full map
router.get('/:id', async (req, res) => {
  try {
    const map = await Map.findOne({ _id: req.params.id, userId: req.user._id });
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    res.json(map);
  } catch (error) {
    console.error('Get map error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/maps — create new map (patron-only, with map limit check)
router.post('/', (req, res, next) => {
  if (!req.user.isPatron) {
    return res.status(403).json({ error: 'Cloud storage requires an active membership' });
  }
  next();
}, mapLimit, [
  ...mapBodyRules(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { name, mapImageData, settings, view, revealedHexes, tokens } = req.body;

    const map = new Map({
      userId: req.user._id,
      name: name || 'Untitled Map',
      mapImageData: mapImageData || null,
      settings: settings || {},
      view: view || {},
      revealedHexes: revealedHexes || {},
      tokens: tokens || [],
    });

    await map.save();
    res.status(201).json(map);
  } catch (error) {
    console.error('Create map error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/maps/:id — update map
router.put('/:id', [
  ...mapBodyRules(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const map = await Map.findOne({ _id: req.params.id, userId: req.user._id });
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    const { name, mapImageData, settings, view, revealedHexes, tokens } = req.body;

    if (name !== undefined) map.name = name;
    if (mapImageData !== undefined) map.mapImageData = mapImageData;
    if (settings !== undefined) map.settings = settings;
    if (view !== undefined) map.view = view;
    if (revealedHexes !== undefined) map.revealedHexes = revealedHexes;
    if (tokens !== undefined) map.tokens = tokens;

    map.markModified('revealedHexes');
    await map.save();
    res.json(map);
  } catch (error) {
    console.error('Update map error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/maps/:id — delete map
router.delete('/:id', async (req, res) => {
  try {
    const result = await Map.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Map not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete map error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
