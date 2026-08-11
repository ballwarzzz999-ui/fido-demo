/* ============================================================
   app.js — FIDO2 / WebAuthn Passwordless Authentication Demo
   Mock Backend: localStorage is used for credential storage.
   This is a frontend-only demo; no real server required.
   ============================================================ */

'use strict';

/* ── Helpers ── */
const $ = id => document.getElementById(id);

/** Convert ArrayBuffer → Base64URL string */
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Convert Base64URL → Uint8Array */
function base64urlToBuffer(b64url) {
  b64url = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64url.length % 4) b64url += '=';
  const bin = atob(b64url);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Generate a random 32-byte challenge as Uint8Array */
function generateChallenge() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return buf;
}

/* ── LocalStorage helpers ── */
const DB_KEY = 'fido2_demo_users';

function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUser(username, userData) {
  const users = getAllUsers();
  users[username.toLowerCase()] = userData;
  localStorage.setItem(DB_KEY, JSON.stringify(users));
}

function getUser(username) {
  const users = getAllUsers();
  return users[username.toLowerCase()] || null;
}

/* ── Page routing ── */
let currentPage = 'page-home';

function showPage(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  const target = $(pageId);
  if (!target) return;
  target.style.display = pageId === 'page-home' ? 'flex' : 'block';
  requestAnimationFrame(() => {
    target.classList.add('active', 'fade-in');
    setTimeout(() => target.classList.remove('fade-in'), 400);
  });
  currentPage = pageId;

  // Reset statuses on page switch
  if (pageId === 'page-register') {
    clearRegisterForm();
    hideStatus('reg-status');
  }
  if (pageId === 'page-login') {
    $('login-username').value = '';
    clearError('err-login-username');
    hideStatus('login-status');
  }
}

/* ── Toast ── */
let toastTimer = null;
function showToast(msg, type = 'info', duration = 3500) {
  const toast = $('toast');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  $('toast-icon').textContent = icons[type] || 'ℹ️';
  $('toast-msg').textContent = msg;
  toast.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.add('hidden'); }, duration);
}

/* ── Loading overlay ── */
function showLoading(text = 'กำลังดำเนินการ...') {
  $('loading-text').textContent = text;
  $('loading-overlay').classList.remove('hidden');
}
function hideLoading() {
  $('loading-overlay').classList.add('hidden');
}

/* ── Status messages ── */
function showStatus(id, msg, type = 'info') {
  const el = $(id);
  if (!el) return;
  const icons = { success: '✅', error: '❌', info: '🔐' };
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
}
function hideStatus(id) {
  const el = $(id);
  if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
}

/* ── Form validation helpers ── */
function setError(fieldId, errorId, msg) {
  const field = $(fieldId);
  if (field) field.classList.add('input-error');
  const err = $(errorId);
  if (err) err.textContent = msg;
}
function clearError(errorId, fieldId) {
  if (fieldId) { const f = $(fieldId); if (f) f.classList.remove('input-error'); }
  const e = $(errorId);
  if (e) e.textContent = '';
}
function clearAllErrors() {
  ['err-username', 'err-email', 'err-firstname', 'err-lastname', 'err-phone', 'err-login-username'].forEach(e => clearError(e));
  ['reg-username', 'reg-email', 'reg-firstname', 'reg-lastname', 'reg-phone', 'login-username'].forEach(f => {
    const el = $(f); if (el) el.classList.remove('input-error');
  });
}

function clearRegisterForm() {
  ['reg-username', 'reg-email', 'reg-firstname', 'reg-lastname', 'reg-phone'].forEach(id => {
    const el = $(id); if (el) el.value = '';
  });
  clearAllErrors();
}

/* ── Button loading state ── */
function setButtonLoading(btnId, textId, loading, text = '') {
  const btn = $(btnId);
  const span = $(textId);
  if (!btn || !span) return;
  btn.disabled = loading;
  if (loading) {
    span.textContent = text || 'กำลังดำเนินการ...';
  }
}

/* ════════════════════════════════════════════════════════════
   REGISTRATION
   ════════════════════════════════════════════════════════════ */
async function handleRegister(event) {
  event.preventDefault();
  clearAllErrors();
  hideStatus('reg-status');

  // 1️⃣ Collect & validate form data
  const username  = $('reg-username').value.trim();
  const email     = $('reg-email').value.trim();
  const firstName = $('reg-firstname').value.trim();
  const lastName  = $('reg-lastname').value.trim();
  const phone     = $('reg-phone').value.trim();

  let hasError = false;
  if (!username) { setError('reg-username', 'err-username', 'กรุณากรอก Username'); hasError = true; }
  else if (username.length < 3) { setError('reg-username', 'err-username', 'Username ต้องมีอย่างน้อย 3 ตัวอักษร'); hasError = true; }
  else if (/\s/.test(username)) { setError('reg-username', 'err-username', 'Username ต้องไม่มีช่องว่าง'); hasError = true; }

  if (!email) { setError('reg-email', 'err-email', 'กรุณากรอกอีเมล'); hasError = true; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('reg-email', 'err-email', 'รูปแบบอีเมลไม่ถูกต้อง'); hasError = true; }

  if (!firstName) { setError('reg-firstname', 'err-firstname', 'กรุณากรอกชื่อจริง'); hasError = true; }
  if (!lastName)  { setError('reg-lastname',  'err-lastname',  'กรุณากรอกนามสกุล'); hasError = true; }
  if (!phone) {
    setError('reg-phone', 'err-phone', 'กรุณากรอกเบอร์โทรศัพท์');
    hasError = true;
  } else if (!/^[0-9\-\+\s]{9,15}$/.test(phone)) {
    setError('reg-phone', 'err-phone', 'รูปแบบเบอร์โทรไม่ถูกต้อง');
    hasError = true;
  }
  if (hasError) return;

  // 2️⃣ Check duplicate username
  if (getUser(username)) {
    setError('reg-username', 'err-username', 'Username นี้มีผู้ใช้งานแล้ว');
    return;
  }

  // 3️⃣ Check WebAuthn support
  if (!window.PublicKeyCredential) {
    showStatus('reg-status', 'เบราว์เซอร์นี้ไม่รองรับ WebAuthn / FIDO2 กรุณาใช้ Chrome, Edge หรือ Safari เวอร์ชันล่าสุด', 'error');
    return;
  }

  // 4️⃣ Disable button & show loading
  setButtonLoading('reg-submit-btn', 'reg-btn-text', true);
  showLoading('⏳ กรุณายืนยันตัวตนด้วยไบโอเมตริก...');
  showStatus('reg-status', '🔐 กำลังเรียก FIDO2 API... กรุณาสแกนนิ้วมือหรือยืนยัน PIN ของคุณ', 'info');

  try {
    // 5️⃣ Build WebAuthn credential creation options
    const challenge = generateChallenge();

    // Encode username as UTF-8 bytes for user.id
    const userIdBytes = new TextEncoder().encode(username + '_' + Date.now());

    const publicKeyOptions = {
      challenge: challenge,
      rp: {
        name: 'SecureID — FIDO2 Demo',
        // id is intentionally omitted → defaults to current domain (works on localhost too)
      },
      user: {
        id: userIdBytes,
        name: username,
        displayName: `${firstName} ${lastName}`,
      },
      pubKeyCredParams: [
        { alg: -7,  type: 'public-key' }, // ES256  (ECDSA with SHA-256)
        { alg: -257, type: 'public-key' }, // RS256  (RSA with SHA-256)
      ],
      authenticatorSelection: {
        // ไม่ระบุ authenticatorAttachment → Chrome จะให้เลือกเอง:
        // อุปกรณ์นี้ (สแกนนิ้ว/Windows Hello) หรือมือถือ (QR Code)
        // Passkey จะ Sync ผ่าน Google Password Manager อัตโนมัติ
        requireResidentKey: true,           // ต้อง Discoverable Credential (passkey)
        residentKey: 'required',
        userVerification: 'required',       // บังคับยืนยัน biometric
      },
      timeout: 60000,
      attestation: 'none',                     // no attestation needed for demo
      excludeCredentials: [],                  // allow re-registration on same device
    };

    // 6️⃣ Call WebAuthn create
    const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });

    // 7️⃣ Extract and store credential data
    const credentialId = bufferToBase64url(credential.rawId);

    const userData = {
      username,
      email,
      firstName,
      lastName,
      phone,
      credentials: [
        {
          id: credentialId,
          type: credential.type,
          userId: bufferToBase64url(userIdBytes),
          createdAt: new Date().toISOString(),
        }
      ],
      registeredAt: new Date().toISOString(),
    };

    saveUser(username, userData);

    hideLoading();
    showStatus('reg-status', `✅ สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ ${firstName} ${lastName} — Credential ถูกบันทึกแล้ว`, 'success');
    showToast(`🎉 สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ ${firstName}`, 'success', 4000);

    // Auto-navigate to login after 2 seconds
    setTimeout(() => {
      showPage('page-login');
      $('login-username').value = username;
    }, 2200);

  } catch (err) {
    hideLoading();
    console.error('WebAuthn Registration Error:', err);

    let msg = '';
    if (err.name === 'NotAllowedError') {
      msg = '❌ การยืนยันตัวตนถูกยกเลิก หรือหมดเวลา กรุณาลองใหม่อีกครั้ง';
    } else if (err.name === 'InvalidStateError') {
      msg = '❌ Authenticator นี้ถูกลงทะเบียนแล้ว กรุณาใช้ Username อื่น';
    } else if (err.name === 'NotSupportedError') {
      msg = '❌ อุปกรณ์นี้ไม่รองรับ FIDO2 กรุณาตรวจสอบการตั้งค่า Biometric';
    } else if (err.name === 'SecurityError') {
      msg = '❌ ต้องการ HTTPS — กรุณา Deploy บน https:// หรือใช้ localhost';
    } else {
      msg = `❌ เกิดข้อผิดพลาด: ${err.message || err.name}`;
    }

    showStatus('reg-status', msg, 'error');
    showToast(msg, 'error', 5000);
  } finally {
    setButtonLoading('reg-submit-btn', 'reg-btn-text', false);
    $('reg-btn-text').textContent = 'สมัครสมาชิกด้วย FIDO2';
    hideLoading();
  }
}

/* ════════════════════════════════════════════════════════════
   AUTHENTICATION
   ════════════════════════════════════════════════════════════ */
async function handleLogin(event) {
  event.preventDefault();
  clearError('err-login-username', 'login-username');
  hideStatus('login-status');

  // 1️⃣ Collect username
  const username = $('login-username').value.trim();
  if (!username) {
    setError('login-username', 'err-login-username', 'กรุณากรอก Username');
    return;
  }

  // 2️⃣ Look up user in localStorage
  const user = getUser(username);
  if (!user) {
    setError('login-username', 'err-login-username', 'ไม่พบ Username นี้ในระบบ กรุณาสมัครสมาชิกก่อน');
    return;
  }

  // 3️⃣ Check WebAuthn support
  if (!window.PublicKeyCredential) {
    showStatus('login-status', 'เบราว์เซอร์นี้ไม่รองรับ WebAuthn / FIDO2', 'error');
    return;
  }

  // 4️⃣ Disable button & show loading
  setButtonLoading('login-submit-btn', 'login-btn-text', true);
  showLoading('🔐 กรุณายืนยันตัวตนด้วยไบโอเมตริก...');
  showStatus('login-status', '🔐 กำลังเรียก FIDO2 API... สแกนนิ้วมือหรือยืนยัน PIN เพื่อเข้าสู่ระบบ', 'info');

  try {
    // 5️⃣ Build allowCredentials from stored credential IDs
    const allowCredentials = user.credentials.map(c => ({
      id: base64urlToBuffer(c.id),
      type: 'public-key',
      transports: ['internal'],          // platform authenticator (device built-in)
    }));

    const challenge = generateChallenge();

    const publicKeyOptions = {
      challenge: challenge,
      allowCredentials: allowCredentials,
      userVerification: 'required',   // บังคับยืนยัน biometric ทุกครั้ง ข้ามไม่ได้
      timeout: 60000,
    };

    // 6️⃣ Call WebAuthn get (authentication)
    const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });

    // 7️⃣ Verify: credential ID must match one stored for this user
    //   (In production a server would verify the signature; here we do client-side check)
    const assertedId = bufferToBase64url(assertion.rawId);
    const matchedCred = user.credentials.find(c => c.id === assertedId);

    if (!matchedCred) {
      throw new Error('Credential ID ไม่ตรงกับที่ลงทะเบียนไว้');
    }

    // 8️⃣ Success — show dashboard
    hideLoading();
    displayDashboard(user);
    showPage('page-dashboard');
    showToast(`🎉 เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับกลับ ${user.firstName}`, 'success', 4000);

  } catch (err) {
    hideLoading();
    console.error('WebAuthn Authentication Error:', err);

    let msg = '';
    if (err.name === 'NotAllowedError') {
      msg = '❌ การยืนยันตัวตนถูกยกเลิก หรือหมดเวลา กรุณาลองใหม่อีกครั้ง';
    } else if (err.name === 'SecurityError') {
      msg = '❌ ต้องการ HTTPS — กรุณา Deploy บน https:// หรือใช้ localhost';
    } else {
      msg = `❌ การยืนยันตัวตนล้มเหลว: ${err.message || err.name}`;
    }

    showStatus('login-status', msg, 'error');
    showToast(msg, 'error', 5000);
  } finally {
    setButtonLoading('login-submit-btn', 'login-btn-text', false);
    $('login-btn-text').textContent = 'เข้าสู่ระบบด้วยไบโอเมตริก';
    hideLoading();
  }
}

/* ── Populate dashboard ── */
function displayDashboard(user) {
  $('dash-username').textContent  = user.username;
  $('dash-email').textContent     = user.email || '-';
  $('dash-firstname').textContent = user.firstName;
  $('dash-lastname').textContent  = user.lastName;
  $('dash-phone').textContent     = user.phone;

  // Avatar letter(s)
  const initials = (user.firstName[0] || '') + (user.lastName[0] || '');
  $('dash-avatar').textContent = initials.toUpperCase();

  // Auth time
  const now = new Date();
  $('dash-time').textContent = now.toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

/* ── Logout ── */
function handleLogout() {
  showPage('page-home');
  showToast('👋 ออกจากระบบเรียบร้อยแล้ว', 'info', 2500);
}

/* ════════════════════════════════════════════════════════════
   INIT — Set up home page on load
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure home page is shown
  const homePage = $('page-home');
  if (homePage) {
    homePage.style.display = 'flex';
    homePage.classList.add('active');
  }

  // Realtime input validation feedback
  const fieldMap = {
    'reg-username': 'err-username',
    'reg-email': 'err-email',
    'reg-firstname': 'err-firstname',
    'reg-lastname': 'err-lastname',
    'reg-phone': 'err-phone',
    'login-username': 'err-login-username',
  };
  Object.entries(fieldMap).forEach(([fieldId, errId]) => {
    const el = $(fieldId);
    if (el) {
      el.addEventListener('input', () => {
        clearError(errId, fieldId);
        hideStatus(fieldId.startsWith('reg') ? 'reg-status' : 'login-status');
      });
    }
  });

  // Check WebAuthn availability on load
  if (!window.PublicKeyCredential) {
    showToast('⚠️ เบราว์เซอร์นี้อาจไม่รองรับ FIDO2/WebAuthn', 'warning', 6000);
  }
});
