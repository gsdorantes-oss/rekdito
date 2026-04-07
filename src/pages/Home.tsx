import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types/database';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { Search, Filter, Plus, Minus, ShoppingBag, LayoutDashboard, Sparkles, Utensils, Info, X, ChefHat, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import StoreSelector from '../components/StoreSelector';
import { MapPin } from 'lucide-react';
import { getNutritionalInfo, getRecipes, NutritionalInfo, Recipe } from '../services/geminiService';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { selectedStore, setSelectedStore } = useStore();

  const categories = ['Todos', 'Frutas', 'Verduras', 'Hortalizas', 'Tubérculos', 'Granos', 'Lácteos', 'Carnes', 'Abarrotes', 'Paquetes', 'Otros'];

  useEffect(() => {
    if (selectedStore) {
      fetchProducts();
    }
  }, [selectedStore]);

  const fetchProducts = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      // Fetch products for the selected store OR global products (store_id is null)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`store_id.eq.${selectedStore.id},store_id.is.null`)
        .eq('is_active', true)
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

      {/* Hero Section - Ultra compact version */}
      <div className="relative overflow-hidden rounded-3xl p-3 md:p-6 text-white shadow-lg shadow-emerald-900/5 flex items-center min-h-[120px] md:min-h-[160px]">
        {/* Background Texture: Green Apple Skin with Water Drops */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&q=80&w=2070" 
            alt="Freshness Texture" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-emerald-800/40 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full flex flex-row items-center gap-3 md:gap-6">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            whileTap={{ rotate: -10, scale: 0.9 }}
            className="w-16 h-16 md:w-24 md:h-24 shrink-0 cursor-pointer"
          >
            <img 
              src="/logo.png" 
              alt="RECADITO Logo" 
              className="w-full h-full object-contain drop-shadow-lg"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3724/3724720.png';
              }}
            />
          </motion.div>
          <div className="flex-1">
            <h1 className="text-lg md:text-3xl font-black tracking-tight mb-0.5 md:mb-1 drop-shadow-md leading-tight">
              Frescura del campo a tu hogar
            </h1>
            <p className="text-emerald-50 text-[10px] md:text-sm font-medium mb-2 md:mb-3 drop-shadow-sm max-w-md opacity-90">
              Frutas, verduras y paquetes seleccionados con amor.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <div className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold border border-white/5">
                ✓ Entrega rápida
              </div>
              <div className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold border border-white/5">
                ✓ Calidad garantizada
              </div>
            </div>
          </div>
        </div>
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
                onShowDetails={(p) => setSelectedProduct(p)}
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

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailsModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ product, onAdd, onShowDetails }: { product: Product, onAdd: (product: Product, quantity: number) => void, onShowDetails: (product: Product) => void, key?: string }) {
  const isWeightBased = product.type === 'libra';
  const step = isWeightBased ? 0.5 : 1;
  const [quantity, setQuantity] = useState(isWeightBased ? 0.5 : 1);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(product, quantity);
    toast.success(`${product.name} agregado al carrito`, {
      icon: '🛒',
      style: {
        borderRadius: '1rem',
        background: '#334155',
        color: '#fff',
      },
    });
    setQuantity(isWeightBased ? 0.5 : 1);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => onShowDetails(product)}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <img
          src={product.image_url || `https://picsum.photos/seed/${product.name}/400/400`}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <span className="bg-white/90 backdrop-blur-md text-primary text-[10px] font-black px-2 py-1 rounded-lg shadow-sm uppercase tracking-wider">
            Por {product.type}
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails(product);
            }}
            className="bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <Info size={14} />
          </button>
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
            <div className="flex items-center bg-slate-50 rounded-lg p-1" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setQuantity(q => Math.max(step, q - step))}
                className="p-1 hover:text-primary transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-12 text-center text-xs font-bold">
                {quantity} {isWeightBased ? 'lb' : ''}
              </span>
              <button 
                onClick={() => setQuantity(q => q + step)}
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

function ProductDetailsModal({ product, onClose }: { product: Product, onClose: () => void }) {
  const [nutritionalInfo, setNutritionalInfo] = useState<NutritionalInfo | null>(null);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadingAI, setLoadingAI] = useState<'nutrition' | 'recipes' | null>(null);

  const fetchNutrition = async () => {
    setLoadingAI('nutrition');
    try {
      const info = await getNutritionalInfo(product.name);
      setNutritionalInfo(info);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo obtener la información nutricional');
    } finally {
      setLoadingAI(null);
    }
  };

  const fetchRecipes = async () => {
    setLoadingAI('recipes');
    try {
      const data = await getRecipes(product.name);
      setRecipes(data);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo generar las recetas');
    } finally {
      setLoadingAI(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="relative h-64 shrink-0">
          <img 
            src={product.image_url || `https://picsum.photos/seed/${product.name}/800/600`} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-slate-900 px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-white transition-all shadow-2xl border border-white/20 z-10"
          >
            <X size={18} className="text-primary" />
            Cerrar Info
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-900/80 to-transparent text-white">
            <span className="bg-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 inline-block">
              {product.category}
            </span>
            <h2 className="text-3xl font-black">{product.name}</h2>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</h3>
            <p className="text-slate-600 leading-relaxed">{product.description || 'Sin descripción disponible.'}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

