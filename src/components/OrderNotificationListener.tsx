import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function OrderNotificationListener() {
  const { isAdmin, isManager, profile } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    // Preload the sound
    audioRef.current.load();
  }, []);

  useEffect(() => {
    if (!isAdmin && !isManager) return;

    console.log('Setting up order notification listener for admin/manager');

    const subscription = supabase
      .channel('global_orders_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          // If manager, only notify if it's for their store
          if (isManager && profile?.store_id && payload.new.store_id !== profile.store_id) {
            return;
          }

          console.log('New order received!', payload.new);
          
          // Play sound
          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.warn('Could not play notification sound. User interaction might be required.', err);
            });
          }

          // Show toast
          toast.success('¡Nuevo pedido recibido!', {
            duration: 6000,
            icon: '🔔',
            style: {
              background: '#0f172a',
              color: '#fff',
              fontWeight: 'bold',
            },
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isAdmin, isManager, profile?.store_id]);

  return null;
}
