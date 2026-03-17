import React from 'react';
import { useStore } from '../context/StoreContext';
import { MapPin, ChevronRight, Store as StoreIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function StoreSelector() {
  const { stores, setSelectedStore, loading } = useStore();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-4">Bienvenido a Recadito</h1>
        <p className="text-slate-500 text-lg font-medium">Selecciona la tienda más cercana a tu ubicación</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {stores.map((store) => (
          <motion.button
            key={store.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedStore(store)}
            className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all text-left flex flex-col h-full"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
              <StoreIcon size={32} />
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-900 mb-2">{store.name}</h2>
              <div className="flex items-start gap-2 text-slate-500 mb-6">
                <MapPin size={18} className="mt-1 flex-shrink-0" />
                <p className="font-medium leading-relaxed">{store.address}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <span className="text-primary font-black uppercase tracking-widest text-sm">Entrar a la tienda</span>
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                <ChevronRight size={20} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {stores.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
          <p className="text-slate-500 font-bold">No hay tiendas disponibles en este momento.</p>
        </div>
      )}
    </div>
  );
}
