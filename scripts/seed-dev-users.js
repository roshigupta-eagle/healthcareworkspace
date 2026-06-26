// Seed dev users by POSTing to the running Next dev server
// Usage: node scripts/seed-dev-users.js

const users = [
  { email: 'admin@example.com', password: 'password123', name: 'Admin User', role: 'ADMIN' },
  { email: 'doctor@example.com', password: 'password123', name: 'Doctor User', role: 'DOCTOR' },
  { email: 'patient@example.com', password: 'password123', name: 'Patient User', role: 'PATIENT' },
];

const base = 'http://localhost:3000';

(async () => {
  for (const u of users) {
    try {
      console.log('Registering', u.email);
      const res = await fetch(`${base}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u),
      });

      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { parsed = text; }
      console.log('=>', res.status, parsed);
    } catch (err) {
      console.error('Request failed for', u.email, err?.message || err);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
})();
