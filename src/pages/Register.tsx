import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { User, Mail, Lock, Phone, MapPin, ArrowRight, Leaf, Navigation, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    lat: null as number | null,
    lng: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleGetLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es compatible con tu navegador');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast.success('Ubicación obtenida correctamente');
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('No se pudo obtener la ubicación. Por favor, actívala en tu navegador.');
        setGettingLocation(false);
      }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Check if phone already exists in profiles
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', formData.phone)
        .maybeSingle();

      if (phoneCheckError) throw phoneCheckError;
      if (existingPhone) {
        throw new Error('Este número de teléfono ya está registrado. Por favor usa otro o inicia sesión.');
      }

      // 2. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este correo electrónico ya está registrado. Por favor usa otro o inicia sesión.');
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          role: 'client',
          lat: formData.lat,
          lng: formData.lng
        });

      if (profileError) throw profileError;

      setShowConfirmation(true);
      toast.success('¡Cuenta creada con éxito!');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">¡Felicidades! 🎉</h1>
          <p className="text-slate-600 mb-8 text-lg">
            Tu cuenta ha sido creada con éxito. Para comenzar a disfrutar de RECADITO, 
            <strong> por favor verifica tu correo electrónico</strong>.
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl mb-8 text-left border border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed">
              Hemos enviado un enlace de activación a: <br/>
              <strong className="text-slate-900">{formData.email}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-4 italic">
              * Si no lo ves, revisa tu carpeta de spam o correo no deseado.
            </p>
            <p className="text-xs text-primary font-bold mt-4 text-center">
              ¿No recibiste el correo? Intenta registrarte de nuevo o contacta a soporte.
            </p>
          </div>
          <Link 
            to="/login" 
            className="inline-block w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 mb-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-32 h-32 cursor-pointer"
            >
              <img 
                src="/logo.png" 
                alt="RECADITO Logo" 
                className="w-full h-full object-contain drop-shadow-2xl"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3724/3724720.png';
                }}
              />
            </motion.div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Crear Cuenta</h1>
          <p className="text-slate-500">Únete a la familia RECADITO</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                placeholder="Juan Pérez"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                placeholder="6000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Dirección (Opcional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                placeholder="Calle 50, Edificio..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Ubicación para Tienda Cercana</label>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gettingLocation}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold ${
                formData.lat 
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50' 
                  : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
              }`}
            >
              <Navigation size={18} className={gettingLocation ? 'animate-spin' : ''} />
              {gettingLocation ? 'Obteniendo...' : formData.lat ? 'Ubicación Guardada ✓' : 'Usar mi ubicación actual'}
            </button>
            <p className="text-[10px] text-slate-400 italic text-center">
              * Esto nos ayuda a asignarte la tienda más cercana automáticamente.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
