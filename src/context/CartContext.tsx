import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types/database';
import { useStore } from './StoreContext';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { selectedStore } = useStore();

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('recadito_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        // Only load if it's from the same store (if we had store_id in cart)
        // For now, let's just clear it if store changes
        setItems(parsed);
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  // Clear cart if store changes
  useEffect(() => {
    if (items.length > 0 && selectedStore) {
      const firstItemStoreId = items[0].product.store_id;
      if (firstItemStoreId !== selectedStore.id) {
        setItems([]);
      }
    }
  }, [selectedStore]);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('recadito_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
