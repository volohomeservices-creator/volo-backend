-- Migration 071: Add skill_tag to service_items and update find_nearby_eligible_workers with skill matching

-- 1. Add skill_tag column to service_items
ALTER TABLE service_items
ADD COLUMN IF NOT EXISTS skill_tag TEXT DEFAULT NULL;

-- 2. Populate skill_tag for default service items
UPDATE service_items
SET skill_tag = 'Switchboard & Sockets'
WHERE LOWER(name) LIKE '%switch%' OR LOWER(name) LIKE '%socket%';

UPDATE service_items
SET skill_tag = 'House Wiring'
WHERE LOWER(name) LIKE '%wiring%';

UPDATE service_items
SET skill_tag = 'Fan Repair & Fitting'
WHERE LOWER(name) LIKE '%fan%' OR LOWER(name) = 'electrics works';

UPDATE service_items
SET skill_tag = 'Bathroom Cleaning'
WHERE LOWER(name) LIKE '%bathroom%';

UPDATE service_items
SET skill_tag = 'Deep Cleaning'
WHERE LOWER(name) LIKE '%house cleaning%';

UPDATE service_items
SET skill_tag = 'AC Filter Service'
WHERE LOWER(name) LIKE '%ac%' OR LOWER(name) LIKE '%filter%';

-- 3. Update existing worker skills with realistic test subskills
UPDATE worker_profiles wp
SET skills = ARRAY['Electrician', 'Fan Repair & Fitting', 'Switchboard & Sockets']
FROM users u
WHERE u.id = wp.worker_id AND LOWER(u.full_name) LIKE '%praneeth%' AND NOT LOWER(u.full_name) LIKE '%sai%';

UPDATE worker_profiles wp
SET skills = ARRAY['Electrican', 'House Wiring', 'MCB & Fuse Box']
FROM users u
WHERE u.id = wp.worker_id AND LOWER(u.full_name) LIKE '%yash%';

UPDATE worker_profiles wp
SET skills = ARRAY['electrician', 'Inverter Setup']
FROM users u
WHERE u.id = wp.worker_id AND LOWER(u.full_name) LIKE '%joshna%';

UPDATE worker_profiles wp
SET skills = ARRAY['Electrician', 'Fan Repair & Fitting', 'House Wiring']
FROM users u
WHERE u.id = wp.worker_id AND LOWER(u.full_name) LIKE '%sai praneeth%';

UPDATE worker_profiles wp
SET skills = ARRAY['House cleaning', 'Bathroom Cleaning', 'Kitchen Cleaning']
FROM users u
WHERE u.id = wp.worker_id AND LOWER(u.full_name) LIKE '%vijay%';

-- 4. Drop the previous 6-parameter find_nearby_eligible_workers to avoid PostgREST overloading conflicts
DROP FUNCTION IF EXISTS public.find_nearby_eligible_workers(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  UUID,
  UUID,
  TEXT
);

-- 5. Recreate find_nearby_eligible_workers with p_skill_tag support
CREATE OR REPLACE FUNCTION public.find_nearby_eligible_workers(
  p_lat               DOUBLE PRECISION,
  p_lng               DOUBLE PRECISION,
  p_radius_km         DOUBLE PRECISION DEFAULT 10,
  p_service_category_id UUID DEFAULT NULL,
  p_booking_id        UUID DEFAULT NULL,
  p_payment_mode      TEXT DEFAULT 'ONLINE',
  p_skill_tag         TEXT DEFAULT NULL
)
RETURNS TABLE (
  worker_id   UUID,
  distance_km DOUBLE PRECISION
) LANGUAGE sql STABLE AS $$
  SELECT
    w.id AS worker_id,
    (
      6371 * acos(
        LEAST(1.0,
          cos(radians(p_lat)) * cos(radians(COALESCE(loc.latitude::double precision, w.current_lat)))
          * cos(radians(COALESCE(loc.longitude::double precision, w.current_lng)) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(COALESCE(loc.latitude::double precision, w.current_lat)))
        )
      )
    ) AS distance_km
  FROM workers w
  JOIN users u ON u.id = w.id
  LEFT JOIN worker_live_locations loc ON loc.worker_id = w.id
  LEFT JOIN worker_profiles wp ON wp.worker_id = w.id
  WHERE
    w.status = 'ONLINE'
    AND w.kyc_status = 'APPROVED'
    AND u.is_active = TRUE
    AND COALESCE(loc.latitude::double precision, w.current_lat) IS NOT NULL
    AND COALESCE(loc.longitude::double precision, w.current_lng) IS NOT NULL
    -- Service category matching (NULL = any category allowed)
    AND (
      p_service_category_id IS NULL
      OR w.service_category_ids @> ARRAY[p_service_category_id]
    )
    -- Skill matching: If p_skill_tag is specified, worker must have this skill in worker_profiles.skills
    AND (
      p_skill_tag IS NULL
      OR TRIM(p_skill_tag) = ''
      OR (
        wp.skills IS NOT NULL AND EXISTS (
          SELECT 1 FROM unnest(wp.skills) s
          WHERE LOWER(TRIM(s)) = LOWER(TRIM(p_skill_tag))
        )
      )
    )
    -- Exclude workers who already rejected this booking
    AND (
      p_booking_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM worker_job_rejections r
        WHERE r.booking_id = p_booking_id
        AND r.worker_id = w.id
      )
    )
    -- Distance limit
    AND (
      6371 * acos(
        LEAST(1.0,
          cos(radians(p_lat)) * cos(radians(COALESCE(loc.latitude::double precision, w.current_lat)))
          * cos(radians(COALESCE(loc.longitude::double precision, w.current_lng)) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(COALESCE(loc.latitude::double precision, w.current_lat)))
        )
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC;
$$;
