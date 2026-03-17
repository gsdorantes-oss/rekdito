export type ProductType = 'unidad' | 'libra' | 'paquete';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  type: ProductType;
  price: number;
  cost_price: number;
  image_url: string;
  stock: number;
  is_active: boolean;
  store_id?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  role: 'admin' | 'client';
  store_id?: string;
  created_at: string;
}

export type OrderStatus = 'Pendiente' | 'Preparando' | 'En camino' | 'Entregado' | 'Cancelado';

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  delivery_fee: number;
  delivery_zone?: string;
  store_id?: string;
  notes?: string;
  payment_method: 'Efectivo' | 'Transferencia' | 'Yappy';
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  phone_contact: string;
  created_at: string;
  profiles?: Profile;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products?: Product;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  is_active: boolean;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  neighborhoods: string;
  is_active: boolean;
  store_id?: string;
  created_at: string;
}
