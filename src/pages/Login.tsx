import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Leaf, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const savedIdentifier = localStorage.getItem('remembered_identifier');
    if (savedIdentifier) {
      setEmail(savedIdentifier);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let loginEmail = email;

      // Check if the input is a phone number (no @ and contains digits)
      if (!email.includes('@')) {
        // Assume it's a phone number, try to find the email using RPC
        const { data: profileEmail, error: profileError } = await supabase
          .rpc('get_email_by_phone', { phone_input: email });

        if (profileError) throw profileError;
        if (!profileEmail) {
          throw new Error('No se encontró una cuenta con ese número de celular');
        }
        loginEmail = profileEmail;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) throw error;

      if (rememberMe) {
        localStorage.setItem('remembered_identifier', email);
      } else {
        localStorage.removeItem('remembered_identifier');
      }

      toast.success('¡Bienvenido de nuevo!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor ingresa tu correo electrónico o celular');
      return;
    }
    setLoading(true);

    try {
      let resetEmail = email;

      if (!email.includes('@')) {
        const { data: profileEmail, error: profileError } = await supabase
          .rpc('get_email_by_phone', { phone_input: email });

        if (profileError) throw profileError;
        if (!profileEmail) {
          throw new Error('No se encontró una cuenta con ese número de celular');
        }
        resetEmail = profileEmail;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success(`Se ha enviado un correo a ${resetEmail} para restablecer tu contraseña`);
      setResetMode(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar el correo de restablecimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
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
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            {resetMode ? 'Recuperar Contraseña' : 'Ingresar'}
          </h1>
          <p className="text-slate-500">
            {resetMode 
              ? 'Te enviaremos un enlace para restablecer tu contraseña' 
              : '¡Qué bueno verte de nuevo!'}
          </p>
        </div>

        <form onSubmit={resetMode ? handleResetPassword : handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Email o Celular</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none"
                placeholder="tu@email.com o 6000-0000"
              />
            </div>
          </div>

          {!resetMode && (
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-slate-700">Contraseña</label>
                <button 
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          )}

          {!resetMode && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
              />
              <label htmlFor="rememberMe" className="text-sm font-bold text-slate-600 cursor-pointer">
                Recordarme
              </label>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading 
                ? (resetMode ? 'Enviando...' : 'Ingresando...') 
                : (resetMode ? 'Enviar Enlace' : 'Iniciar Sesión')}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            {resetMode && (
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            )}
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
