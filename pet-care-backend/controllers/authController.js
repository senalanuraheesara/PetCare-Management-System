const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const net = require('net');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const OTP = require('../models/OTP');

/**
 * Railway often has no IPv6 egress; Node may still pick Gmail's AAAA first → ENETUNREACH.
 * Resolve IPv4 once, connect to that address, and set TLS SNI to the real hostname so the cert validates.
 */
async function smtpIpv4ConnectTarget(hostname) {
  try {
    const { address } = await dns.promises.lookup(hostname, { family: 4 });
    if (address && net.isIPv4(address)) {
      return { host: address, tlsServername: hostname };
    }
  } catch (e) {
    console.warn(`[OTP] IPv4 lookup failed for ${hostname}:`, e.message);
  }
  return { host: hostname, tlsServername: undefined };
}

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUserByEmail = (email) => {
  const trimmed = (email || '').trim();
  if (!trimmed) return null;
  return User.findOne({ email: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') });
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const SMTP_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.SMTP_SEND_TIMEOUT_MS) || 15000, 5000),
  60000
);

/**
 * Sends OTP email when SMTP is configured. Never throws — callers rely on return value.
 * Gmail from Railway can otherwise hang for minutes (blocked port, bad app password, etc.),
 * which caused mobile clients to hit Axios 30s timeouts.
 * @returns {Promise<boolean>} true if mail was accepted by SMTP
 */
const sendEmailOTP = async (email, otp, purpose = 'registration') => {
  const subject = purpose === 'login'
    ? 'Pet Care App - Login OTP'
    : 'Pet Care App - Verification OTP';
  const text = purpose === 'login'
    ? `Your OTP for login is: ${otp}`
    : `Your OTP for registration is: ${otp}`;

  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    console.warn(
      `[OTP] EMAIL_USER/EMAIL_PASS not set — cannot email ${email} (${purpose}). Set Gmail credentials on the server for production.`
    );
    return false;
  }

  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const envPort = Number(process.env.SMTP_PORT);
  const tryPorts =
    Number.isFinite(envPort) && envPort > 0
      ? envPort === 465
        ? [465, 587]
        : envPort === 587
          ? [587, 465]
          : [envPort]
      : [465, 587];

  const mailOptions = {
    from: user,
    to: email,
    subject,
    text,
  };

  const sendWithTimeout = (transporter) =>
    Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`SMTP send timed out after ${SMTP_TIMEOUT_MS}ms`)), SMTP_TIMEOUT_MS);
      }),
    ]);

  const { host: connectHost, tlsServername } = await smtpIpv4ConnectTarget(smtpHost);
  if (connectHost !== smtpHost) {
    console.warn(`[OTP] SMTP using IPv4 ${connectHost} (SNI ${tlsServername}) for ${smtpHost}`);
  }

  for (const smtpPort of tryPorts) {
    const secure = smtpPort === 465;
    const transporter = nodemailer.createTransport({
      host: connectHost,
      port: smtpPort,
      secure,
      ...(smtpPort === 587 ? { requireTLS: true } : {}),
      auth: { user, pass },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
      ...(tlsServername
        ? { tls: { servername: tlsServername, minVersion: 'TLSv1.2' } }
        : { tls: { minVersion: 'TLSv1.2' } }),
    });

    try {
      await sendWithTimeout(transporter);
      if (tryPorts.length > 1 && tryPorts[0] !== smtpPort) {
        console.warn(`[OTP] SMTP succeeded on fallback port ${smtpPort} for ${email} (${purpose})`);
      }
      transporter.close();
      return true;
    } catch (err) {
      const smtpMeta = [err?.code, err?.responseCode, err?.command].filter(Boolean).join(' ');
      console.error(
        `[OTP] SMTP failed (${connectHost}:${smtpPort} via ${smtpHost}) for ${email} (${purpose}):`,
        err?.message || err,
        smtpMeta || ''
      );
      transporter.close();
    }
  }

  return false;
};

// @desc    Send OTP via Email for registration or login
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400);
      throw new Error('Please provide an email address');
    }

    const userExists = await findUserByEmail(email);
    const purpose = userExists ? 'login' : 'registration';
    const emailNorm = email.trim().toLowerCase();

    const mailConfigured = Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());
    if (
      process.env.NODE_ENV === 'production' &&
      !mailConfigured &&
      process.env.REQUIRE_SMTP_FOR_OTP === 'true'
    ) {
      return res.status(503).json({
        message:
          'OTP email is not configured. Set EMAIL_USER and EMAIL_PASS on the server, or remove REQUIRE_SMTP_FOR_OTP.',
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: emailNorm });

    // Save new OTP (normalized email for reliable lookup)
    await OTP.create({
      email: emailNorm,
      otp
    });

    const emailSent = await sendEmailOTP(email.trim(), otp, purpose);

    const exposeOtpInApi =
      process.env.NODE_ENV !== 'production' ||
      process.env.EXPOSE_OTP_IN_RESPONSE === 'true' ||
      process.env.EXPOSE_OTP_IN_RESPONSE === '1';

    if (!emailSent && !exposeOtpInApi) {
      await OTP.deleteMany({ email: emailNorm });
      return res.status(503).json({
        message: mailConfigured
          ? 'We could not deliver the verification email. Check EMAIL_USER / EMAIL_PASS on the server and try again, or check spam.'
          : 'Email is not configured on the server. Set EMAIL_USER and EMAIL_PASS so codes are sent to the address you entered.',
      });
    }

    const responsePayload = {
      message: emailSent
        ? `OTP sent successfully for ${purpose}`
        : mailConfigured
          ? 'Email could not be delivered in time; use the code below to continue (dev / debug only).'
          : `OTP generated for ${purpose} (dev / debug only)`,
    };
    if (!emailSent && exposeOtpInApi) {
      responsePayload.otp = otp;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Login with OTP
// @route   POST /api/auth/login-otp
// @access  Public
const loginWithOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Please provide email and OTP');
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(400);
      throw new Error('No account found with this email');
    }

    const emailNorm = email.trim().toLowerCase();
    const validOtpRecord = await OTP.findOne({ email: emailNorm, otp });
    if (!validOtpRecord) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    await OTP.deleteMany({ email: emailNorm });

    res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, otp } = req.body;

    if (!name || !email || !password || !otp) {
      res.status(400);
      throw new Error('Please add all fields including OTP');
    }

    // Check if user exists
    const userExists = await findUserByEmail(email);

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const emailNorm = email.trim().toLowerCase();

    // Verify OTP
    const validOtpRecord = await OTP.findOne({ email: emailNorm, otp });
    if (!validOtpRecord) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    // Create user
    const user = await User.create({
      name,
      email: emailNorm,
      password,
      phone
    });

    // After successful registration, delete the OTP record
    await OTP.deleteMany({ email: emailNorm });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);

    if (!user) {
      res.status(400);
      throw new Error('Invalid credentials');
    }
    
    // Check if they are a google-only user
    if (user.authProvider === 'google' && !user.password) {
      res.status(400);
      throw new Error('Please login with Google');
    }

    if (!user.password) {
      res.status(400);
      throw new Error('This account has no password set. Use Register or OTP login.');
    }

    if (await bcrypt.compare(password, user.password)) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid credentials');
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Google Login / Register
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    if (process.env.ALLOW_INSECURE_GOOGLE_AUTH !== 'true') {
      return res.status(403).json({
        message: 'Google sign-in is disabled. Use email and password or OTP.',
      });
    }

    const { email, name } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('No email provided from Google');
    }

    const displayName = (name && String(name).trim()) || String(email).split('@')[0] || 'User';

    let user = await findUserByEmail(email);

    if (!user) {
      user = await User.create({
        name: displayName,
        email: email.trim().toLowerCase(),
        authProvider: 'google'
      });
    }

    const isNewUser = user.createdAt.getTime() === user.updatedAt.getTime();

    res.status(isNewUser ? 201 : 200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
      role: user.role,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  console.log('--- PASSWORD RESET ATTEMPT ---', req.body.email);
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400);
      throw new Error('Please provide email, OTP, and new password');
    }

    const emailNorm = email.trim().toLowerCase();
    
    // Verify OTP
    const validOtpRecord = await OTP.findOne({ email: emailNorm, otp });
    if (!validOtpRecord) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    const user = await findUserByEmail(emailNorm);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete OTP
    await OTP.deleteMany({ email: emailNorm });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    const statusCode = res.statusCode === 200 ? 400 : res.statusCode;
    res.status(statusCode).json({ 
      message: error.message || 'Server error during password reset' 
    });
  }
};

module.exports = {
  sendOTP,
  registerUser,
  loginUser,
  loginWithOTP,
  googleLogin,
  getMe,
  resetPassword,
};
