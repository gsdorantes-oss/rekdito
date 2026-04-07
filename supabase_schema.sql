-- Script de creación de tablas para Supabase (Recadito)

-- 1. Tabla de Tiendas (Stores)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Perfiles (Profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'manager', 'client')),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Productos (Products)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('unidad', 'libra', 'paquete', 'kilo', 'mazo', 'caja')),
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL, -- NULL significa que el producto es global (todas las tiendas)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de Zonas de Entrega (Delivery Zones)
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  neighborhoods TEXT,
  is_active BOOLEAN DEFAULT true,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  coordinates JSONB, -- Para polígonos si es necesario
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Preparando', 'En camino', 'Entregado', 'Cancelado')),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery', 'pickup', 'in_store')),
  payment_status TEXT DEFAULT 'Pendiente' CHECK (payment_status IN ('Pendiente', 'Pagado')),
  total DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  delivery_zone TEXT,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('Efectivo', 'Transferencia', 'Yappy')),
  delivery_address TEXT,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  phone_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla de Items de Pedido (Order Items)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Lectura pública para productos y tiendas)
CREATE POLICY "Lectura pública de tiendas" ON stores FOR SELECT USING (true);
CREATE POLICY "Lectura pública de productos" ON products FOR SELECT USING (true);
CREATE POLICY "Lectura pública de zonas" ON delivery_zones FOR SELECT USING (true);

-- Políticas para perfiles (Solo el dueño puede leer/editar su perfil)
CREATE POLICY "Usuarios pueden ver su propio perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuarios pueden editar su propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para pedidos (Solo el dueño puede ver sus pedidos)
CREATE POLICY "Usuarios pueden ver sus propios pedidos" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden crear sus propios pedidos" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden ver sus propios items de pedido" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
