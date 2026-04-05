import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function ClientOrderNotificationListener() {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio with a different sound for clients
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up order status listener for client:', user.id);

    const subscription = supabase
      .channel(`user_orders_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            console.log(`Order ${payload.new.id} status changed from ${oldStatus} to ${newStatus}`);
            
            // Play sound
            if (audioRef.current) {
              audioRef.current.play().catch(err => {
                console.warn('Could not play notification sound.', err);
              });
            }

            // Show toast with specific status message
            let message = `Tu pedido #${payload.new.id.slice(0, 8)} ha cambiado a: ${newStatus}`;
            let icon = '📦';

            if (newStatus === 'En camino') {
              message = `¡Tu pedido #${payload.new.id.slice(0, 8)} está en camino! 🛵`;
              icon = '🛵';
            } else if (newStatus === 'Entregado') {
              message = `¡Tu pedido #${payload.new.id.slice(0, 8)} ha sido entregado! 🎉`;
              icon = '✅';
            } else if (newStatus === 'Preparando') {
              message = `Estamos preparando tu pedido #${payload.new.id.slice(0, 8)} 👨‍🍳`;
              icon = '👨‍🍳';
            }

            toast.success(message, {
              duration: 8000,
              icon: icon,
              style: {
                background: '#0f172a',
                color: '#fff',
                fontWeight: 'bold',
                border: '2px solid #fbbf24'
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return null;
}
