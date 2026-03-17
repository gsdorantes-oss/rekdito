import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, ShoppingBag, TrendingUp, MapPin } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';

// Pages (to be created)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import OrderDetails from './pages/OrderDetails';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminFinances from './pages/AdminFinances';
import AdminDeliveryZones from './pages/AdminDeliveryZones';
import AdminStores from './pages/AdminStores';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
}

function AppContent() {
  const { isAdmin } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          
          <Route path="/checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/orders/:id" element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <ProtectedRoute adminOnly>
              <AdminProducts />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute adminOnly>
              <AdminOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/finances" element={
            <ProtectedRoute adminOnly>
              <AdminFinances />
            </ProtectedRoute>
          } />
          <Route path="/admin/delivery-zones" element={
            <ProtectedRoute adminOnly>
              <AdminDeliveryZones />
            </ProtectedRoute>
          } />
          <Route path="/admin/stores" element={
            <ProtectedRoute adminOnly>
              <AdminStores />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <BottomNav />
      
      {isAdmin && (
        <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2">
          <Link 
            to="/admin"
            className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-2xl hover:bg-primary transition-all flex items-center gap-2 border-2 border-white/20 backdrop-blur-md group"
          >
            <LayoutDashboard size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Dashboard</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse border-2 border-white"></div>
          </Link>
          <Link 
            to="/admin/orders"
            className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md group"
          >
            <ShoppingBag size={18} className="text-primary" />
            <span className="text-xs font-black uppercase tracking-wider">Pedidos</span>
          </Link>
          <Link 
            to="/admin/finances"
            className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md group"
          >
            <TrendingUp size={18} className="text-emerald-600" />
            <span className="text-xs font-black uppercase tracking-wider">Finanzas</span>
          </Link>
          <Link 
            to="/admin/delivery-zones"
            className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md group"
          >
            <MapPin size={18} className="text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider">Zonas</span>
          </Link>
          <Link 
            to="/admin/stores"
            className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md group"
          >
            <ShoppingBag size={18} className="text-purple-600" />
            <span className="text-xs font-black uppercase tracking-wider">Tiendas</span>
          </Link>
        </div>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppContent />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
