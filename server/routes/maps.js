import { Router } from 'express';
import auth from '../middleware/auth.js';
import mapLimit from '../middleware/mapLimit.js';
import Map from '../models/Map.js';

const router = Router();

// All routes require auth
router.use(auth);

// GET /api/maps — list user's maps (no image data for performance)
router.get('/', async (req, res) => {
  try {
    const maps = await Map.find({ userId: req.user._id })
      .select('name settings.hexSize settings.columnCount settings.rowCount createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.json(maps.map(m => ({
      _id: m._id,
      name: m.name,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })));
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

// POST /api/maps — create new map (with map limit check)
router.post('/', mapLimit, async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
