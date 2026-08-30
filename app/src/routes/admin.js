const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const prisma = require('../services/prisma');
const { requireAdmin, requireRole } = require('../middleware/auth');
const { getCurrentEdition } = require('./chart');
const { serializeChartEntry, serializeWaitingEntry } = require('../services/chartSerializer');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 }, // maks. 5 MB / plik
  fileFilter: (req, file, cb) => {
    const allowed = {
      cover: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'],
    };
    const ok = allowed[file.fieldname] && allowed[file.fieldname].includes(file.mimetype);
    if (!ok) return cb(new Error('Niedozwolony typ pliku.'));
    cb(null, true);
  },
});

const COVERS_DIR = path.join(__dirname, '..', '..', 'uploads', 'covers');
fs.mkdirSync(COVERS_DIR, { recursive: true });

const AUDIO_DIR = path.join(__dirname, '..', '..', 'uploads', 'audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Rozszerzenie pliku audio na podstawie typu MIME (do zapisu na dysku).
const AUDIO_EXT = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
};

function parseDuration(str, fallback = 210) {
  if (!str) return fallback;
  const parts = String(str).split(':');
  if (parts.length !== 2) return fallback;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (Number.isNaN(m) || Number.isNaN(s)) return fallback;
  return m * 60 + s;
}

async function logAction(adminId, action, metadata) {
  await prisma.auditLog.create({ data: { adminId, action, metadata: metadata || undefined } });
}

router.use(requireAdmin);

// ── Tracks ───────────────────────────────────────────────────────────────
router.get('/tracks', async (req, res, next) => {
  try {
    const edition = await getCurrentEdition();
    const tracks = await prisma.track.findMany({
      where: { status: { in: ['CHART', 'WAITING_ROOM'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        entries: edition ? { where: { editionId: edition.id } } : false,
      },
    });

    const shaped = tracks.map((t) => {
      const entry = t.entries && t.entries[0];
      return {
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        genre: t.genre,
        coverImageUrl: t.coverImageUrl,
        status: t.status,
        section: entry ? (entry.isInWaitingRoom ? 'Poczekalnia' : 'Notowanie') : (t.status === 'CHART' ? 'Notowanie' : 'Poczekalnia'),
        votes: entry ? entry.votesCount : 0,
      };
    });

    res.json({ success: true, tracks: shaped });
  } catch (err) {
    next(err);
  }
});

router.post('/tracks/upload', requireRole('SUPER_ADMIN', 'MUSIC_EDITOR'), upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res, next) => {
  try {
    const { title, artist, target, duration } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ success: false, message: 'Wprowadź tytuł utworu i wykonawcę.' });
    }

    const edition = await getCurrentEdition();
    if (!edition) {
      return res.status(409).json({ success: false, message: 'Brak aktywnego notowania.' });
    }

    let coverImageUrl = null;
    const coverFile = req.files && req.files.cover && req.files.cover[0];
    if (coverFile) {
      const filename = `${crypto.randomUUID()}.webp`;
      const outPath = path.join(COVERS_DIR, filename);
      await sharp(coverFile.buffer).resize(600, 600, { fit: 'cover' }).webp().toFile(outPath);
      coverImageUrl = `/uploads/covers/${filename}`;
    }

    let audioUrl = null;
    const audioFile = req.files && req.files.audio && req.files.audio[0];
    if (audioFile) {
      const ext = AUDIO_EXT[audioFile.mimetype] || 'bin';
      const filename = `${crypto.randomUUID()}.${ext}`;
      const outPath = path.join(AUDIO_DIR, filename);
      await fs.promises.writeFile(outPath, audioFile.buffer);
      audioUrl = `/uploads/audio/${filename}`;
    }

    const isChart = target === 'chart';
    const track = await prisma.track.create({
      data: {
        title,
        artist,
        status: isChart ? 'CHART' : 'WAITING_ROOM',
        durationSeconds: parseDuration(duration),
        coverImageUrl,
        audioUrl,
      },
    });

    if (isChart) {
      const maxPos = await prisma.chartEntry.aggregate({
        where: { editionId: edition.id, isInWaitingRoom: false },
        _max: { position: true },
      });
      const position = (maxPos._max.position || 0) + 1;
      await prisma.chartEntry.create({
        data: {
          editionId: edition.id,
          trackId: track.id,
          position,
          trend: 'NEW',
          votesCount: 0,
          weeksOnChart: 1,
          isInWaitingRoom: false,
        },
      });
    } else {
      await prisma.chartEntry.create({
        data: {
          editionId: edition.id,
          trackId: track.id,
          position: null,
          trend: 'NEW',
          votesCount: 0,
          weeksOnChart: 1,
          isInWaitingRoom: true,
          tag: 'Dodany przez redakcję',
        },
      });
    }

    await logAction(req.admin.id, 'TRACK_UPLOAD', { trackId: track.id, title, target });

    res.json({ success: true, track });
  } catch (err) {
    next(err);
  }
});

router.put('/tracks/:id', requireRole('SUPER_ADMIN', 'MUSIC_EDITOR'), async (req, res, next) => {
  try {
    const { title, artist, album, genre, bpm, durationSeconds } = req.body;
    const track = await prisma.track.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(artist !== undefined && { artist }),
        ...(album !== undefined && { album }),
        ...(genre !== undefined && { genre }),
        ...(bpm !== undefined && { bpm: bpm === null ? null : Number(bpm) }),
        ...(durationSeconds !== undefined && { durationSeconds: Number(durationSeconds) }),
      },
    });
    await logAction(req.admin.id, 'TRACK_UPDATE', { trackId: track.id });
    res.json({ success: true, track });
  } catch (err) {
    next(err);
  }
});

router.delete('/tracks/:id', requireRole('SUPER_ADMIN', 'MUSIC_EDITOR'), async (req, res, next) => {
  try {
    const track = await prisma.track.findUnique({ where: { id: req.params.id } });
    if (!track) {
      return res.status(404).json({ success: false, message: 'Utwór nie istnieje.' });
    }
    await prisma.track.delete({ where: { id: req.params.id } });
    await logAction(req.admin.id, 'TRACK_DELETE', { trackId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Chart lifecycle ─────────────────────────────────────────────────────
router.post('/chart/freeze', requireRole('SUPER_ADMIN', 'MUSIC_EDITOR'), async (req, res, next) => {
  try {
    const edition = await getCurrentEdition();
    if (!edition) {
      return res.status(409).json({ success: false, message: 'Brak aktywnego notowania.' });
    }
    const updated = await prisma.chartEdition.update({ where: { id: edition.id }, data: { status: 'FROZEN' } });
    await logAction(req.admin.id, 'CHART_FREEZE', { editionId: edition.id });
    res.json({ success: true, edition: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/chart/reset-and-publish', requireRole('SUPER_ADMIN', 'MUSIC_EDITOR'), async (req, res, next) => {
  try {
    const edition = await getCurrentEdition();
    if (!edition) {
      return res.status(409).json({ success: false, message: 'Brak aktywnego notowania.' });
    }

    const chartEntries = await prisma.chartEntry.findMany({
      where: { editionId: edition.id, isInWaitingRoom: false },
      include: { track: true },
      orderBy: { votesCount: 'desc' },
    });
    const waitingEntries = await prisma.chartEntry.findMany({
      where: { editionId: edition.id, isInWaitingRoom: true },
      include: { track: true },
      orderBy: { votesCount: 'desc' },
    });

    const sortedChart = [...chartEntries].sort((a, b) => b.votesCount - a.votesCount);
    const sortedWaiting = [...waitingEntries].sort((a, b) => b.votesCount - a.votesCount);
    const promoted = sortedWaiting.slice(0, 2);
    const remainingWaiting = sortedWaiting.slice(2);

    const now = new Date();
    const newEdition = await prisma.chartEdition.create({
      data: {
        editionNumber: edition.editionNumber + 1,
        title: `Notowanie ${edition.editionNumber + 1} • Wydanie Główne`,
        votingStartsAt: now,
        votingEndsAt: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
        status: 'ACTIVE',
        isCurrent: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.chartEdition.update({ where: { id: edition.id }, data: { isCurrent: false, status: 'ARCHIVED' } });

      const top18 = sortedChart.slice(0, 18);
      for (let i = 0; i < top18.length; i++) {
        const entry = top18[i];
        const newPos = i + 1;
        let trend = 'SAME';
        if (entry.position > newPos) trend = 'UP';
        else if (entry.position < newPos) trend = 'DOWN';

        await tx.chartEntry.create({
          data: {
            editionId: newEdition.id,
            trackId: entry.trackId,
            position: newPos,
            previousPosition: entry.position,
            trend,
            votesCount: 0,
            weeksOnChart: entry.weeksOnChart + 1,
            isInWaitingRoom: false,
          },
        });

        const peak = entry.track.peakPosition ? Math.min(entry.track.peakPosition, newPos) : newPos;
        await tx.track.update({
          where: { id: entry.trackId },
          data: { peakPosition: peak, totalWeeksOnChart: entry.weeksOnChart + 1, status: 'CHART' },
        });
      }

      for (let i = 0; i < promoted.length; i++) {
        const entry = promoted[i];
        const newPos = 19 + i;

        await tx.chartEntry.create({
          data: {
            editionId: newEdition.id,
            trackId: entry.trackId,
            position: newPos,
            previousPosition: null,
            trend: 'NEW',
            votesCount: 0,
            weeksOnChart: 1,
            isInWaitingRoom: false,
          },
        });

        await tx.track.update({
          where: { id: entry.trackId },
          data: { peakPosition: newPos, totalWeeksOnChart: 1, status: 'CHART' },
        });
      }

      for (const entry of remainingWaiting) {
        await tx.chartEntry.create({
          data: {
            editionId: newEdition.id,
            trackId: entry.trackId,
            position: null,
            trend: 'NEW',
            votesCount: 0,
            weeksOnChart: entry.weeksOnChart + 1,
            isInWaitingRoom: true,
            tag: entry.tag,
          },
        });
      }

      const totalWaiting = remainingWaiting.length;
      const toPad = Math.max(0, 25 - totalWaiting);
      for (let i = 0; i < toPad; i++) {
        const idNum = totalWaiting + i + 1;
        const newTrack = await tx.track.create({
          data: {
            title: `Nowa Propozycja #${idNum}`,
            artist: 'Młoda Fala UG',
            status: 'WAITING_ROOM',
            durationSeconds: 195,
          },
        });
        await tx.chartEntry.create({
          data: {
            editionId: newEdition.id,
            trackId: newTrack.id,
            position: null,
            trend: 'NEW',
            votesCount: 0,
            weeksOnChart: 1,
            isInWaitingRoom: true,
            tag: 'Nowość redakcji',
          },
        });
      }
    });

    await logAction(req.admin.id, 'CHART_RESET_AND_PUBLISH', {
      previousEditionId: edition.id,
      newEditionId: newEdition.id,
      newEditionNumber: newEdition.editionNumber,
    });

    res.json({ success: true, edition: newEdition });
  } catch (err) {
    next(err);
  }
});

// ── Editors (RBAC: SUPER_ADMIN only) ────────────────────────────────────
router.get('/editors', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const editors = await prisma.adminUser.findMany({
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, editors });
  } catch (err) {
    next(err);
  }
});

router.post('/editors', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { fullName, email, role } = req.body || {};
    if (!fullName || !email) {
      return res.status(400).json({ success: false, message: 'Wprowadź imię, nazwisko i adres e-mail redaktora.' });
    }
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Redaktor z tym adresem e-mail już istnieje.' });
    }

    // Losowe hasło jednorazowe — pokazywane redakcji tylko raz w odpowiedzi (do przekazania nowemu redaktorowi).
    const tempPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const editor = await prisma.adminUser.create({
      data: {
        fullName,
        email,
        role: role || 'MUSIC_EDITOR',
        passwordHash,
        isActive: true,
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    });

    await logAction(req.admin.id, 'EDITOR_CREATE', { editorId: editor.id, email });

    res.json({ success: true, editor, tempPassword });
  } catch (err) {
    next(err);
  }
});

router.delete('/editors/:id', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ success: false, message: 'Nie możesz usunąć aktualnie zalogowanego konta redaktora.' });
    }
    await prisma.adminUser.delete({ where: { id: req.params.id } });
    await logAction(req.admin.id, 'EDITOR_DELETE', { editorId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Mapowanie błędów uploadu (zły typ pliku / przekroczony rozmiar) na 400 zamiast 500.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Niedozwolony typ pliku.') {
    return res.status(400).json({ success: false, message: err.message || 'Błąd przesyłania pliku.' });
  }
  next(err);
});

module.exports = router;
