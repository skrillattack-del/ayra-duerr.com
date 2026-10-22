import path from 'path';
import dotenv from 'dotenv';

// Load env vars before importing modules that read process.env at import time.
// Use an explicit path so it works even when the backend is started from repo root.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

