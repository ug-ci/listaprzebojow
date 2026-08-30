const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const rateLimit = require('express-rate-limit');
const prisma = require('../services/prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const IS_PROD = process.env.NODE_ENV === 'production';

// Ochrona przed brute-force / credential stuffing na logowaniu.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 10,                  // maks. 10 prób logowania / IP / okno
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut.' },
});

function publicProfile(admin) {
  return { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role };
}

function setAuthCookie(res, admin) {
  const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
  res.setHeader('Set-Cookie', cookie.serialize('mors_token', token, {
    httpOnly: true,
    secure: IS_PROD,      // po HTTPS w produkcji
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 3600,
  }));
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Wprowadź adres e-mail i hasło administratora.' });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.isActive) {
      // Porównanie hasła również dla nieistniejącego konta — wyrównanie czasu odpowiedzi.
      await bcrypt.compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000a');
      return res.status(401).json({ success: false, message: 'Nieprawidłowe dane logowania.' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Nieprawidłowe dane logowania.' });
    }

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    setAuthCookie(res, admin);

    res.json({ success: true, admin: publicProfile(admin) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', cookie.serialize('mors_token', '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
  res.json({ success: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ success: true, admin: publicProfile(req.admin) });
});

module.exports = router;
