import { useState } from "react";
import { Bike, ArrowRight, Loader2, Smartphone, User, CheckCircle, ShieldCheck, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

interface LoginProps {
  onLogin: (userData: any) => void;
}

const LoginPage = ({ onLogin }: LoginProps) => {
  const [stage, setStage] = useState<'phone' | 'info'>('phone');
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [bikeNumber, setBikeNumber] = useState(""); // 🎯 New State
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rider_profiles')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle();

      if (data) {
        onLogin(data); // Restore session
      } else {
        setStage('info'); // New Registration
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rider_profiles')
        .insert([{ 
            phone_number: phone, 
            full_name: fullName.toLowerCase(),
            vehicle_number: bikeNumber.toUpperCase() // 🎯 Save Bike No
        }])
        .select()
        .single();

      if (error) throw error;
      onLogin(data);
    } catch (err: any) {
      alert("Registration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08080a] text-white font-sans lowercase">
      <main className="flex-1 flex flex-col justify-center px-8 w-full max-w-[400px] mx-auto">
        
        <header className="mb-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-primary/10 border-2 border-primary/20 rounded-[2.5rem] flex items-center justify-center text-primary mb-6 shadow-[0_0_40px_rgba(255,153,193,0.1)] relative">
            <Bike size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic leading-none">
            KILO <span className="text-primary">PARTNER</span>
          </h1>
          <p className="mt-3 text-white/40 font-bold uppercase text-[9px] tracking-[0.3em]">
             {stage === 'phone' ? 'Secure Login Node' : 'Partner Registration'}
          </p>
        </header>

        <AnimatePresence mode="wait">
          {stage === 'phone' ? (
            <motion.form 
              key="phone-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePhoneSubmit} className="flex flex-col gap-4"
            >
              <div className="relative group">
                <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="tel" required placeholder="enter phone number"
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 font-bold text-sm outline-none focus:border-primary/50 transition-all"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button disabled={loading || phone.length < 10} className="w-full bg-white text-black h-16 rounded-3xl mt-2 font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <>CONTINUE <ArrowRight size={20}/></>}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="info-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRegistration} className="flex flex-col gap-4"
            >
              {/* Full Name Input */}
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text" required placeholder="your full name"
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 font-bold text-sm outline-none focus:border-primary/50 transition-all"
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* Bike Number Input 🎯 */}
              <div className="relative group">
                <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="text" required placeholder="bike number (e.g. MH 31 AB 1234)"
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 font-bold text-sm outline-none focus:border-primary/50 transition-all uppercase"
                  value={bikeNumber} onChange={(e) => setBikeNumber(e.target.value)}
                />
              </div>

              <p className="text-[10px] text-white/30 font-bold uppercase px-2">verify your details to join the network</p>
              
              <button disabled={loading || fullName.length < 3 || bikeNumber.length < 4} className="w-full bg-primary text-black h-16 rounded-3xl mt-2 font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20 transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <>COMPLETE SETUP <CheckCircle size={20}/></>}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <footer className="mt-12 text-center">
            <div className="flex items-center justify-center gap-2 text-white/20 mb-1">
                <ShieldCheck size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">End-to-end encrypted node</span>
            </div>
        </footer>
      </main>
    </div>
  );
};

export default LoginPage;