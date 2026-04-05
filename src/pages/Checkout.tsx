import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, generateWhatsAppLink } from '../lib/utils';
import { MapPin, Phone, CreditCard, Wallet, Banknote, ArrowRight, CheckCircle2, Clock, MessageCircle, ShoppingBag, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { toast } from 'react-hot-toast';
import L from 'leaflet';

// Fix Leaflet icon issue
const icon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const isPointInPolygon = (point: [number, number], polygon: [number, number][]) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

function LocationMarker({ position, setPosition, onLocationSelect }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void, onLocationSelect: (lat: number, lng: number) => void }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function MapController({ position }: { position: L.LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16);
    }
  }, [position, map]);
  return null;
}

export default function Checkout() {
  const { user, profile } = useAuth();
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: profile?.phone || '',
    address: profile?.address || '',
    paymentMethod: 'Efectivo' as any,
    notes: '',
    deliveryZone: ''
  });
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [nearestStore, setNearestStore] = useState<{ name: string, distance: number } | null>(null);

  useEffect(() => {
    fetchDeliveryZones();
  }, []);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      // 1. Find nearest store using Supabase RPC
      const { data: nearestData, error: nearestError } = await supabase
        .rpc('find_nearest_store', { user_lat: lat, user_lng: lng });

      if (!nearestError && nearestData && nearestData.length > 0) {
        setNearestStore({
          name: nearestData[0].store_name,
          distance: nearestData[0].distance_km
        });
      }

      // 2. Use Nominatim for free reverse geocoding
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'RecaditoApp/1.0'
        }
      });
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        // Search for neighborhood keywords in the address components
        const searchTerms = [
          addr.suburb,
          addr.neighbourhood,
          addr.city_district,
          addr.town,
          addr.village,
          addr.residential,
          addr.industrial,
          addr.commercial,
          data.display_name
        ].filter(Boolean).map(s => s.toLowerCase());

        console.log('Search terms from geocoding:', searchTerms);

        // Find a matching zone
        let matchedZone = null;

        // 1. Try Polygon match first (more precise)
        for (const zone of deliveryZones) {
          if (zone.coordinates && Array.isArray(zone.coordinates) && zone.coordinates.length > 2) {
            if (isPointInPolygon([lat, lng], zone.coordinates)) {
              matchedZone = zone;
              break;
            }
          }
        }

        // 2. Fallback to neighborhood keywords if no polygon match
        if (!matchedZone) {
          for (const zone of deliveryZones) {
            const zoneNeighborhoods = zone.neighborhoods.split(',').map((n: string) => n.trim().toLowerCase());
            
            // Check if any neighborhood in the zone matches any term from geocoding
            const hasMatch = zoneNeighborhoods.some((zn: string) => 
              searchTerms.some(term => term.includes(zn) || zn.includes(term))
            );

            if (hasMatch) {
              matchedZone = zone;
              break;
            }
          }
        }

        if (matchedZone) {
          setFormData(prev => ({ ...prev, deliveryZone: matchedZone.id }));
          toast.success(`Zona detectada: ${matchedZone.name}`, { icon: '📍' });
        } else {
          toast('Ubicación marcada. Por favor selecciona tu zona manualmente si no se detectó automáticamente.', { icon: 'ℹ️' });
        }

        // Also update address if empty
        if (!formData.address) {
          setFormData(prev => ({ ...prev, address: data.display_name }));
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setGeocoding(false);
    }
  };

  const handleGetLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es compatible con tu navegador');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newPos = new L.LatLng(lat, lng);
        setPosition(newPos);
        handleLocationSelect(lat, lng);
        setGettingLocation(false);
        toast.success('Ubicación obtenida correctamente');
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('No se pudo obtener la ubicación. Por favor, actívala en tu navegador.');
        setGettingLocation(false);
      }
    );
  };

  const fetchDeliveryZones = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setDeliveryZones(data || []);
    } catch (error: any) {
      console.error('Error fetching delivery zones:', error);
    }
  };

  const currentZone = deliveryZones.find(z => z.id === formData.deliveryZone);
  const deliveryFee = total >= 15 ? 0 : (currentZone?.price || 0);
  const finalTotal = total + deliveryFee;

  useEffect(() => {
    if (items.length === 0 && !orderComplete) {
      navigate('/cart');
    }
  }, [items, orderComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deliveryZone) {
      toast.error('Por favor selecciona una zona de entrega');
      return;
    }
    if (!position) {
      toast.error('Por favor selecciona tu ubicación en el mapa');
      return;
    }
    setLoading(true);

    try {
      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total: finalTotal,
          delivery_fee: deliveryFee,
          delivery_zone: currentZone?.name,
          store_id: currentZone?.store_id,
          notes: formData.notes,
          payment_method: formData.paymentMethod,
          delivery_address: formData.address,
          delivery_lat: position.lat,
          delivery_lng: position.lng,
          phone_contact: formData.phone,
          status: 'Pendiente'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Success
      setOrderComplete(order.id);
      clearCart();
      toast.success('¡Pedido realizado con éxito!');
      
      // 4. WhatsApp Redirect
      const waLink = generateWhatsAppLink(order.id, formData.phone, finalTotal, items, formData.address, 'Pendiente', deliveryFee, formData.notes);
      window.open(waLink, '_blank');

    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-600">
          <Clock size={64} className="animate-pulse" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4">¡Pedido Recibido!</h1>
        <div className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-black uppercase tracking-widest mb-6">
          Estado: Pendiente
        </div>
        <p className="text-slate-500 mb-8 text-lg leading-relaxed">
          Tu pedido <span className="font-bold text-slate-900">#{orderComplete.slice(0, 8)}</span> ya está en nuestro sistema.<br/>
          <span className="text-primary font-bold">Por favor, envía la factura por WhatsApp para coordinar tu pago y entrega.</span>
        </p>
        
        <div className="flex flex-col gap-4 justify-center items-center">
          <button 
            onClick={() => {
              const waLink = generateWhatsAppLink(orderComplete, formData.phone, finalTotal, items, formData.address, 'Pendiente', deliveryFee, formData.notes);
              window.open(waLink, '_blank');
            }}
            className="w-full sm:w-auto bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
          >
            <MessageCircle size={24} />
            Enviar Factura por WhatsApp
          </button>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
            <button 
              onClick={() => navigate(`/orders/${orderComplete}`)}
              className="bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              Ver estado del pedido
            </button>
            <button 
              onClick={() => navigate('/')}
              className="bg-white border border-slate-200 text-slate-500 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-12">
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-900">Finalizar Pedido</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Phone size={20} className="text-primary" />
              Contacto y Entrega
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Teléfono de contacto</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  placeholder="6000-0000"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Zona de Entrega</label>
                <select
                  required
                  value={formData.deliveryZone}
                  onChange={(e) => setFormData({ ...formData, deliveryZone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none"
                >
                  <option value="">Selecciona tu zona...</option>
                  {deliveryZones.map(zone => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} ({total >= 15 ? 'GRATIS' : formatCurrency(zone.price)})
                    </option>
                  ))}
                </select>
                {nearestStore && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <ShoppingBag size={16} className="text-purple-600" />
                    <p className="text-xs font-bold text-purple-700">
                      Tienda más cercana: <span className="font-black">{nearestStore.name}</span> ({nearestStore.distance.toFixed(2)} km)
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Dirección y Referencias</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                  placeholder="Ej: Casa verde frente al parque..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Comentarios o Notas (Opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                  placeholder="Ej: Tocar el timbre fuerte, dejar en garita..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Método de Pago
            </h2>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'Efectivo', icon: Banknote, label: 'Efectivo' },
                { id: 'Transferencia', icon: Wallet, label: 'Transf.' },
                { id: 'Yappy', icon: CreditCard, label: 'Yappy' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                    formData.paymentMethod === method.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <method.icon size={24} />
                  <span className="text-xs font-bold">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              Tu Ubicación Exacta
              {geocoding && <span className="text-xs font-normal text-slate-400 animate-pulse">(Detectando zona...)</span>}
            </h2>
            <p className="text-sm text-slate-500">Haz clic en el mapa para marcar el punto de entrega o usa el botón de abajo.</p>
            
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gettingLocation}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold ${
                position 
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50' 
                  : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
              }`}
            >
              <Navigation size={18} className={gettingLocation ? 'animate-spin' : ''} />
              {gettingLocation ? 'Obteniendo...' : position ? 'Ubicación Detectada ✓' : 'Usar mi ubicación actual'}
            </button>

            <div className="h-[300px] rounded-2xl overflow-hidden border border-slate-100 relative">
              {geocoding && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-[1000] flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-primary animate-bounce">
                    Detectando zona...
                  </div>
                </div>
              )}
              <MapContainer center={[8.9824, -79.5199]} zoom={13} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker position={position} setPosition={setPosition} onLocationSelect={handleLocationSelect} />
                <MapController position={position} />
              </MapContainer>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar Pedido'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>
      </div>

      <div className="lg:sticky lg:top-24 h-fit">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
          <h2 className="text-2xl font-black mb-8">Resumen del Pedido</h2>
          
          <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="font-bold text-white">{item.product.name}</p>
                  <p className="text-slate-400 text-sm">
                    {item.quantity} {item.product.type === 'libra' ? 'lb' : ''} x {formatCurrency(item.product.price)}
                  </p>
                </div>
                <p className="font-bold text-primary-light">{formatCurrency(item.product.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-bold text-white">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Entrega</span>
              <span className={deliveryFee === 0 ? "text-primary-light font-bold" : "font-bold text-white"}>
                {deliveryFee === 0 ? 'GRATIS' : formatCurrency(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="text-xl font-bold">Total a pagar</span>
              <span className="text-3xl font-black text-primary-light">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary-light flex-shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Pedido Seguro</p>
              <p className="text-xs text-slate-400">Tu pedido será procesado y enviado a la brevedad posible.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
