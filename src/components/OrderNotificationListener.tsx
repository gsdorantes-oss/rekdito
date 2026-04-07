import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function OrderNotificationListener() {
  const { isAdmin, isManager, profile } = useAuth();
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();

    // Check if we can play audio
    const checkAudio = async () => {
      try {
        if (audioRef.current) {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsAudioEnabled(true);
        }
      } catch (e) {
        console.log('Audio autoplay blocked, waiting for interaction');
      }
    };
    checkAudio();
  }, []);

  const enableAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        setIsAudioEnabled(true);
        toast.success('Notificaciones sonoras activadas');
      }).catch(err => {
        console.error('Error enabling audio:', err);
      });
    }
  };

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
          toast.success(`¡NUEVO PEDIDO RECIBIDO! (#${payload.new.id.slice(0, 8)})`, {
            duration: 10000,
            icon: '🔔',
            position: 'top-center',
            style: {
              background: '#0f172a',
              color: '#fff',
              fontWeight: 'black',
              fontSize: '1.2rem',
              padding: '2rem',
              border: '4px solid #84cc16',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            },
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isAdmin, isManager, profile?.store_id]);

  if (!isAdmin && !isManager) return null;
  if (isAudioEnabled) return null;

  return (
    <div className="fixed bottom-24 left-4 z-[100] animate-bounce">
      <button 
        onClick={enableAudio}
        className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 border-2 border-primary/50 backdrop-blur-md"
      >
        <span className="animate-pulse">🔔</span>
        <span className="text-[10px] font-black uppercase tracking-wider">Activar Sonido</span>
      </button>
    </div>
  );
}
