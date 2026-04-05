/*
  RECADITO - Supabase Schema
  Run this SQL in your Supabase SQL Editor to set up the database.
  
  TIP: To promote a user to admin, run:
  UPDATE profiles SET role = 'admin' WHERE phone = 'YOUR_PHONE_NUMBER';
  OR
  UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID';
*/

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1.5 Create Stores table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('unidad', 'libra', 'paquete')),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE, -- Optional if using product_store
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5 Create Product-Store Junction table (for multi-store products)
CREATE TABLE product_store (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (product_id, store_id)
);

-- 3. Create Profiles (Extended User Data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  address TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'manager', 'client')),
  store_id UUID REFERENCES stores(id), -- For admins/managers, which store they manage
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Preparando', 'En camino', 'Entregado', 'Cancelado')),
  total DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_zone TEXT,
  notes TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Efectivo', 'Transferencia', 'Yappy')),
  delivery_address TEXT NOT NULL,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  phone_contact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Order Items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- 6. Create Delivery Zones table
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  neighborhoods TEXT NOT NULL, -- Comma separated list of neighborhoods
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  radius_km DECIMAL(10, 2),
  coordinates JSONB, -- Array of [lat, lng] for polygons
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Triggers for Stock Management
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- Prevent negative stock if needed (optional, prompt says "evitar stock negativo")
  IF (SELECT stock FROM products WHERE id = NEW.product_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_order();

-- 8. Row Level Security (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_store ENABLE ROW LEVEL SECURITY;

-- Stores: Everyone can read active stores, staff can manage their own
CREATE POLICY "Public read active stores" ON stores FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Staff manage own store" ON stores FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager') 
    AND (store_id IS NULL OR store_id = stores.id)
  )
);

-- Product Store: Everyone can read active store-product mappings
CREATE POLICY "Public read active product_store" ON product_store FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Staff manage product_store" ON product_store FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager') 
    AND (store_id IS NULL OR store_id = product_store.store_id)
  )
);

-- Products: Everyone can read active products, only staff can manage their store's products
CREATE POLICY "Public read active products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Staff manage products" ON products FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager') 
    AND (store_id IS NULL OR store_id = products.store_id)
  )
);

-- Profiles: Users can read their own profile, staff can read all in their store
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Staff view store profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles AS p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'manager') 
    AND (p.store_id IS NULL OR p.store_id = profiles.store_id)
  )
);

-- Orders: Users view own orders, staff view all in their store
CREATE POLICY "Users view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff manage store orders" ON orders FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager') 
    AND (store_id IS NULL OR store_id = orders.store_id)
  )
);

-- Order Items: Users view own order items, staff view all in their store
CREATE POLICY "Users view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND user_id = auth.uid())
);
CREATE POLICY "Users create order items" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND user_id = auth.uid())
);
CREATE POLICY "Staff manage store order items" ON order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM orders 
    JOIN profiles ON (profiles.store_id IS NULL OR profiles.store_id = orders.store_id)
    WHERE orders.id = order_items.order_id 
    AND profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Delivery Zones: Everyone can read active zones, only staff can manage their store's zones
CREATE POLICY "Public read active zones" ON delivery_zones FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Staff manage store zones" ON delivery_zones FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager') 
    AND (store_id IS NULL OR store_id = delivery_zones.store_id)
  )
);

-- 9. Automatic Store Assignment Logic
CREATE OR REPLACE FUNCTION get_email_by_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
    email_output TEXT;
BEGIN
    SELECT email INTO email_output FROM profiles WHERE phone = phone_input;
    RETURN email_output;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION find_nearest_store(user_lat DECIMAL, user_lng DECIMAL)
RETURNS UUID AS $$
DECLARE
    nearest_store_id UUID;
BEGIN
    SELECT id INTO nearest_store_id
    FROM stores
    WHERE is_active = TRUE
    ORDER BY (
        (lat - user_lat)^2 + (lng - user_lng)^2
    ) ASC
    LIMIT 1;
    
    RETURN nearest_store_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_assign_nearest_store()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL AND NEW.role = 'client' THEN
        NEW.store_id := find_nearest_store(NEW.lat, NEW.lng);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_store_on_location_change
BEFORE INSERT OR UPDATE OF lat, lng ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_assign_nearest_store();
