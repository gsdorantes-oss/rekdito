import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Store } from '../types/database';
import { Search, User as UserIcon, Shield, Store as StoreIcon, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    role: 'client' as Profile['role'],
    store_id: '' as string
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, storesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('stores').select('*').order('name')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (storesRes.error) throw storesRes.error;

      setProfiles(profilesRes.data || []);
      setStores(storesRes.data || []);
    } catch (error: any) {
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingUser(profile);
    setFormData({
      role: profile.role,
      store_id: profile.store_id || ''
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: formData.role,
          store_id: formData.store_id || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      toast.success('Usuario actualizado correctamente');
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      toast.error('Error al actualizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Gestión de Usuarios</h1>
        <p className="text-slate-500 font-medium">Asigna roles y tiendas a los usuarios</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Rol</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tienda Asignada</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{profile.full_name}</p>
                        <p className="text-xs text-slate-500">{profile.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      profile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      profile.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {profile.store_id ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <StoreIcon size={14} className="text-primary" />
                        {stores.find(s => s.id === profile.store_id)?.name || 'Tienda no encontrada'}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(profile)}
                      className="text-primary font-black uppercase tracking-widest text-xs hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Editar Permisos</h2>
              <button onClick={() => setEditingUser(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                  <UserIcon size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-900">{editingUser.full_name}</p>
                  <p className="text-sm text-slate-500">{editingUser.phone}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} /> Rol del Usuario
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Profile['role'] })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-slate-700"
                  >
                    <option value="client">Cliente</option>
                    <option value="manager">Gerente de Tienda</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <StoreIcon size={14} /> Tienda Asignada
                  </label>
                  <select
                    value={formData.store_id}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-slate-700"
                  >
                    <option value="">Ninguna (Acceso Global)</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 italic">
                    * Los gerentes solo pueden ver datos de su tienda asignada.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
