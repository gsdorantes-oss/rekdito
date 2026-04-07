import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus } from '../types/database';
import { formatCurrency, generateWhatsAppLink } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Filter, MessageCircle, Eye, MapPin, Phone, Clock, ChevronRight, TrendingUp, Edit3, Trash2, Plus, X, ShoppingBag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { ChevronDown } from 'lucide-react';

export default function AdminOrders() {
  const { profile, isAdmin, isManager } = useAuth();
  const { selectedStore, stores, setSelectedStore } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Activos');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editDeliveryFee, setEditDeliveryFee] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'Pendiente' | 'Pagado'>('Pendiente');

  useEffect(() => {
    fetchOrders();
    
    // Real-time subscription
    const subscription = supabase
      .channel('orders_changes')
      .on('postgres_changes' as any, { event: '*', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.store_id, selectedStore?.id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const effectiveStoreId = isAdmin ? selectedStore?.id : profile?.store_id;
      
      // Calculate 7 days ago for weekly cleanup
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Intentamos la consulta completa con joins
      let query = supabase
        .from('orders')
        .select('*, profiles!user_id(full_name), stores(name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (effectiveStoreId) {
        query = query.eq('store_id', effectiveStoreId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error en consulta completa:', error);
        // Fallback: Si falla el join, traemos solo los pedidos básicos pero mantenemos el filtro de seguridad
        let fallbackQuery = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (profile?.store_id) {
          fallbackQuery = fallbackQuery.eq('store_id', profile.store_id);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        setOrders(fallbackData || []);
      } else {
        setOrders(data || []);
      }
    } catch (error: any) {
      console.error('Error crítico cargando pedidos:', error);
      toast.error('Error al cargar pedidos: ' + (error.message || 'Error de conexión'));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      
      if (error) throw error;
      toast.success(`Estado actualizado a ${status}`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleWhatsApp = async (order: Order) => {
    const { data: items, error } = await supabase
      .from('order_items')
      .select('*, products(*)')
      .eq('order_id', order.id);
    
    if (error) {
      toast.error('Error al cargar items para WhatsApp');
      return;
    }

    const waItems = items.map(i => ({
      product: i.products,
      quantity: i.quantity
    }));
    const waLink = generateWhatsAppLink(order.id, order.phone_contact, order.total, waItems, order.delivery_address, order.status, order.delivery_fee, order.notes);
    window.open(waLink, '_blank');
  };

  const openEditModal = async (order: Order) => {
    setEditingOrder(order);
    setEditDeliveryFee(order.delivery_fee || 0);
    setEditNotes(order.notes || '');
    setEditPaymentStatus(order.payment_status || 'Pendiente');
    setEditLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('order_id', order.id);
      if (error) throw error;
      setEditItems(data || []);
    } catch (error: any) {
      toast.error('Error al cargar items');
    } finally {
      setEditLoading(false);
    }
  };

  const performSave = async (sendWhatsApp: boolean) => {
    if (!editingOrder) return;
    setEditLoading(true);
    try {
      // 1. Update items
      for (const item of editItems) {
        const { error } = await supabase
          .from('order_items')
          .update({ 
            quantity: item.quantity,
            subtotal: item.quantity * item.unit_price
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // 2. Calculate new total
      const itemsTotal = editItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
      const newTotal = itemsTotal + editDeliveryFee;

      // 3. Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          total: newTotal,
          delivery_fee: editDeliveryFee,
          notes: editNotes,
          payment_status: editPaymentStatus
        })
        .eq('id', editingOrder.id);
      
      if (orderError) throw orderError;

      toast.success('Pedido actualizado con éxito');
      
      // If we want to send WhatsApp immediately
      if (sendWhatsApp) {
        const waItems = editItems.map(i => ({
          product: i.products,
          quantity: i.quantity
        }));
        const waLink = generateWhatsAppLink(editingOrder.id, editingOrder.phone_contact, newTotal, waItems, editingOrder.delivery_address, editingOrder.status, editDeliveryFee, editNotes);
        window.open(waLink, '_blank');
      }

      setEditingOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const saveOrderEdits = () => performSave(false);
  const saveAndSendWhatsApp = () => performSave(true);

  const openInMap = (order: Order) => {
    if (order.delivery_lat && order.delivery_lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lng}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`;
      window.open(url, '_blank');
    }
  };

  const filteredOrders = orders.filter(o => {
    const fullName = o.profiles?.full_name || '';
    const orderId = o.id || '';
    const matchesSearch = fullName.toLowerCase().includes(search.toLowerCase()) || 
                         orderId.toLowerCase().includes(search.toLowerCase());
    
    // Status Filter Logic
    let matchesStatus = false;
    if (statusFilter === 'Todos') {
      matchesStatus = true;
    } else if (statusFilter === 'Activos') {
      // Hide Delivered and Canceled
      if (o.status === 'Entregado' || o.status === 'Cancelado') return false;
      
      // Special rule: Pending orders only from today or yesterday
      if (o.status === 'Pendiente') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        if (new Date(o.created_at) < yesterday) return false;
      }
      
      matchesStatus = true;
    } else {
      matchesStatus = o.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    'Pendiente': 'bg-amber-100 text-amber-700',
    'Preparando': 'bg-blue-100 text-blue-700',
    'En camino': 'bg-indigo-100 text-indigo-700',
    'Entregado': 'bg-emerald-100 text-emerald-700',
    'Cancelado': 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Gestión de Pedidos</h1>
          {isAdmin && (
            <div className="relative group/store mt-2">
              <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                <MapPin size={14} className="text-primary" />
                {selectedStore?.name || 'Todas las Tiendas'}
                <ChevronDown size={14} />
              </button>
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover/store:opacity-100 group-hover/store:visible transition-all z-50">
                <button 
                  onClick={() => setSelectedStore(null)}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  Todas las Tiendas (Global)
                </button>
                {stores.map(store => (
                  <button 
                    key={store.id}
                    onClick={() => setSelectedStore(store)}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                      selectedStore?.id === store.id ? 'bg-primary/5 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                    }`}
                  >
                    {store.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Link 
            to="/admin/finances"
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <TrendingUp size={18} className="text-emerald-600" />
            Finanzas
          </Link>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['Activos', 'Todos', 'Pendiente', 'Preparando', 'En camino', 'Entregado', 'Cancelado'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === status 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por cliente o ID de pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
        />
      </div>

      <div className="grid gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white h-40 rounded-3xl animate-pulse border border-slate-100"></div>
          ))
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
              <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-slate-900">Pedido #{order.id.slice(0, 8)}</h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                      {order.delivery_type && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          order.delivery_type === 'delivery' ? 'bg-blue-50 text-blue-600' :
                          order.delivery_type === 'pickup' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {order.delivery_type === 'delivery' ? 'Domicilio' :
                           order.delivery_type === 'pickup' ? 'Retiro' : 'En Tienda'}
                        </span>
                      )}
                      {order.payment_status && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          order.payment_status === 'Pagado' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {order.payment_status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-bold">
                      {format(new Date(order.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <select 
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Preparando">Preparando</option>
                    <option value="En camino">En camino</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                  
                  {order.status !== 'Entregado' && (
                    <button 
                      onClick={() => updateStatus(order.id, 'Entregado')}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary transition-all shadow-lg shadow-slate-900/10"
                    >
                      Cerrar Pedido
                    </button>
                  )}

                  <button 
                    onClick={() => openEditModal(order)}
                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                    title="Editar Pedido"
                  >
                    <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={() => handleWhatsApp(order)}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                    title="Enviar Factura"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <Link 
                    to={`/orders/${order.id}`}
                    className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                    title="Ver Detalles"
                  >
                    <Eye size={20} />
                  </Link>
                </div>
              </div>

              <div className="p-6 grid md:grid-cols-3 gap-6 bg-slate-50/30">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                      <Eye size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{order.profiles?.full_name || 'Cliente (Privado)'}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={10} />
                        {order.phone_contact || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrega / Tipo</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-medium text-slate-600 line-clamp-2">{order.delivery_address}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.delivery_zone && (
                        <p className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg w-fit">
                          {order.delivery_zone}
                        </p>
                      )}
                      {order.delivery_type && (
                        <p className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit uppercase">
                          {order.delivery_type}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => openInMap(order)}
                      className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <MapPin size={10} />
                      VER EN MAPA
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas / Comentarios</p>
                  <p className="text-xs text-slate-600 italic">
                    {order.notes || 'Sin comentarios adicionales.'}
                  </p>
                </div>

                <div className="space-y-2 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                  <p className="text-2xl font-black text-primary">{formatCurrency(order.total)}</p>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[10px] font-bold text-slate-400">Delivery: {order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : 'GRATIS'}</p>
                    <p className="text-[10px] font-bold text-slate-400">{order.payment_method}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
            <p className="text-slate-500 font-bold">No se encontraron pedidos.</p>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Editar Pedido #{editingOrder.id.slice(0, 8)}</h2>
                <p className="text-slate-500 text-sm font-medium">Modifica los detalles del pedido del cliente</p>
              </div>
              <button 
                onClick={() => setEditingOrder(null)}
                className="p-3 hover:bg-white rounded-2xl transition-colors text-slate-400 hover:text-slate-900 shadow-sm"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Productos</h3>
                <div className="space-y-3">
                  {editItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 flex-shrink-0">
                        <ShoppingBag size={20} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.products?.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(item.unit_price)} / {item.products?.type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...editItems];
                            newItems[index].quantity = parseFloat(e.target.value) || 0;
                            setEditItems(newItems);
                          }}
                          className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="w-24 text-right font-black text-primary">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Costo de Delivery</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      value={editDeliveryFee}
                      onChange={(e) => setEditDeliveryFee(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Estimado</label>
                  <div className="w-full px-4 py-3 bg-primary/5 border border-primary/10 rounded-xl font-black text-primary text-xl">
                    {formatCurrency(
                      editItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) + editDeliveryFee
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Estado de Pago</label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary appearance-none mb-4"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Notas del Administrador / Comentarios</label>
                <textarea 
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  placeholder="Añade notas sobre cambios o especificaciones..."
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setEditingOrder(null)}
                className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <div className="flex-1 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={saveOrderEdits}
                  disabled={editLoading}
                  className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Guardando...' : 'Solo Guardar'}
                </button>
                <button 
                  onClick={saveAndSendWhatsApp}
                  disabled={editLoading}
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  {editLoading ? 'Guardando...' : 'Guardar y Enviar WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
