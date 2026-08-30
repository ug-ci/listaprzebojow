const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const prisma = require('../services/prisma');
const { getCurrentEdition } = require('./chart');

const router = express.Router();

// Tożsamość głosującego opieramy na adresie IP (z trust proxy = realny IP klienta).
// NIE mieszamy User-Agenta do klucza limitu — był trywialnie podmieniany, co pozwalało
// obejść limit przez samą zmianę nagłówka User-Agent.
function voterHashFor(req) {
  const ip = req.ip || '';
  return crypto.createHash('sha256').update(`ip:${ip}`).digest('hex');
}

// Twardy limit liczby żądań głosowania na IP (obrona w głąb, niezależna od logiki cooldownu).
const castLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Zbyt wiele żądań głosowania. Spróbuj ponownie później.' },
});

router.get('/status', async (req, res, next) => {
  try {
    const hash = voterHashFor(req);
    const voter = await prisma.voter.findUnique({ where: { voterHash: hash } });
    if (voter && Date.now() < voter.nextEligibleVoteAt.getTime()) {
      return res.json({ success: true, inCooldown: true, nextEligibleVoteAt: voter.nextEligibleVoteAt });
    }
    res.json({ success: true, inCooldown: false, nextEligibleVoteAt: null });
  } catch (err) {
    next(err);
  }
});

router.post('/cast', castLimiter, express.json({ limit: '10kb' }), async (req, res, next) => {
  try {
    const { trackIds } = req.body || {};

    if (!Array.isArray(trackIds) || trackIds.length === 0 || trackIds.length > 3) {
      return res.status(400).json({ success: false, message: 'Wybierz od 1 do 3 utworów, aby oddać głos.' });
    }
    if (!trackIds.every((id) => typeof id === 'string')) {
      return res.status(400).json({ success: false, message: 'Nieprawidłowy format głosu.' });
    }
    if (new Set(trackIds).size !== trackIds.length) {
      return res.status(400).json({ success: false, message: 'Wykryto zduplikowane utwory w głosowaniu.' });
    }

    const edition = await getCurrentEdition();
    if (!edition || edition.status !== 'ACTIVE') {
      return res.status(409).json({ success: false, message: 'Głosowanie w tym notowaniu jest obecnie zamknięte.' });
    }

    const entries = await prisma.chartEntry.findMany({
      where: { id: { in: trackIds }, editionId: edition.id },
    });
    if (entries.length !== trackIds.length) {
      return res.status(400).json({ success: false, message: 'Jeden lub więcej wybranych utworów nie należy do bieżącego notowania.' });
    }

    const hash = voterHashFor(req);
    const now = new Date();
    const nextEligibleVoteAt = new Date(now.getTime() + 24 * 3600 * 1000);
    const ip = req.ip || '';
    const userAgent = req.get('user-agent') || '';

    // Sprawdzenie cooldownu i zapis w JEDNEJ transakcji — eliminuje wyścig (race condition),
    // w którym równoległe żądania z tego samego IP mogły przejść walidację przed zapisem.
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const existingVoter = await tx.voter.findUnique({ where: { voterHash: hash } });
        if (existingVoter && Date.now() < existingVoter.nextEligibleVoteAt.getTime()) {
          const e = new Error('cooldown');
          e.code = 'COOLDOWN';
          e.nextEligibleVoteAt = existingVoter.nextEligibleVoteAt;
          throw e;
        }

        const voter = await tx.voter.upsert({
          where: { voterHash: hash },
          create: { voterHash: hash, lastVotedAt: now, nextEligibleVoteAt },
          update: { lastVotedAt: now, nextEligibleVoteAt },
        });

        for (const entry of entries) {
          await tx.chartEntry.update({
            where: { id: entry.id },
            data: { votesCount: { increment: 1 } },
          });
          await tx.vote.create({
            data: {
              editionId: edition.id,
              trackId: entry.trackId,
              voterId: voter.id,
              ipAddress: ip,
              userAgent,
              fingerprintHash: hash,
            },
          });
        }

        return tx.chartEntry.findMany({ where: { id: { in: trackIds } } });
      });
    } catch (e) {
      if (e.code === 'COOLDOWN') {
        return res.status(429).json({
          success: false,
          message: 'Twój limit głosów na 24h jest obecnie aktywny.',
          nextEligibleVoteAt: e.nextEligibleVoteAt,
        });
      }
      throw e;
    }

    res.json({
      success: true,
      message: 'Głosy zostały pomyślnie zarejestrowane. Dziękujemy!',
      nextEligibleVoteAt,
      updatedEntries: result.map((e) => ({ id: e.id, votes: e.votesCount })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
