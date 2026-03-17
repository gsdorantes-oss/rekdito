import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DeliveryZone } from '../types/database';
import { formatCurrency } from '../lib/utils';
import { Plus, Search, Edit2, Trash2, MapPin, X, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

export default function AdminDeliveryZones() {
  const { profile } = useAuth();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    neighborhoods: '',
    store_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchZones();
    fetchStores();
  }, [profile?.store_id]);

  const fetchStores = async () => {
    try {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (profile?.store_id) {
        query = query.eq('id', profile.store_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setStores(data || []);
      
      if (data && data.length > 0 && !formData.store_id) {
        setFormData(prev => ({ ...prev, store_id: data[0].id }));
      }
    } catch (error: any) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchZones = async () => {
    try {
      let query = supabase
        .from('delivery_zones')
        .select('*, stores(name)')
        .order('name');

      if (profile?.store_id) {
        query = query.eq('store_id', profile.store_id);
      }
      
      const { data, error } = await query;
      setZones(data || []);
    } catch (error: any) {
      console.error('Error fetching zones:', error);
      toast.error(error.message || 'Error al cargar zonas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        price: zone.price,
        neighborhoods: zone.neighborhoods,
        store_id: zone.store_id || '',
        is_active: zone.is_active
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        price: 0,
        neighborhoods: '',
        store_id: stores[0]?.id || '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingZone) {
        const { error } = await supabase
          .from('delivery_zones')
          .update(formData)
          .eq('id', editingZone.id);
        if (error) throw error;
        toast.success('Zona actualizada');
      } else {
        const { error } = await supabase
          .from('delivery_zones')
          .insert(formData);
        if (error) throw error;
        toast.success('Zona creada');
      }
      setIsModalOpen(false);
      fetchZones();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta zona?')) return;
    
    try {
      const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
      if (error) throw error;
      toast.success('Zona eliminada');
      fetchZones();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleStatus = async (zone: DeliveryZone) => {
    try {
      const { error } = await supabase
        .from('delivery_zones')
        .update({ is_active: !zone.is_active })
        .eq('id', zone.id);
      
      if (error) throw error;
      toast.success(zone.is_active ? 'Zona desactivada' : 'Zona activada');
      fetchZones();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredZones = zones.filter(z => 
    z.name.toLowerCase().includes(search.toLowerCase()) ||
    z.neighborhoods.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Zonas de Entrega</h1>
          <p className="text-slate-500 font-medium">Personaliza los precios y barriadas por zona</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Zona
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por zona o barriada..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
        />
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredZones.length > 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Nombre de Zona</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tienda</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Precio</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Barriadas / Sectores</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredZones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">{zone.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600">{(zone as any).stores?.name || 'Sin tienda'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-primary">{formatCurrency(zone.price)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2 max-w-md">
                          {zone.neighborhoods}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => toggleStatus(zone)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                            zone.is_active 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {zone.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                          {zone.is_active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(zone)}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(zone.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
            <p className="text-slate-500 font-bold">No se encontraron zonas.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">
                {editingZone ? 'Editar Zona' : 'Nueva Zona'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre de la Zona</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Zona 1 - Costa Verde"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Precio de Envío</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tienda Asociada</label>
                <select
                  required
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none"
                >
                  <option value="">Selecciona una tienda...</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Barriadas / Sectores Incluidos</label>
                <textarea
                  required
                  placeholder="Ej: Montelimar, Uni-Plaza, Mastranto..."
                  value={formData.neighborhoods}
                  onChange={(e) => setFormData({ ...formData, neighborhoods: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[120px]"
                />
                <p className="text-xs text-slate-400 italic">
                  Separa las barriadas por comas. El sistema usará estos nombres para detectar la zona automáticamente en el mapa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Zona Activa</label>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {loading ? 'Guardando...' : (editingZone ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
