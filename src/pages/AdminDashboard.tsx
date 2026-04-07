import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { ShoppingBag, Users, TrendingUp, AlertCircle, Package, Clock, CheckCircle2, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { MapPin, ChevronDown } from 'lucide-react';

export default function AdminDashboard() {
  const { profile, isAdmin, isManager } = useAuth();
  const { selectedStore, stores, setSelectedStore } = useStore();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalCustomers: 0,
    lowStock: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Real-time subscription for dashboard
    const subscription = supabase
      .channel('dashboard_changes')
      .on('postgres_changes' as any, { event: '*', table: 'orders' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.store_id, selectedStore?.id]);

  const fetchStats = async () => {
    try {
      const effectiveStoreId = isAdmin ? selectedStore?.id : profile?.store_id;

      // Total Sales & Orders with items for profit calculation
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_items(*, products(*))');
      
      if (effectiveStoreId) {
        ordersQuery = ordersQuery.eq('store_id', effectiveStoreId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      
      if (ordersError) throw ordersError;

      // Customers (Filter by store if needed, though customers are usually global)
      const { count: customerCount, error: customerError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');
      
      if (customerError) throw customerError;

      // Low Stock
      let stockQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 10);
      
      if (effectiveStoreId) {
        stockQuery = stockQuery.eq('store_id', effectiveStoreId);
      }

      const { count: lowStockCount, error: stockError } = await stockQuery;
      
      if (stockError) throw stockError;

      const deliveredOrders = orders?.filter(o => o.status === 'Entregado') || [];
      const totalSales = deliveredOrders.reduce((sum, o) => sum + Number(o.total), 0);
      
      // Calculate profit: (unit_price - cost_price) * quantity
      const totalProfit = deliveredOrders.reduce((orderSum, order) => {
        const orderProfit = order.order_items?.reduce((itemSum: number, item: any) => {
          const cost = item.products?.cost_price || 0;
          const price = item.unit_price || 0;
          return itemSum + ((price - cost) * item.quantity);
        }, 0) || 0;
        return orderSum + orderProfit;
      }, 0);

      const pendingOrders = orders?.filter(o => o.status === 'Pendiente').length || 0;

      setStats({
        totalSales,
        totalProfit,
        totalOrders: orders?.length || 0,
        totalCustomers: customerCount || 0,
        lowStock: lowStockCount || 0,
        pendingOrders,
      });

      // Recent Orders (Prioritize Pending)
      let recentQuery = supabase
        .from('orders')
        .select('*, profiles(full_name)')
        .neq('status', 'Entregado')
        .neq('status', 'Cancelado')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10);

      if (effectiveStoreId) {
        recentQuery = recentQuery.eq('store_id', effectiveStoreId);
      }

      const { data: recent, error: recentError } = await recentQuery;
      
      if (recentError) throw recentError;
      
      const statusPriority: Record<string, number> = {
        'Pendiente': 0,
        'Preparando': 1,
        'En camino': 2,
        'Entregado': 3
      };

      const sortedRecent = (recent || []).sort((a, b) => {
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRecentOrders(sortedRecent.slice(0, 5));

      // Sales Data for Chart (last 7 days)
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(date => {
        const dayOrders = orders?.filter(o => o.created_at.startsWith(date) && o.status === 'Entregado') || [];
        const daySales = dayOrders.reduce((sum, o) => sum + Number(o.total), 0);
        const dayProfit = dayOrders.reduce((orderSum, order) => {
          const orderProfit = order.order_items?.reduce((itemSum: number, item: any) => {
            const cost = item.products?.cost_price || 0;
            const price = item.unit_price || 0;
            return itemSum + ((price - cost) * item.quantity);
          }, 0) || 0;
          return orderSum + orderProfit;
        }, 0);

        return {
          name: date.split('-').slice(1).join('/'),
          sales: daySales,
          profit: dayProfit
        };
      });
      setSalesData(chartData);

    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Ventas Totales', value: formatCurrency(stats.totalSales), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Utilidad Estimada', value: formatCurrency(stats.totalProfit), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Pedidos Totales', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Stock Bajo', value: stats.lowStock, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const testNotification = () => {
    toast.success('¡Prueba de notificación!', {
      duration: 4000,
      icon: '🔔',
      style: {
        background: '#0f172a',
        color: '#fff',
        fontWeight: 'bold',
      },
    });
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.warn('Audio blocked:', e));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900">Panel de Control</h1>
            <button 
              onClick={testNotification}
              className="p-2 text-slate-400 hover:text-primary transition-colors"
              title="Probar Sonido de Notificación"
            >
              <Clock size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 font-medium">Bienvenido, {profile?.full_name?.split(' ')[0]}</p>
            {isAdmin && (
              <div className="relative group/store ml-4">
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
            {isManager && selectedStore && (
              <div className="flex items-center gap-2 ml-4 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
                <MapPin size={14} className="text-primary" />
                {selectedStore.name}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link 
            to="/admin/pos" 
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 group"
          >
            <TrendingUp size={24} className="group-hover:scale-110 transition-transform" />
            CAJA / POS
          </Link>
          <Link 
            to="/admin/orders" 
            className="flex-1 sm:flex-none bg-primary text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 group"
          >
            <ShoppingBag size={24} className="group-hover:scale-110 transition-transform" />
            PEDIDOS
          </Link>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/inventory" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
          <Package size={14} />
          Inventario
        </Link>
        <Link to="/admin/products" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
          <ShoppingBag size={14} />
          Productos
        </Link>
        <Link to="/admin/finances" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
          <TrendingUp size={14} />
          Finanzas
        </Link>
        <Link to="/admin/delivery-zones" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
          <Truck size={14} />
          Zonas
        </Link>
        {isAdmin && (
          <>
            <Link to="/admin/stores" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
              <ShoppingBag size={14} />
              Tiendas
            </Link>
            <Link to="/admin/users" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
              <Users size={14} />
              Usuarios
            </Link>
          </>
        )}
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6">Ventas (Últimos 7 días)</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sales" name="Ventas" radius={[6, 6, 0, 0]} fill="#e2e8f0" />
                <Bar dataKey="profit" name="Utilidad" radius={[6, 6, 0, 0]} fill="#84cc16" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900">Pedidos Recientes</h2>
            <Link to="/admin/orders" className="text-primary text-xs font-bold hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{order.profiles?.full_name || 'Cliente Desconocido'}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(order.total)} • {order.status}</p>
                </div>
                <Link to={`/orders/${order.id}`} className="p-2 text-slate-300 hover:text-primary transition-colors">
                  <Clock size={18} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
