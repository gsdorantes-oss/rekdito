import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types/database';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { Search, Filter, Plus, Minus, ShoppingBag, LayoutDashboard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import StoreSelector from '../components/StoreSelector';
import { MapPin } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { selectedStore, setSelectedStore } = useStore();

  const categories = ['Todos', 'Frutas', 'Verduras', 'Paquetes', 'Otros'];

  useEffect(() => {
    if (selectedStore) {
      fetchProducts();
    }
  }, [selectedStore]);

  const fetchProducts = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('store_id', selectedStore.id)
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const message = error.message || 'Error al cargar productos';
      toast.error(message);
      
      if (error.code === '42P01') {
        toast.error('La tabla "products" no existe. ¿Ejecutaste el script SQL?');
      } else if (error.message?.includes('fetch')) {
        toast.error('Error de conexión. Verifica tus llaves de Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'Todos' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const isConfigured = import.meta.env.VITE_SUPABASE_URL && 
                      import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co';

  if (!selectedStore) {
    return <StoreSelector />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500 font-bold">
          <MapPin size={18} className="text-primary" />
          <span>Comprando en: <span className="text-slate-900">{selectedStore.name}</span></span>
        </div>
        <button 
          onClick={() => setSelectedStore(null)}
          className="text-xs font-black text-primary uppercase tracking-widest hover:underline"
        >
          Cambiar Tienda
        </button>
      </div>

      {!isConfigured && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-red-900">
          <h2 className="text-xl font-black mb-2 flex items-center gap-2">
            ⚠️ Configuración Incompleta
          </h2>
          <p className="mb-4 font-medium">
            Debes configurar tus llaves de Supabase en el panel de <b>Secrets</b> para que la app funcione.
          </p>
          <div className="bg-white/50 p-4 rounded-xl text-sm space-y-2 font-mono">
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-primary rounded-3xl p-6 md:p-12 text-white shadow-2xl shadow-primary/20">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-6xl font-black tracking-tight mb-4">
            Frescura del campo <br /> a tu hogar
          </h1>
          <p className="text-primary-light text-base md:text-xl font-medium mb-6 md:mb-8">
            Frutas, verduras y paquetes mixtos seleccionados con amor.
          </p>
          <div className="flex flex-wrap gap-2 md:gap-4">
            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] md:text-sm font-bold">
              ✓ Entrega rápida
            </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] md:text-sm font-bold">
              ✓ Calidad garantizada
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-white/10 skew-x-12 translate-x-1/2"></div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                category === cat 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-100"></div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAdd={(p, q) => addToCart(p, q)} 
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No encontramos productos</h3>
          <p className="text-slate-500">Intenta con otra búsqueda o categoría.</p>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product, onAdd: (product: Product, quantity: number) => void, key?: string }) {
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    onAdd(product, quantity);
    toast.success(`${product.name} agregado al carrito`, {
      icon: '🛒',
      style: {
        borderRadius: '1rem',
        background: '#334155',
        color: '#fff',
      },
    });
    setQuantity(1);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <img
          src={product.image_url || `https://picsum.photos/seed/${product.name}/400/400`}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2">
          <span className="bg-white/90 backdrop-blur-md text-primary text-[10px] font-black px-2 py-1 rounded-lg shadow-sm uppercase tracking-wider">
            Por {product.type}
          </span>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-bold text-slate-900 leading-tight mb-1">{product.name}</h3>
          <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
        </div>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-black text-primary">{formatCurrency(product.price)}</span>
            <div className="flex items-center bg-slate-50 rounded-lg p-1">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="p-1 hover:text-primary transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-xs font-bold">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="p-1 hover:text-primary transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          
          <button
            onClick={handleAdd}
            className="w-full bg-slate-900 hover:bg-primary text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group/btn"
          >
            <ShoppingBag size={16} className="group-hover/btn:scale-110 transition-transform" />
            Agregar
          </button>
        </div>
      </div>
    </motion.div>
  );
}
