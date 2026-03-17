import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Store } from '../types/database';
import { formatCurrency } from '../lib/utils';
import { Search, Save, RefreshCw, Filter, Package, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface ProductChange {
  price?: number;
  cost_price?: number;
  stock?: number;
  is_active?: boolean;
}

export default function AdminInventory() {
  const { isAdmin, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [changes, setChanges] = useState<Record<string, ProductChange>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let productsQuery = supabase.from('products').select('*').order('name');
      let storesQuery = supabase.from('stores').select('*').order('name');

      if (profile?.store_id) {
        productsQuery = productsQuery.eq('store_id', profile.store_id);
        storesQuery = storesQuery.eq('id', profile.store_id);
        setSelectedStore(profile.store_id);
      }

      const [productsRes, storesRes] = await Promise.all([
        productsQuery,
        storesQuery
      ]);

      if (productsRes.error) throw productsRes.error;
      if (storesRes.error) throw storesRes.error;

      setProducts(productsRes.data || []);
      setStores(storesRes.data || []);
      setChanges({});
    } catch (error: any) {
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (productId: string, field: keyof ProductChange, value: any) => {
    setChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleBulkSave = async () => {
    const changedIds = Object.keys(changes);
    if (changedIds.length === 0) {
      toast.error('No hay cambios para guardar');
      return;
    }

    setSaving(true);
    try {
      const updatePromises = changedIds.map(id => 
        supabase
          .from('products')
          .update(changes[id])
          .eq('id', id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`${errors.length} productos no pudieron actualizarse`);
      }

      toast.success('Inventario actualizado correctamente');
      fetchData();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.category.toLowerCase().includes(search.toLowerCase());
    const matchesStore = selectedStore === 'all' || p.store_id === selectedStore;
    return matchesSearch && matchesStore;
  });

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Gestor de Inventario Central</h1>
          <p className="text-slate-500 font-medium">Actualización masiva de precios, costos y stock</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all"
            title="Refrescar datos"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleBulkSave}
            disabled={!hasChanges || saving}
            className="flex-1 md:flex-none px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : `Guardar Cambios (${Object.keys(changes).length})`}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
          />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <Filter className="text-slate-400" size={20} />
          <select 
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            disabled={!!profile?.store_id}
            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {!profile?.store_id && <option value="all">Todas las Tiendas</option>}
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tienda</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Costo ($)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Precio ($)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Stock</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((product) => {
                const productChanges = changes[product.id] || {};
                const currentPrice = productChanges.price ?? product.price;
                const currentCost = productChanges.cost_price ?? product.cost_price;
                const currentStock = productChanges.stock ?? product.stock;
                const currentActive = productChanges.is_active ?? product.is_active;
                const margin = currentPrice > 0 ? (((currentPrice - (currentCost || 0)) / currentPrice) * 100).toFixed(0) : 0;

                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <img 
                            src={product.image_url || `https://picsum.photos/seed/${product.name}/100/100`} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{product.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500">
                        {stores.find(s => s.id === product.store_id)?.name || 'Global'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        step="0.01"
                        value={currentCost}
                        disabled={!isAdmin}
                        onChange={(e) => handleInputChange(product.id, 'cost_price', parseFloat(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-sm font-bold outline-none border-2 transition-all ${
                          productChanges.cost_price !== undefined ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50 focus:border-slate-200'
                        } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <input 
                          type="number"
                          step="0.01"
                          value={currentPrice}
                          disabled={!isAdmin}
                          onChange={(e) => handleInputChange(product.id, 'price', parseFloat(e.target.value))}
                          className={`w-full px-3 py-2 rounded-xl text-sm font-bold outline-none border-2 transition-all ${
                            productChanges.price !== undefined ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50 focus:border-slate-200'
                          } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        <p className={`text-[10px] font-black text-right ${Number(margin) < 15 ? 'text-red-500' : 'text-emerald-600'}`}>
                          Margen: {margin}%
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={currentStock}
                          onChange={(e) => handleInputChange(product.id, 'stock', parseInt(e.target.value))}
                          className={`w-full px-3 py-2 rounded-xl text-sm font-bold outline-none border-2 transition-all ${
                            productChanges.stock !== undefined ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50 focus:border-slate-200'
                          } ${currentStock < 10 ? 'text-red-600' : 'text-slate-900'}`}
                        />
                        {currentStock < 10 && <AlertCircle size={14} className="text-red-500 flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        disabled={!isAdmin}
                        onClick={() => handleInputChange(product.id, 'is_active', !currentActive)}
                        className={`p-2 rounded-xl transition-all ${
                          currentActive 
                            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isAdmin ? (currentActive ? 'Desactivar' : 'Activar') : 'Solo administradores pueden cambiar el estado'}
                      >
                        {currentActive ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-wider">Cambios Pendientes</p>
                <p className="text-xs text-slate-400 font-bold">{Object.keys(changes).length} productos modificados</p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10"></div>
            <div className="flex gap-3">
              <button 
                onClick={() => setChanges({})}
                className="px-6 py-2 text-sm font-bold hover:text-primary transition-colors"
              >
                Descartar
              </button>
              <button 
                onClick={handleBulkSave}
                disabled={saving}
                className="bg-primary px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                {saving ? 'Guardando...' : 'Guardar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
