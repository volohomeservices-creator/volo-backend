-- Seed default admin user credentials.
INSERT INTO users (id, firebase_uid, role, full_name, phone, email, is_active, password_hash)
VALUES (
  'ad8e7a68-b7eb-4b2a-8cfa-c529a65f9733',
  NULL,
  'admin',
  'Super Admin',
  '+910000000000',
  'admin@voloapp.in',
  true,
  '$2b$10$I/j0HgPQ4c31YhEasBHRYenPGC80J8bXs1tW/j0O0Jmjk4YHMDlhy' -- Bcrypt hash for: Admin@123#@
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    role = 'admin',
    is_active = true;
