import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { startOfWeek, endOfWeek, subWeeks, format, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

export default function AdminFinances() {
  const { profile, isAdmin } = useAuth();
  const { selectedStore, stores, setSelectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, 1 = last week, etc.
  const [data, setData] = useState({
    revenue: 0,
    investment: 0,
    profit: 0,
    loss: 0, // Potential loss from unsold stock or expired items (if we had that data)
    ordersCount: 0,
    dailyStats: [] as any[],
    categoryStats: [] as any[],
    deliveryTypeStats: [] as any[],
    rawOrders: [] as any[]
  });

  useEffect(() => {
    fetchFinancialData();
  }, [selectedWeek, profile?.store_id, selectedStore?.id]);

  const fetchFinancialData = async () => {
    if (!profile?.store_id && !isAdmin) return;
    setLoading(true);
    try {
      const effectiveStoreId = isAdmin ? selectedStore?.id : profile?.store_id;
      const now = new Date();
      const weekStart = startOfWeek(subWeeks(now, selectedWeek), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, selectedWeek), { weekStartsOn: 1 });

      // Fetch all orders with items and products
      let query = supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (effectiveStoreId) {
        query = query.eq('store_id', effectiveStoreId);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      const deliveredOrders = orders?.filter(o => o.status === 'Entregado') || [];
      
      let revenue = 0;
      let investment = 0;
      let profit = 0;
      const categoryMap: Record<string, { revenue: number, profit: number }> = {};
      const deliveryTypeMap: Record<string, { revenue: number, count: number }> = {
        'delivery': { revenue: 0, count: 0 },
        'pickup': { revenue: 0, count: 0 },
        'in_store': { revenue: 0, count: 0 }
      };

      deliveredOrders.forEach(order => {
        revenue += Number(order.total);
        
        const type = order.delivery_type || 'delivery';
        if (deliveryTypeMap[type]) {
          deliveryTypeMap[type].revenue += Number(order.total);
          deliveryTypeMap[type].count += 1;
        }
        
        order.order_items?.forEach((item: any) => {
          const cost = item.products?.cost_price || 0;
          const price = item.unit_price || 0;
          const qty = item.quantity || 0;
          const category = item.products?.category || 'Otros';

          investment += cost * qty;
          profit += (price - cost) * qty;

          if (!categoryMap[category]) {
            categoryMap[category] = { revenue: 0, profit: 0 };
          }
          categoryMap[category].revenue += price * qty;
          categoryMap[category].profit += (price - cost) * qty;
        });
      });

      // Daily stats for the selected week
      const dailyStats = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const dayStr = format(day, 'yyyy-MM-dd');
        
        const dayOrders = deliveredOrders.filter(o => o.created_at.startsWith(dayStr));
        const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total), 0);
        const dayProfit = dayOrders.reduce((orderSum, order) => {
          return orderSum + (order.order_items?.reduce((itemSum: number, item: any) => {
            return itemSum + ((item.unit_price - (item.products?.cost_price || 0)) * item.quantity);
          }, 0) || 0);
        }, 0);

        dailyStats.push({
          name: format(day, 'EEE', { locale: es }),
          revenue: dayRevenue,
          profit: dayProfit
        });
      }

      const categoryStats = Object.entries(categoryMap).map(([name, stats]) => ({
        name,
        value: stats.revenue,
        profit: stats.profit
      }));

      const deliveryTypeStats = Object.entries(deliveryTypeMap).map(([name, stats]) => ({
        name: name === 'delivery' ? 'Domicilio' : name === 'pickup' ? 'Retiro' : 'En Tienda',
        value: stats.revenue,
        count: stats.count
      }));

      setData({
        revenue,
        investment,
        profit,
        loss: 0, // We don't have a direct "loss" metric in the DB yet, but we could add it
        ordersCount: deliveredOrders.length,
        dailyStats,
        categoryStats,
        deliveryTypeStats,
        rawOrders: orders || []
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekRange = () => {
    const now = new Date();
    const start = startOfWeek(subWeeks(now, selectedWeek), { weekStartsOn: 1 });
    const end = endOfWeek(subWeeks(now, selectedWeek), { weekStartsOn: 1 });
    return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`;
  };

  const exportOrdersCSV = () => {
    if (data.rawOrders.length === 0) return;
    
    const headers = ['ID', 'Fecha', 'Cliente', 'Teléfono', 'Total', 'Estado', 'Método Pago', 'Tienda'];
    const rows = data.rawOrders.map(order => [
      order.id.slice(0, 8),
      format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
      order.user_id || 'Invitado',
      order.phone_contact,
      order.total,
      order.status,
      order.payment_method,
      order.store_id || 'Global'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_${weekRange().replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFinancesCSV = () => {
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Ingresos Brutos', data.revenue],
      ['Inversión (Costo)', data.investment],
      ['Ganancia Neta', data.profit],
      ['Cantidad de Pedidos', data.ordersCount],
      ['Rentabilidad %', data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(2) : 0]
    ];

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `finanzas_${weekRange().replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const COLORS = ['#84cc16', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Finanzas Semanales</h1>
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
          <p className="text-slate-500 font-medium">Análisis de ingresos y rentabilidad</p>
        </div>
        
        <div className="flex items-center bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
          <button 
            onClick={() => setSelectedWeek(prev => prev + 1)}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 flex items-center gap-2 min-w-[180px] justify-center">
            <Calendar size={16} className="text-primary" />
            <span className="text-sm font-black text-slate-700 uppercase tracking-wider">
              {selectedWeek === 0 ? 'Esta Semana' : weekRange()}
            </span>
          </div>
          <button 
            disabled={selectedWeek === 0}
            onClick={() => setSelectedWeek(prev => Math.max(0, prev - 1))}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors disabled:opacity-20"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={exportFinancesCSV}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <FileText size={20} className="text-primary" />
            Exportar Caja
          </button>
          <button 
            onClick={exportOrdersCSV}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Download size={20} />
            Exportar Pedidos
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Ingresos Brutos</p>
          <h3 className="text-4xl font-black text-slate-900 mb-4">{formatCurrency(data.revenue)}</h3>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center">
              <ArrowUpRight size={14} />
            </div>
            <span>Ventas realizadas</span>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group text-white">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign size={80} />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Inversión (Costo)</p>
          <h3 className="text-4xl font-black mb-4">{formatCurrency(data.investment)}</h3>
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
            <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
              <BarChartIcon size={14} />
            </div>
            <span>Costo de mercancía</span>
          </div>
        </div>

        <div className="bg-primary p-8 rounded-[2.5rem] shadow-2xl shadow-primary/20 relative overflow-hidden group text-white">
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} />
          </div>
          <p className="text-sm font-black text-white/60 uppercase tracking-widest mb-2">Ganancia Neta</p>
          <h3 className="text-4xl font-black mb-4">{formatCurrency(data.profit)}</h3>
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
            <span>Rentabilidad: {data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0}%</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Weekly Performance */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900">Rendimiento Diario</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                <span className="text-xs font-bold text-slate-500">Ventas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-xs font-bold text-slate-500">Ganancia</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" name="Ventas" radius={[4, 4, 0, 0]} fill="#f1f5f9" />
                <Bar dataKey="profit" name="Ganancia" radius={[4, 4, 0, 0]} fill="#84cc16" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-8">Ventas por Categoría</h2>
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {data.categoryStats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-sm font-bold text-slate-700">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(stat.value)}</p>
                    <p className="text-[10px] font-bold text-emerald-600">+{formatCurrency(stat.profit)} util.</p>
                  </div>
                </div>
              ))}
              {data.categoryStats.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-10">No hay datos esta semana</p>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Type Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-8">Canales de Venta</h2>
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.deliveryTypeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.deliveryTypeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#f59e0b', '#10b981'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {data.deliveryTypeStats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'][i % 3] }}></div>
                    <span className="text-sm font-bold text-slate-700">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(stat.value)}</p>
                    <p className="text-[10px] font-bold text-slate-400">{stat.count} pedidos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h2 className="text-xl font-black text-slate-900">Resumen de Rentabilidad</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Métrica</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Porcentaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <TrendingUp size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Ingresos Totales</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-right font-black text-slate-900">{formatCurrency(data.revenue)}</td>
                <td className="px-8 py-4 text-right text-sm font-bold text-slate-400">100%</td>
              </tr>
              <tr>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                      <TrendingDown size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Inversión en Productos</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-right font-black text-slate-900">{formatCurrency(data.investment)}</td>
                <td className="px-8 py-4 text-right text-sm font-bold text-amber-600">
                  {data.revenue > 0 ? ((data.investment / data.revenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      <TrendingUp size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Utilidad Neta</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-right font-black text-primary">{formatCurrency(data.profit)}</td>
                <td className="px-8 py-4 text-right text-sm font-bold text-primary">
                  {data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
