import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, OrderStatus } from '../types/database';
import { formatCurrency, generateWhatsAppLink, sanitizeInput } from '../lib/utils';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Phone, CreditCard, Banknote, Wallet, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronDown } from 'lucide-react';

export default function AdminPOS() {
  const { profile, isAdmin } = useAuth();
  const { selectedStore, stores, setSelectedStore } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    paymentMethod: 'Efectivo' as any
  });
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  const [lastOrder, setLastOrder] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
  }, [profile?.store_id, selectedStore?.id]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const effectiveStoreId = isAdmin ? selectedStore?.id : profile?.store_id;

      if (!effectiveStoreId && isAdmin) {
        setProducts([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (effectiveStoreId) {
        query = query.or(`store_id.eq.${effectiveStoreId},store_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(0.01, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    setProcessing(true);
    try {
      const effectiveStoreId = isAdmin ? selectedStore?.id : profile?.store_id;
      
      if (!effectiveStoreId) {
        toast.error('Debes seleccionar una tienda para realizar una venta');
        setProcessing(false);
        return;
      }

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: null,
          total: total,
          delivery_fee: 0,
          delivery_type: 'in_store',
          payment_status: 'Pagado',
          delivery_zone: 'Venta en Tienda',
          store_id: effectiveStoreId,
          notes: sanitizeInput(`Venta directa: ${customerData.name}`),
          payment_method: customerData.paymentMethod,
          delivery_address: 'Venta en Tienda',
          delivery_lat: 0,
          delivery_lng: 0,
          phone_contact: sanitizeInput(customerData.phone),
          status: 'Entregado'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Update Inventory
      for (const item of cart) {
        const { error: invError } = await supabase.rpc('update_product_stock', {
          p_id: item.product.id,
          p_qty: -item.quantity
        });
        if (invError) console.error('Error updating stock:', invError);
      }

      setLastOrder({ ...order, items: cart });
      setOrderComplete(order.id);
      setCart([]);
      setCustomerData({ name: '', phone: '', paymentMethod: 'Efectivo' });
      toast.success('¡Venta registrada con éxito!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (orderComplete && lastOrder) {
    const waLink = lastOrder.phone_contact ? generateWhatsAppLink(
      lastOrder.id,
      lastOrder.phone_contact,
      lastOrder.total,
      lastOrder.items,
      'Venta en Tienda',
      'Entregado',
      0,
      lastOrder.notes
    ) : null;

    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="print:hidden">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600">
            <CheckCircle2 size={64} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4">¡Venta Completada!</h1>
          <p className="text-slate-500 mb-8 text-lg">
            Pedido <span className="font-bold text-slate-900">#{orderComplete.slice(0, 8)}</span> registrado correctamente.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <button 
              onClick={() => {
                setOrderComplete(null);
                setLastOrder(null);
              }}
              className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
            >
              Nueva Venta
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
            >
              <CheckCircle2 size={20} />
              Imprimir Factura
            </button>
            {waLink && (
              <a 
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-2"
              >
                <Phone size={20} />
                Enviar WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Printable Receipt */}
        <div className="hidden print:block bg-white p-8 text-left max-w-[400px] mx-auto font-mono text-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">RECADITO</h2>
            <p className="text-xs font-bold text-slate-500">FACTURA DE VENTA</p>
            <p className="text-[10px] mt-2">ID: {lastOrder.id}</p>
            <p className="text-[10px]">{new Date(lastOrder.created_at).toLocaleString()}</p>
          </div>

          <div className="border-t border-b border-dashed border-slate-300 py-4 mb-4">
            <div className="flex justify-between font-bold mb-2">
              <span>PRODUCTO</span>
              <span>TOTAL</span>
            </div>
            {lastOrder.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between mb-1">
                <span className="truncate pr-4">{item.quantity}x {item.product.name}</span>
                <span>{formatCurrency(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <div className="flex justify-between text-lg font-black">
              <span>TOTAL</span>
              <span>{formatCurrency(lastOrder.total)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>MÉTODO</span>
              <span>{lastOrder.payment_method}</span>
            </div>
          </div>

          <div className="text-center border-t border-dashed border-slate-300 pt-6">
            <p className="text-xs font-black mb-4">¡ESCANEAME Y PIDE DESDE LA APP!</p>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://ais-pre-tb7cqbg4cbmgkx6g7ep44x-150633789060.us-west2.run.app`}
              alt="QR App"
              className="mx-auto w-32 h-32 mb-4"
            />
            <p className="text-[10px] text-slate-400">Gracias por preferirnos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-120px)]">
      {/* Products Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar productos por nombre o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
            />
          </div>
          {isAdmin && (
            <div className="relative group/store">
              <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm min-w-[200px] justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  {selectedStore?.name || 'Seleccionar Tienda'}
                </div>
                <ChevronDown size={18} />
              </button>
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover/store:opacity-100 group-hover/store:visible transition-all z-50">
                <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cambiar Tienda</p>
                {stores.map(store => (
                  <button 
                    key={store.id}
                    onClick={() => setSelectedStore(store)}
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
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

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {!selectedStore && isAdmin ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                <MapPin size={40} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Selecciona una Tienda</h2>
              <p className="text-slate-500 max-w-xs mx-auto mb-8">Debes seleccionar una tienda para ver sus productos y realizar ventas.</p>
              <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
                {stores.map(store => (
                  <button 
                    key={store.id}
                    onClick={() => setSelectedStore(store)}
                    className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm flex items-center justify-between group"
                  >
                    {store.name}
                    <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white h-48 rounded-2xl animate-pulse border border-slate-100"></div>
                ))
              ) : filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-left flex flex-col group"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-slate-50">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-primary">
                      {formatCurrency(product.price)}
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    {product.type} • {product.stock} disp.
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart and Checkout */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary-light" />
              Caja / Factura
            </h2>
            <span className="text-xs font-bold text-slate-400">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
            <AnimatePresence mode="popLayout">
              {cart.map(item => (
                <motion.div 
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(item.product.price)} / {item.product.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-black w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {cart.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm font-bold">Carrito vacío</p>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-white/10 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                <input 
                  type="text"
                  placeholder="Nombre..."
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</label>
                <input 
                  type="tel"
                  placeholder="6000-0000"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Efectivo', icon: Banknote },
                  { id: 'Transferencia', icon: Wallet },
                  { id: 'Yappy', icon: CreditCard },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setCustomerData({ ...customerData, paymentMethod: method.id })}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1 ${
                      customerData.paymentMethod === method.id 
                        ? 'border-primary bg-primary/20 text-primary-light' 
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <method.icon size={16} />
                    <span className="text-[10px] font-bold">{method.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <span className="text-lg font-bold">Total</span>
              <span className="text-3xl font-black text-primary-light">{formatCurrency(total)}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={processing || cart.length === 0}
              className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {processing ? 'Procesando...' : 'Completar Venta'}
              {!processing && <ArrowRight size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
