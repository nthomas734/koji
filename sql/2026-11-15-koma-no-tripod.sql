-- 2026-11-15: Japan 2027 planned with no tripod. Brace-on-something settings
-- for the five shots where a slow shutter helps (applied via Supabase MCP).
update koma_shots s set tech_md = v.t, updated_at = now()
from (values
 (80, 'No tripod: rest the camera on a mooring post or the promenade rail. 35mm at f/2, about 1/4s, ISO 1600, 2-second timer. Take three and keep the sharpest.'),
 (87, 'No tripod: brace on the harbour wall. 35mm at f/2, about 1/4s, ISO 800, 2-second timer, a few frames. On the 20-70 at f/4, push to ISO 3200 instead of a slower shutter.'),
 (91, 'No tripod: rest the camera on the bridge railing. 35mm at f/2, 1/4–1/2s, ISO 1600, 2-second timer. Wait for a gap in traffic; the bridge shakes when a bus crosses.'),
 (98, 'Railing shot: about 1/8s at f/2.8, ISO 1600, 2-second timer, five frames, keep the sharpest. Everything else here is handheld at 1/60s or faster.'),
 (104, 'No tripod: set the camera on the stone parapet of the bridge for the canal reflections. 35mm at f/2.8, about 1/4s, ISO 800, 2-second timer, three frames.')
) v(id, t) where s.id = v.id and s.trip_id = 16;
