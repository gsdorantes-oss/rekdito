import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, ShoppingBag, TrendingUp, MapPin, User as UserIcon, Package } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
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
import AdminUsers from './pages/AdminUsers';
import AdminInventory from './pages/AdminInventory';

function ProtectedRoute({ children, adminOnly = false, adminOrManager = false }: { children: React.ReactNode, adminOnly?: boolean, adminOrManager?: boolean }) {
  const { user, profile, loading, isAdmin, isManager } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  if (adminOrManager && !isAdmin && !isManager) return <Navigate to="/" />;

  return <>{children}</>;
}

function AdminFloatingMenu() {
  const { isAdmin, isManager } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isAdmin && !isManager) return null;

  return (
    <div className="fixed top-24 right-4 z-[60] flex flex-col items-end gap-2">
      {isOpen && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-right-4 duration-300">
          <Link 
            to="/admin"
            onClick={() => setIsOpen(false)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-2xl hover:bg-primary transition-all flex items-center gap-2 border-2 border-white/20 backdrop-blur-md"
          >
            <LayoutDashboard size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Dashboard</span>
          </Link>
          <Link 
            to="/admin/orders"
            onClick={() => setIsOpen(false)}
            className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md"
          >
            <ShoppingBag size={18} className="text-primary" />
            <span className="text-xs font-black uppercase tracking-wider">Pedidos</span>
          </Link>
          <Link 
            to="/admin/inventory"
            onClick={() => setIsOpen(false)}
            className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md"
          >
            <Package size={18} className="text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider">Inventario</span>
          </Link>
          <Link 
            to="/admin/finances"
            onClick={() => setIsOpen(false)}
            className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md"
          >
            <TrendingUp size={18} className="text-emerald-600" />
            <span className="text-xs font-black uppercase tracking-wider">Finanzas</span>
          </Link>
          {isAdmin && (
            <>
              <Link 
                to="/admin/users"
                onClick={() => setIsOpen(false)}
                className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md"
              >
                <UserIcon size={18} className="text-orange-600" />
                <span className="text-xs font-black uppercase tracking-wider">Usuarios</span>
              </Link>
              <Link 
                to="/admin/stores"
                onClick={() => setIsOpen(false)}
                className="bg-white text-slate-900 px-4 py-2 rounded-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-900/10 backdrop-blur-md"
              >
                <ShoppingBag size={18} className="text-purple-600" />
                <span className="text-xs font-black uppercase tracking-wider">Tiendas</span>
              </Link>
            </>
          )}
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 border-2 ${
          isOpen ? 'bg-slate-900 text-white border-white/20' : 'bg-primary text-white border-white/40'
        }`}
      >
        {isOpen ? <LayoutDashboard size={24} /> : <LayoutDashboard size={24} className="animate-pulse" />}
      </button>
    </div>
  );
}

function AppContent() {
  const { isAdmin, isManager } = useAuth();
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
            <ProtectedRoute adminOrManager>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <ProtectedRoute adminOrManager>
              <AdminProducts />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute adminOrManager>
              <AdminOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/finances" element={
            <ProtectedRoute adminOrManager>
              <AdminFinances />
            </ProtectedRoute>
          } />
          <Route path="/admin/delivery-zones" element={
            <ProtectedRoute adminOrManager>
              <AdminDeliveryZones />
            </ProtectedRoute>
          } />
          <Route path="/admin/stores" element={
            <ProtectedRoute adminOnly>
              <AdminStores />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute adminOnly>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory" element={
            <ProtectedRoute adminOrManager>
              <AdminInventory />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <BottomNav />
      <AdminFloatingMenu />

      <Toaster position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
