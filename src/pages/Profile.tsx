import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Order } from '../types/database';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, ChevronRight, User, Phone, MapPin, LogOut, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const sortedData = (data || []).sort((a, b) => {
        // Prioritize by status first, then by date
        const statusPriority: Record<string, number> = {
          'Pendiente': 0,
          'Preparando': 1,
          'En camino': 2,
          'Entregado': 3,
          'Cancelado': 4
        };
        
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setOrders(sortedData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    'Pendiente': 'bg-amber-100 text-amber-700',
    'Preparando': 'bg-blue-100 text-blue-700',
    'En camino': 'bg-indigo-100 text-indigo-700',
    'Entregado': 'bg-emerald-100 text-emerald-700',
    'Cancelado': 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* User Info Sidebar */}
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <User size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-900">{profile?.full_name}</h2>
            <p className="text-sm text-slate-500 mb-2">{user?.email}</p>
            <div className="mb-6">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${profile?.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                Rol: {profile?.role || 'Cargando...'}
              </span>
            </div>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400" />
                {profile?.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin size={16} className="text-slate-400" />
                <span className="truncate">{profile?.address || 'Sin dirección registrada'}</span>
              </div>
            </div>

            {profile?.role === 'admin' && (
              <Link 
                to="/admin"
                className="w-full mt-6 flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-sm hover:bg-primary py-3 rounded-xl transition-all shadow-lg shadow-slate-900/10"
              >
                <LayoutDashboard size={18} />
                Panel de Administración
              </Link>
            )}

            <button 
              onClick={() => signOut()}
              className="w-full mt-8 flex items-center justify-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 py-2 rounded-xl transition-colors"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="md:w-2/3 space-y-6">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-primary" />
            Mis Pedidos
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white h-24 rounded-2xl animate-pulse border border-slate-100"></div>
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link 
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Package size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(order.created_at), "d 'de' MMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-black text-slate-900">{formatCurrency(order.total)}</p>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg shadow-sm ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
              <p className="text-slate-500 font-medium">Aún no has realizado ningún pedido.</p>
              <Link to="/" className="text-primary font-bold mt-2 inline-block hover:underline">
                ¡Empieza a comprar ahora!
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
