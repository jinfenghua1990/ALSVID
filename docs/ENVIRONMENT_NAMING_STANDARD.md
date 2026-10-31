# ALSVID Environment Naming Standard

## Current environment model

Owner decision 2026-10-31: all actual deployments and business sessions on any authorized computer use the same Production identity, business data and R2. There is no separate test business environment. Local and GitHub development are both allowed. Verify actual service bindings; a local snapshot, mock database or environment label is not proof of Production connectivity.

CI uses temporary synthetic fixtures without Production data or secrets for automated checks; it is not a business environment. Do not recreate the retired shared Development/Test runtime. Keep Production credentials in authorized secret storage and out of Git and logs.

Historical documents may use the former Development/Test naming. Treat them as dated records, not current deployment instructions.
