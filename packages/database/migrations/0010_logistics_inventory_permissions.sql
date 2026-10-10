INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('logistics_manager', 'inventory.read'),
  ('logistics_manager', 'inventory.move'),
  ('logistics_manager', 'inventory.reserve'),
  ('logistics_operator', 'inventory.read'),
  ('logistics_operator', 'inventory.move'),
  ('logistics_operator', 'inventory.reserve')
ON CONFLICT DO NOTHING;
