const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies && req.cookies.mors_token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Wymagane zalogowanie do panelu redakcji.' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Konto nieaktywne lub nie istnieje.' });
    }
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Sesja wygasła, zaloguj się ponownie.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: 'Brak uprawnień do wykonania tej operacji.' });
    }
    next();
  };
}

module.exports = { requireAdmin, requireRole };
