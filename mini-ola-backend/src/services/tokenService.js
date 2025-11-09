const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');

// Config with sensible fallbacks
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TTL_MINUTES = parseInt(process.env.REFRESH_TTL_MINUTES || '10080', 10); // 7 days default

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function signAccessToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('base64url');
}

async function createRefreshToken(userId, role, meta = {}) {
  const value = generateRefreshTokenValue();
  const tokenHash = hashToken(value);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MINUTES * 60000);
  await RefreshToken.create({
    userId,
    role,
    tokenHash,
    expiresAt,
    ip: meta.ip || null,
    userAgent: meta.userAgent || null
  });
  return value; // raw value returned (never store raw)
}

async function issueTokens(user, meta = {}) {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = await createRefreshToken(user._id, user.role, meta);
  return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES_IN };
}

async function verifyRefreshToken(rawToken) {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const doc = await RefreshToken.findOne({ tokenHash });
  if (!doc) return null;
  if (doc.revokedAt) return null;
  if (doc.expiresAt < new Date()) return null;
  return doc;
}

async function rotateRefreshToken(oldRawToken, meta = {}) {
  const existing = await verifyRefreshToken(oldRawToken);
  if (!existing) return null;
  const newRaw = generateRefreshTokenValue();
  const newHash = hashToken(newRaw);
  existing.revokedAt = new Date();
  existing.replacedByTokenHash = newHash;
  await existing.save();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MINUTES * 60000);
  await RefreshToken.create({
    userId: existing.userId,
    role: existing.role,
    tokenHash: newHash,
    expiresAt,
    ip: meta.ip || null,
    userAgent: meta.userAgent || null
  });
  const accessToken = signAccessToken(existing.userId, existing.role);
  return { accessToken, refreshToken: newRaw };
}

async function revokeToken(rawToken, reason = 'logout') {
  const doc = await verifyRefreshToken(rawToken);
  if (!doc) return false;
  doc.revokedAt = new Date();
  doc.replacedByTokenHash = reason;
  await doc.save();
  return true;
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

module.exports = {
  issueTokens,
  rotateRefreshToken,
  verifyRefreshToken,
  revokeToken,
  revokeAllUserTokens
};