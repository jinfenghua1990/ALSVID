INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('logistics_manager', 'inventory.read'),
  ('logistics_manager', 'inventory.move'),
  ('logistics_manager', 'inventory.reserve'),
  ('logistics_manager', 'partner.read'),
  ('logistics_operator', 'inventory.read'),
  ('logistics_operator', 'inventory.move'),
  ('logistics_operator', 'inventory.reserve'),
  ('logistics_operator', 'partner.read'),
  ('customs_specialist', 'partner.read'),
  ('logistics_viewer', 'partner.read')
ON CONFLICT DO NOTHING;
