export const DEFAULTS = {
    // Grid settings
    hexSize: 40,
    offsetX: 0,
    offsetY: 0,
    columnCount: 20,
    rowCount: 15,
    orientation: 'pointy',
    mapScale: 100,

    // Hex data
    hexes: [],
    revealedHexes: {},

    // View
    zoomLevel: 1,
    panX: 0,
    panY: 0,

    // Appearance
    fogColor: '#225522',
    fogOpacity: 0.85,
    gridColor: '#FFFFFF',
    gridThickness: 1,
    tokenColor: '#FF0000',

    // Tokens
    tokens: [],
    nextZIndex: 1,
    selectedTokenIndex: -1,
    isDraggingToken: false,
    dragStartPos: null,
    isAddingToken: false,
    isRemovingToken: false,
    pendingTokenPos: null,
    editingTokenIndex: -1,

    // Interaction
    revealMode: true,
    debugMode: false,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0,

    // Touch
    hoveredTokenIndex: -1,
    isPinching: false,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    pinchCenter: { clientX: 0, clientY: 0 },

    // Map
    mapImage: null,
    currentMapId: null,
    currentMapBlob: null,
    currentMapName: '',

    // Render
    needsRedraw: false,
};

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 5;

export const STORAGE_KEY = 'pointyTopHexMapState';
export const MAX_LIBRARY_INFO_LENGTH = 18;

export const DEFAULT_MAP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23567d46'/%3E%3Cpath d='M0,400 Q300,350 600,500 T1200,400' stroke='%234b93c8' stroke-width='30' fill='none'/%3E%3Cpath d='M800,100 Q850,350 700,600' stroke='%234b93c8' stroke-width='20' fill='none'/%3E%3Ccircle cx='600' cy='450' r='100' fill='%234b93c8'/%3E%3C/svg%3E";
