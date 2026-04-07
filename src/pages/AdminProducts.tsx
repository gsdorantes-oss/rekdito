import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, ProductType } from '../types/database';
import { formatCurrency, sanitizeInput } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { Plus, Search, Edit2, Trash2, Package, Image as ImageIcon, X, ShoppingBag, Eye, EyeOff, TrendingUp, MapPin, ChevronDown, Copy } from 'lucide-react';

export default function AdminProducts() {
  const { profile, isAdmin } = useAuth();
  const { selectedStore, stores: allStores, setSelectedStore } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Frutas',
    description: '',
    type: 'unidad' as ProductType,
    price: 0,
    cost_price: 0,
    image_url: '',
    stock: 0,
    is_active: true,
    store_id: ''
  });

  useEffect(() => {
    fetchProducts();
    if (isAdmin) {
      fetchStores();
    }
  }, [profile?.store_id, isAdmin, selectedStore?.id]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const effectiveStoreId = isAdmin ? selectedStore?.id : profile?.store_id;

      let query = supabase
        .from('products')
        .select('*')
        .order('name');

      if (effectiveStoreId) {
        // Include products for this store OR global products
        query = query.or(`store_id.eq.${effectiveStoreId},store_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(error.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        description: product.description || '',
        type: product.type,
        price: product.price,
        cost_price: product.cost_price || 0,
        image_url: product.image_url || '',
        stock: product.stock,
        is_active: product.is_active,
        store_id: product.store_id || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Frutas',
        description: '',
        type: 'unidad',
        price: 0,
        cost_price: 0,
        image_url: '',
        stock: 0,
        is_active: true,
        store_id: profile?.store_id || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        ...formData,
        name: sanitizeInput(formData.name),
        category: sanitizeInput(formData.category),
        description: sanitizeInput(formData.description),
        image_url: sanitizeInput(formData.image_url),
        store_id: formData.store_id || null // Use null for Global
      };

      if (editingProduct) {
        // Security check: Ensure manager is editing their own store's product or a global one if they are admin
        if (!isAdmin && profile?.store_id && editingProduct.store_id && editingProduct.store_id !== profile.store_id) {
          throw new Error('No tienes permiso para editar este producto');
        }

        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Producto actualizado');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast.success('Producto creado');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (product: Product) => {
    if (!confirm(`¿Deseas duplicar el producto "${product.name}"?`)) return;
    
    setLoading(true);
    try {
      const { id, created_at, ...productToDuplicate } = product;
      const duplicatedData = {
        ...productToDuplicate,
        name: `${product.name} (Copia)`,
        is_active: false // Keep it hidden by default
      };

      const { error } = await supabase
        .from('products')
        .insert(duplicatedData);

      if (error) throw error;
      toast.success('Producto duplicado con éxito');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Error al duplicar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      
      if (error) throw error;
      toast.success(product.is_active ? 'Producto ocultado' : 'Producto activado');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Productos</h1>
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
                {allStores.map(store => (
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
            to="/admin/delivery-zones"
            className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <MapPin size={20} className="text-blue-600" />
            Zonas
          </Link>
          <Link 
            to="/admin/finances"
            className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <TrendingUp size={20} className="text-emerald-600" />
            Finanzas
          </Link>
          <Link 
            to="/admin/orders"
            className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <ShoppingBag size={20} />
            Ver Pedidos
          </Link>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o categoría..."
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
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Producto</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Costo</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Precio</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Margen</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((product) => (
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
                      <span className="font-bold text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black uppercase text-slate-400">{product.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatCurrency(product.cost_price || 0)}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      {product.price > 0 ? (((product.price - (product.cost_price || 0)) / product.price) * 100).toFixed(0) : 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${product.stock < 10 ? 'text-red-500' : 'text-slate-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(product)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        product.is_active 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {product.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                      {product.is_active ? 'Visible' : 'Oculto'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDuplicate(product)}
                        className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                        title="Duplicar"
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Frutas">Frutas</option>
                    <option value="Verduras">Verduras</option>
                    <option value="Hortalizas">Hortalizas</option>
                    <option value="Tubérculos">Tubérculos</option>
                    <option value="Granos">Granos</option>
                    <option value="Lácteos">Lácteos</option>
                    <option value="Carnes">Carnes</option>
                    <option value="Abarrotes">Abarrotes</option>
                    <option value="Paquetes">Paquetes</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tipo de Stock</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="libra">Libra</option>
                    <option value="paquete">Paquete</option>
                    <option value="kilo">Kilo</option>
                    <option value="mazo">Mazo</option>
                    <option value="caja">Caja</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Precio Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Stock Inicial</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">URL de Imagen</label>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  {formData.image_url && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Producto Activo</label>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tienda Asociada</label>
                  <select
                    value={formData.store_id}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Todas las Tiendas (Global)</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
