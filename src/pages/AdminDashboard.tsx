import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { ShoppingBag, Users, TrendingUp, AlertCircle, Package, Clock, CheckCircle2, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { profile } = useAuth();
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
  }, [profile?.store_id]);

  const fetchStats = async () => {
    try {
      // Total Sales & Orders with items for profit calculation
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_items(*, products(*))');
      
      if (profile?.store_id) {
        ordersQuery = ordersQuery.eq('store_id', profile.store_id);
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
      const { count: lowStockCount, error: stockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 10);
      
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
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10);

      if (profile?.store_id) {
        recentQuery = recentQuery.eq('store_id', profile.store_id);
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900">Panel de Control</h1>
        <div className="flex gap-3">
          <Link to="/admin/stores" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
            <ShoppingBag size={16} className="text-purple-600" />
            Tiendas
          </Link>
          <Link to="/admin/delivery-zones" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
            <Truck size={16} className="text-blue-600" />
            Zonas
          </Link>
          <Link to="/admin/finances" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" />
            Finanzas
          </Link>
          <Link to="/admin/products" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
            Gestionar Productos
          </Link>
          <Link to="/admin/orders" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">
            Ver Pedidos
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
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
