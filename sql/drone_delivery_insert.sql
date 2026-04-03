-- ============================================================
--  DRONE DELIVERY SYSTEM — Sample Data  (FINAL FIXED)
--  Run AFTER schema. Order: customer→hub→drone→order→package
-- ============================================================


-- ============================================================
-- 1. CUSTOMER
-- ============================================================
INSERT INTO customer (customer_id, full_name, email, phone, address, city, date_of_birth, is_active) VALUES
(1,  'Aarav Sharma',  'aarav.sharma@gmail.com',  '+919876543210', '12 MG Road',         'Mumbai',    '1990-04-15', TRUE),
(2,  'Priya Mehta',   'priya.mehta@gmail.com',   '+919823456781', '45 Bandra West',     'Mumbai',    '1995-07-22', TRUE),
(3,  'Rohan Verma',   'rohan.verma@yahoo.com',   '+919812345672', '78 Koregaon Park',   'Pune',      '1988-11-03', TRUE),
(4,  'Sneha Patil',   'sneha.patil@outlook.com', '+919801234563', '23 FC Road',         'Pune',      '1993-02-28', TRUE),
(5,  'Vikram Singh',  'vikram.singh@gmail.com',  '+919798765434', '56 Connaught Place', 'Delhi',     '1985-09-10', TRUE),
(6,  'Ananya Iyer',   'ananya.iyer@gmail.com',   '+919787654325', '89 Anna Salai',      'Chennai',   '1997-06-18', TRUE),
(7,  'Karan Joshi',   'karan.joshi@hotmail.com', '+919776543216', '34 Jubilee Hills',   'Hyderabad', '1992-12-05', TRUE),
(8,  'Deepika Nair',  'deepika.nair@gmail.com',  '+919765432107', '67 Indiranagar',     'Bangalore', '1991-03-25', TRUE),
(9,  'Arjun Kapoor',  'arjun.kapoor@gmail.com',  '+919754320998', '11 Salt Lake',       'Kolkata',   '1987-08-14', FALSE),
(10, 'Meera Reddy',   'meera.reddy@gmail.com',   '+919743210989', '90 Banjara Hills',   'Hyderabad', '1999-01-30', TRUE);

SELECT setval('customer_customer_id_seq', 10);


-- ============================================================
-- 2. HUB
-- ============================================================
INSERT INTO hub (hub_id, hub_name, address, city, latitude, longitude, drone_capacity, contact_phone, is_active) VALUES
(1,  'Mumbai Central Hub',    '1 Drone Park, Andheri',   'Mumbai',    19.119660,  72.846010, 20, '+912211112222', TRUE),
(2,  'Pune North Hub',        '5 Tech Zone, Pimpri',     'Pune',      18.628990,  73.804840, 15, '+912033334444', TRUE),
(3,  'Delhi Hub Alpha',       '10 Aerocity Road',        'Delhi',     28.556160,  77.099830, 25, '+911155556666', TRUE),
(4,  'Chennai South Hub',     '22 IT Corridor, OMR',     'Chennai',   12.899840,  80.228430, 12, '+914477778888', TRUE),
(5,  'Hyderabad Hub Prime',   '8 HITEC City Lane',       'Hyderabad', 17.447830,  78.376430, 18, '+914099990000', TRUE),
(6,  'Bangalore Central Hub', '3 Whitefield Road',       'Bangalore', 12.969420,  77.749840, 22, '+918011112222', TRUE),
(7,  'Kolkata East Hub',      '14 Salt Lake Sector V',   'Kolkata',   22.577450,  88.431840, 10, '+913333334444', TRUE),
(8,  'Ahmedabad Hub',         '6 SG Highway Zone',       'Ahmedabad', 23.030360,  72.587540, 14, '+917955556666', TRUE),
(9,  'Jaipur Hub',            '9 Tonk Road Industrial',  'Jaipur',    26.848580,  75.802000,  8, '+914177778888', FALSE),
(10, 'Surat Logistics Hub',   '2 Textile Market Road',   'Surat',     21.170240,  72.831060, 16, '+912699990000', TRUE);

SELECT setval('hub_hub_id_seq', 10);


-- ============================================================
-- 3. DRONE
-- ============================================================
INSERT INTO drone (drone_id, hub_id, model, serial_number, max_payload_kg, battery_capacity_wh, max_range_km, current_battery_pct, status, last_service_at) VALUES
(1,  1, 'DJI Matrice 300', 'SN-MUM-001', 9.00,  400.00, 45.0, 95,  'available',   '2025-12-01 10:00:00+05:30'),
(2,  1, 'DJI Matrice 300', 'SN-MUM-002', 9.00,  400.00, 45.0, 80,  'in-flight',   '2025-12-05 09:00:00+05:30'),
(3,  2, 'Zipline P2',      'SN-PUN-001', 1.75,  250.00, 80.0, 100, 'available',   '2025-11-20 11:00:00+05:30'),
(4,  3, 'Zipline P2',      'SN-DEL-001', 1.75,  250.00, 80.0, 60,  'charging',    '2025-11-25 08:00:00+05:30'),
(5,  3, 'Skydio 2+',       'SN-DEL-002', 2.50,  300.00, 35.0, 45,  'maintenance', '2025-10-15 14:00:00+05:30'),
(6,  4, 'DJI FlyCart 30',  'SN-CHE-001', 30.00, 800.00, 28.0, 90,  'available',   '2026-01-10 10:00:00+05:30'),
(7,  5, 'DJI FlyCart 30',  'SN-HYD-001', 30.00, 800.00, 28.0, 75,  'available',   '2026-01-12 09:30:00+05:30'),
(8,  6, 'Skydio 2+',       'SN-BLR-001', 2.50,  300.00, 35.0, 88,  'available',   '2026-02-01 10:00:00+05:30'),
(9,  7, 'DJI Matrice 300', 'SN-KOL-001', 9.00,  400.00, 45.0, 20,  'charging',    '2025-09-30 16:00:00+05:30'),
(10, 8, 'Zipline P2',      'SN-AHM-001', 1.75,  250.00, 80.0, 55,  'retired',     '2025-06-01 12:00:00+05:30');

SELECT setval('drone_drone_id_seq', 10);


-- ============================================================
-- 4. ORDER  (assigned_drone_id included — NULL means unassigned)
-- ============================================================
INSERT INTO "order" (order_id, customer_id, hub_id, assigned_drone_id, placed_at, scheduled_delivery, status, total_weight_kg, total_price, delivery_fee, delivery_address, special_instructions) VALUES
(1,  1,  1, NULL, '2026-03-01 09:00:00+05:30', '2026-03-01 14:00:00+05:30', 'delivered',  1.200, 599.00,  49.00, '12 MG Road, Mumbai',          'Leave at door'),
(2,  2,  1, 2,    '2026-03-02 10:30:00+05:30', '2026-03-02 15:00:00+05:30', 'in-transit', 0.500, 299.00,  29.00, '45 Bandra West, Mumbai',      NULL),
(3,  3,  2, NULL, '2026-03-03 08:15:00+05:30', '2026-03-03 13:00:00+05:30', 'dispatched', 2.300, 899.00,  59.00, '78 Koregaon Park, Pune',      'Call before delivery'),
(4,  4,  2, NULL, '2026-03-04 11:00:00+05:30', '2026-03-04 16:00:00+05:30', 'confirmed',  0.800, 450.00,  39.00, '23 FC Road, Pune',            NULL),
(5,  5,  3, NULL, '2026-03-05 07:45:00+05:30', '2026-03-05 12:30:00+05:30', 'pending',    3.500, 1299.00, 79.00, '56 Connaught Place, Delhi',   'Fragile items inside'),
(6,  6,  4, NULL, '2026-03-06 09:30:00+05:30', '2026-03-06 14:30:00+05:30', 'delivered',  1.100, 749.00,  49.00, '89 Anna Salai, Chennai',      NULL),
(7,  7,  5, NULL, '2026-03-07 13:00:00+05:30', '2026-03-07 18:00:00+05:30', 'cancelled',  0.300, 199.00,  19.00, '34 Jubilee Hills, Hyderabad', 'Cancel if delayed'),
(8,  8,  6, NULL, '2026-03-08 10:00:00+05:30', '2026-03-08 15:00:00+05:30', 'confirmed',  4.200, 1599.00, 89.00, '67 Indiranagar, Bangalore',   NULL),
(9,  9,  7, NULL, '2026-03-09 08:00:00+05:30', '2026-03-09 13:00:00+05:30', 'failed',     1.600, 699.00,  49.00, '11 Salt Lake, Kolkata',       NULL),
(10, 10, 5, NULL, '2026-03-10 12:00:00+05:30', '2026-03-10 17:00:00+05:30', 'pending',    0.900, 399.00,  29.00, '90 Banjara Hills, Hyderabad', 'Deliver to reception');

SELECT setval('order_order_id_seq', 10);


-- ============================================================
-- 5. PACKAGE
-- ============================================================
INSERT INTO package (package_id, order_id, weight_kg, length_cm, width_cm, height_cm, is_fragile, description, category, declared_value, tracking_number) VALUES
(1,  1,  1.200, 30.0, 20.0, 10.0, FALSE, 'Wireless headphones',    'electronics', 2500.00, 'TRK-MUM-00001'),
(2,  2,  0.500, 15.0, 10.0,  5.0, FALSE, 'Vitamin supplements',    'medicine',     800.00, 'TRK-MUM-00002'),
(3,  3,  1.300, 25.0, 20.0, 15.0, TRUE,  'Glass photo frame',      'household',    600.00, 'TRK-PUN-00001'),
(4,  3,  1.000, 20.0, 15.0, 10.0, FALSE, 'Cotton kurta set',       'clothing',     950.00, 'TRK-PUN-00002'),
(5,  4,  0.800, 20.0, 15.0,  8.0, FALSE, 'Novel book set',         'documents',    450.00, 'TRK-PUN-00003'),
(6,  5,  3.500, 40.0, 30.0, 20.0, TRUE,  'Smart speaker',          'electronics', 4999.00, 'TRK-DEL-00001'),
(7,  6,  1.100, 22.0, 18.0, 12.0, FALSE, 'Herbal medicine kit',    'medicine',    1200.00, 'TRK-CHE-00001'),
(8,  8,  2.000, 35.0, 25.0, 15.0, TRUE,  'Laptop accessories set', 'electronics', 5500.00, 'TRK-BLR-00001'),
(9,  8,  2.200, 30.0, 20.0, 20.0, FALSE, 'Winter jacket',          'clothing',    2200.00, 'TRK-BLR-00002'),
(10, 10, 0.900, 18.0, 12.0,  8.0, FALSE, 'Organic food hamper',    'food',         750.00, 'TRK-HYD-00001');

SELECT setval('package_package_id_seq', 10);