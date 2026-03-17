import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingCart, User, LayoutDashboard, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const { items } = useCart();
  const { isAdmin, isManager } = useAuth();
  const cartCount = items.length;
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 100) { // scrolling down
          setIsVisible(false);
        } else { // scrolling up
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', controlNavbar);
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY]);

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-50 pb-safe transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="flex justify-around items-center h-16">
        <NavLink 
          to="/" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`}
        >
          <Home size={22} />
          <span className="text-[10px] font-bold">Inicio</span>
        </NavLink>

        <NavLink 
          to="/cart" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors relative ${isActive ? 'text-primary' : 'text-slate-400'}`}
        >
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] font-bold">Carrito</span>
        </NavLink>

        {isAdmin && (
          <>
            <NavLink 
              to="/admin/orders" 
              className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`}
            >
              <ShoppingBag size={22} />
              <span className="text-[10px] font-bold">Pedidos</span>
            </NavLink>
            <NavLink 
              to="/admin" 
              className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`}
            >
              <LayoutDashboard size={22} />
              <span className="text-[10px] font-bold">Admin</span>
            </NavLink>
          </>
        )}

        <NavLink 
          to="/profile" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`}
        >
          <User size={22} />
          <span className="text-[10px] font-bold">Perfil</span>
        </NavLink>
      </div>
    </nav>
  );
}
