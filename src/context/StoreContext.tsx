import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store } from '../types/database';
import { useAuth } from './AuthContext';

interface StoreContextType {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  stores: Store[];
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [selectedStore, setSelectedStore] = useState<Store | null>(() => {
    const saved = localStorage.getItem('selected_store');
    return saved ? JSON.parse(saved) : null;
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      localStorage.setItem('selected_store', JSON.stringify(selectedStore));
    } else {
      localStorage.removeItem('selected_store');
    }
  }, [selectedStore]);

  // Auto-select store from profile if available
  useEffect(() => {
    if (profile?.store_id && stores.length > 0) {
      const profileStore = stores.find(s => s.id === profile.store_id);
      if (profileStore && (!selectedStore || selectedStore.id !== profileStore.id)) {
        setSelectedStore(profileStore);
      }
    }
  }, [profile, stores]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      const fetchedStores = data || [];
      setStores(fetchedStores);
      
      // If only one store, select it automatically
      if (fetchedStores.length === 1 && !selectedStore) {
        setSelectedStore(fetchedStores[0]);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StoreContext.Provider value={{ selectedStore, setSelectedStore, stores, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
