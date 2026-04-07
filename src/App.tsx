import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, ShoppingBag, TrendingUp, MapPin, Package, Banknote } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import OrderNotificationListener from './components/OrderNotificationListener';
import ClientOrderNotificationListener from './components/ClientOrderNotificationListener';

// Pages (to be created)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
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
import AdminPOS from './pages/AdminPOS';

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

function AppContent() {
  const { isAdmin, isManager, user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={user && (isAdmin || isManager) ? <Navigate to="/admin" /> : <Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/admin/pos" element={
            <ProtectedRoute adminOrManager>
              <AdminPOS />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <BottomNav />
      <OrderNotificationListener />
      <ClientOrderNotificationListener />

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
