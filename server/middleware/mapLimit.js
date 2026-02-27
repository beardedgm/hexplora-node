import Map from '../models/Map.js';

const mapLimit = async (req, res, next) => {
  try {
    const count = await Map.countDocuments({ userId: req.user._id });
    const limit = req.user.mapLimit;

    if (limit > 0 && count >= limit) {
      return res.status(403).json({
        error: 'Map limit reached',
        limit,
        current: count,
        isPatron: req.user.isPatron,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export default mapLimit;
