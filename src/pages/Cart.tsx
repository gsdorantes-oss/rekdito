import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { Trash2, Plus, Minus, ArrowRight, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Cart() {
  const { items, total, removeFromCart, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
          <ShoppingCart size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">Tu carrito está vacío</h1>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Parece que aún no has agregado nada. ¡Explora nuestra tienda y descubre los mejores productos frescos!
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
        >
          Ir a la tienda
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-slate-900">Tu Carrito</h1>
          <span className="text-slate-500 font-medium">{items.length} productos</span>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 items-center"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                  <img 
                    src={item.product.image_url || `https://picsum.photos/seed/${item.product.name}/200/200`} 
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{item.product.name}</h3>
                  <p className="text-xs text-slate-500 mb-2">Precio: {formatCurrency(item.product.price)} / {item.product.type}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-50 rounded-lg p-1">
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-black text-slate-900">{formatCurrency(item.product.price * item.quantity)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 sticky top-24">
          <h2 className="text-xl font-black text-slate-900 mb-6">Resumen</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Envío</span>
              <span className="text-primary font-bold">Gratis</span>
            </div>
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-2xl font-black text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <Link 
            to="/checkout"
            className="w-full bg-slate-900 hover:bg-primary text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group"
          >
            Continuar al pago
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="mt-4 text-center text-xs text-slate-400">
            Al continuar, aceptas nuestros términos y condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}
