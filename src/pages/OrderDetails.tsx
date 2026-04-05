import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Order, OrderItem } from '../types/database';
import { formatCurrency, generateWhatsAppLink } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, MapPin, Phone, CreditCard, Clock, ChevronLeft, MessageCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { toast } from 'react-hot-toast';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (orderError) {
        // If profile fetch fails but order exists, try fetching order alone
        const { data: simpleOrder, error: simpleError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();
        
        if (simpleError) {
          console.error('Order fetch error:', simpleError);
          throw simpleError;
        }
        setOrder(simpleOrder);
      } else {
        setOrder(orderData);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!order) return;
    const waItems = items.map(i => ({
      product: i.products,
      quantity: i.quantity
    }));
    const waLink = generateWhatsAppLink(order.id, order.phone_contact, order.total, waItems, order.delivery_address, order.status);
    window.open(waLink, '_blank');
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!order) return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold">Pedido no encontrado</h1>
      <Link to="/" className="text-primary font-bold mt-4 inline-block">Volver a la tienda</Link>
    </div>
  );

  const statusColors = {
    'Pendiente': 'bg-amber-100 text-amber-700',
    'Preparando': 'bg-blue-100 text-blue-700',
    'En camino': 'bg-indigo-100 text-indigo-700',
    'Entregado': 'bg-emerald-100 text-emerald-700',
    'Cancelado': 'bg-red-100 text-red-700',
  };

  const cancelOrder = async () => {
    if (!order) return;
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Cancelado' })
        .eq('id', order.id);

      if (error) throw error;
      toast.success('Pedido cancelado con éxito');
      fetchOrder();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/profile" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold">
          <ChevronLeft size={20} />
          Mis Pedidos
        </Link>
        <button 
          onClick={handleWhatsApp}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
        >
          <MessageCircle size={18} />
          WhatsApp
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-slate-900">Pedido #{order.id.slice(0, 8)}</h1>
              <span className={`px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-wider shadow-sm ${statusColors[order.status]}`}>
                {order.status}
              </span>
            </div>
            <p className="text-slate-500 flex items-center gap-2 text-sm font-medium">
              <Clock size={16} />
              {format(new Date(order.created_at), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <p className="text-sm text-slate-500 font-bold mb-1">Total Pagado</p>
            <p className="text-3xl font-black text-primary">{formatCurrency(order.total)}</p>
            {order.status === 'Pendiente' && (
              <button 
                onClick={cancelOrder}
                className="text-xs font-black text-red-500 hover:text-red-600 uppercase tracking-wider mt-2"
              >
                Cancelar Pedido
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2">
          <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 space-y-6">
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package size={16} />
                Productos
              </h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{item.products?.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} {item.products?.type === 'libra' ? 'lb' : ''} x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="pt-6 border-t border-slate-50">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CreditCard size={16} />
                Cliente y Pago
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{order.profiles?.full_name || 'Cliente (Perfil restringido)'}</p>
                    <p className="text-xs text-slate-500">{order.profiles?.full_name ? 'Nombre del cliente' : 'ID Usuario: ' + order.user_id.slice(0,8)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{order.payment_method}</p>
                    <p className="text-xs text-slate-500">Método seleccionado</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin size={16} />
                Entrega
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                    <MapPin size={16} />
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">{order.delivery_address}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                    <Phone size={16} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{order.phone_contact}</p>
                </div>
                
                {order.delivery_lat && order.delivery_lng && (
                  <div className="h-48 rounded-2xl overflow-hidden border border-slate-100 mt-4">
                    <MapContainer center={[order.delivery_lat, order.delivery_lng]} zoom={15} scrollWheelZoom={false} zoomControl={false} dragging={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[order.delivery_lat, order.delivery_lng]} />
                    </MapContainer>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
