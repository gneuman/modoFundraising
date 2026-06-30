const { SignJWT } = require('jose');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim().replace(/^"|"$/g, '');
const secret = new TextEncoder().encode(get('JWT_SECRET'));
const admins = get('ADMIN_EMAILS') || '';
const adminEmail = admins.split(',').map(s => s.trim()).filter(s => s && !s.startsWith('*'))[0] || 'neumang@gmail.com';
(async () => {
  const adminTok = await new SignJWT({ email: adminEmail, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(secret);
  const founderTok = await new SignJWT({ email: 'test-founder@example.com', role: 'founder' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(secret);
  console.log('ADMIN_EMAIL=' + adminEmail);
  console.log('ADMIN_TOKEN=' + adminTok);
  console.log('FOUNDER_TOKEN=' + founderTok);
})();
