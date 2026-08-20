-- ══════════════════════════════════════════════════════════════════
-- Migration: PH Holidays 2026 seed
-- Frontend Phase F7 (ADMIN_DASHBOARD_AUDIT.md / FRONTEND_IMPLEMENTATION.md)
--
-- The `holidays` table (20250501000007_attendance.sql) was only ever seeded
-- with 2025 dates. This adds 2026, nationwide (organization_id NULL, per the
-- existing pattern already used for the 2025 seed).
--
-- Deliberately EXCLUDES Eid al-Fitr and Eid al-Adha: both are moon-sighting
-- dependent and the Philippine government's actual observed date can differ
-- from astronomical prediction by a day, confirmed only via a specific
-- Presidential Proclamation closer to the date. Add those two rows once
-- officially confirmed rather than guessing — see FRONTEND_IMPLEMENTATION.md
-- Phase F7's scope note. Every other date below is either fixed by law
-- (RA 9492 and related proclamations) or astronomically computable
-- (Holy Week dates, from Easter Sunday falling on April 5, 2026).
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.holidays (name, date, type, is_nationwide) VALUES
  ('New Year''s Day',                          '2026-01-01', 'regular_holiday',      true),
  ('EDSA People Power Anniversary',             '2026-02-25', 'special_non_working',  true),
  ('Chinese New Year',                          '2026-02-17', 'special_non_working',  true),
  ('Araw ng Kagitingan (Day of Valor)',         '2026-04-09', 'regular_holiday',      true),
  ('Maundy Thursday',                           '2026-04-02', 'regular_holiday',      true),
  ('Good Friday',                               '2026-04-03', 'regular_holiday',      true),
  ('Black Saturday',                            '2026-04-04', 'special_non_working',  true),
  ('Labor Day',                                 '2026-05-01', 'regular_holiday',      true),
  ('Independence Day',                          '2026-06-12', 'regular_holiday',      true),
  ('Ninoy Aquino Day',                          '2026-08-21', 'special_non_working',  true),
  ('National Heroes Day',                       '2026-08-31', 'regular_holiday',      true),
  ('All Saints'' Day',                          '2026-11-01', 'special_non_working',  true),
  ('All Souls'' Day',                           '2026-11-02', 'special_non_working',  true),
  ('Bonifacio Day',                             '2026-11-30', 'regular_holiday',      true),
  ('Feast of the Immaculate Conception',        '2026-12-08', 'special_non_working',  true),
  ('Christmas Eve',                             '2026-12-24', 'special_non_working',  true),
  ('Christmas Day',                             '2026-12-25', 'regular_holiday',      true),
  ('Rizal Day',                                 '2026-12-30', 'regular_holiday',      true),
  ('New Year''s Eve',                           '2026-12-31', 'special_non_working',  true)
ON CONFLICT (organization_id, date, type) DO NOTHING;
