// API base URL — uses env var in production, localhost in dev
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default API_BASE;
