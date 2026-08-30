require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookie = require('cookie');

const chartRoutes = require('./src/routes/chart');
const voteRoutes = require('./src/routes/votes');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Walidacja krytycznej konfiguracji przy starcie ──────────────────────────
const WEAK_SECRETS = [
  'zmien-na-losowy-ciag-znakow-minimum-32-znaki',
  'radio-mors-ug-super-secret-jwt-key-2026-change-in-production',
];
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || WEAK_SECRETS.includes(process.env.JWT_SECRET)) {
  console.error('\n❌ Błąd konfiguracji: JWT_SECRET jest pusty, zbyt krótki (<32 znaki) lub domyślny.');
  console.error('   Wygeneruj silny sekret, np.: openssl rand -base64 48\n');
  process.exit(1);
}

// Za reverse-proxy (nginx itd.) — poprawne req.ip z X-Forwarded-For
app.set('trust proxy', IS_PROD ? 1 : false);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Skrypty ładowane wyłącznie z zaufanych źródeł (bez 'unsafe-inline' — brak inline <script>)
      scriptSrc: [
        "'self'",
        'https://unpkg.com',
      ],
      // Inline handlery (onclick=...) w istniejącym UI wymagają tego wyjątku.
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: IS_PROD
    ? ['https://mors.ug.edu.pl']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(morgan('dev'));
// Limity ciała żądania ograniczone do rozsądnych wartości (ochrona przed DoS).
// Uploady plików obsługuje multer (osobny limit), nie te parsery.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use((req, res, next) => {
  req.cookies = cookie.parse(req.headers.cookie || '');
  next();
});

// ── Statyczne pliki ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/chart', chartRoutes);
app.use('/api/v1/votes', voteRoutes);
app.use('/api/v1/voter', voteRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Radio MORS API', version: '1.0.0' });
});

// ── SPA fallback – wszystkie inne requesty → index.html ─────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  // W produkcji nie ujawniamy szczegółów błędu klientowi.
  const message = (!IS_PROD || status < 500)
    ? (err.message || 'Wewnętrzny błąd serwera')
    : 'Wewnętrzny błąd serwera';
  res.status(status).json({ success: false, message });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎵 Radio MORS API uruchomiony na http://localhost:${PORT}`);
  console.log(`📡 Środowisko: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Baza danych: skonfigurowana (${IS_PROD ? 'produkcja' : 'development'})\n`);
});

module.exports = app;
