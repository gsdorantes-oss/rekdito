import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Store, ShoppingBag, TrendingUp, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const { selectedStore } = useStore();
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-12 h-12 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="/logo.png" 
                  alt="RECADITO Logo" 
                  className="w-full h-full object-contain drop-shadow-xl"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback if logo.png doesn't exist
                    e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3724/3724720.png';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-none">RECADITO</span>
                <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase leading-none mt-1">
                  {selectedStore ? selectedStore.name : 'Fresco & Directo'}
                </span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === '/' ? "text-primary" : "text-slate-600"
              )}
            >
              Tienda
            </Link>
            {isAdmin && (
              <>
                <Link 
                  to="/admin" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    location.pathname === '/admin' ? "text-primary" : "text-slate-600"
                  )}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <Link 
                  to="/admin/orders" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    location.pathname === '/admin/orders' ? "text-primary" : "text-slate-600"
                  )}
                >
                  <ShoppingBag size={16} />
                  Pedidos
                </Link>
                <Link 
                  to="/admin/finances" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    location.pathname === '/admin/finances' ? "text-primary" : "text-slate-600"
                  )}
                >
                  <TrendingUp size={16} />
                  Finanzas
                </Link>
                <Link 
                  to="/admin/products" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    location.pathname === '/admin/products' ? "text-primary" : "text-slate-600"
                  )}
                >
                  <Store size={16} />
                  Productos
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/cart" className="relative p-2 text-slate-600 hover:text-primary transition-colors">
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <span className="hidden md:inline text-sm font-medium">{profile?.full_name?.split(' ')[0]}</span>
                </Link>
                <button 
                  onClick={() => signOut()}
                  className="hidden md:block p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
