INSERT INTO identity.roles(id, name, description) VALUES
  ('customer_user', 'Customer user', 'Verified customer account for the My ALSVID portal'),
  ('dealer_user', 'Dealer user', 'Invited dealer account for the Dealer portal'),
  ('supplier_user', 'Supplier user', 'Invited supplier account for the Supplier portal')
ON CONFLICT (id) DO NOTHING;
