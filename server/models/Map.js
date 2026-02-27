import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  color: { type: String, default: '#FF0000' },
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  notes: { type: String, default: '' },
  zIndex: { type: Number, default: 1 },
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  hexSize: { type: Number, default: 40 },
  offsetX: { type: Number, default: 0 },
  offsetY: { type: Number, default: 0 },
  columnCount: { type: Number, default: 20 },
  rowCount: { type: Number, default: 15 },
  orientation: { type: String, enum: ['pointy', 'flat'], default: 'pointy' },
  mapScale: { type: Number, default: 100 },
  fogColor: { type: String, default: '#225522' },
  fogOpacity: { type: Number, default: 0.85 },
  gridColor: { type: String, default: '#FFFFFF' },
  gridThickness: { type: Number, default: 1 },
  tokenColor: { type: String, default: '#FF0000' },
}, { _id: false });

const viewSchema = new mongoose.Schema({
  zoomLevel: { type: Number, default: 1 },
  panX: { type: Number, default: 0 },
  panY: { type: Number, default: 0 },
}, { _id: false });

const mapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    default: 'Untitled Map',
  },
  mapImageData: {
    type: String,
    default: null,
  },
  settings: {
    type: settingsSchema,
    default: () => ({}),
  },
  view: {
    type: viewSchema,
    default: () => ({}),
  },
  revealedHexes: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  tokens: {
    type: [tokenSchema],
    default: [],
  },
}, {
  timestamps: true,
});

const Map = mongoose.model('Map', mapSchema);
export default Map;
