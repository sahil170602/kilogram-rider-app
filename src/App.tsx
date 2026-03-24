import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import SplashScreen from './components/SplashScreen';
import LoginPage from './pages/LoginPage';
import RiderDashboard from './pages/RiderDashboard';

function App() {
  const [stage, setStage] = useState<'loading' | 'login' | 'dashboard'>('loading');
  const [rider, setRider] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const restoreRiderData = useCallback(async (userId: string) => {
    if (!userId) return null;
    setIsSyncing(true);
    try {
      const { data: profiles, error: pError } = await supabase
        .from('rider_profiles')
        .select('*')
        .eq('id', userId);

      if (pError || !profiles || profiles.length === 0) return null;

      const profile = profiles[0];
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', userId)
        .order('created_at', { ascending: false });

      const totalEarnings = orders
        ?.filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (Number(o.total_amount) * 0.1), 0) || 0;

      const fullRiderData = {
        ...profile,
        name: profile.full_name,
        bike: profile.vehicle_number,
        phone: profile.phone_number,
        orders: orders || [],
        earnings: totalEarnings,
        lastSynced: new Date().toISOString()
      };

      setRider(fullRiderData);
      
      try {
        localStorage.setItem('kilo_rider_session', JSON.stringify(fullRiderData));
      } catch (e) {
        console.warn("LocalStorage save failed", e);
      }
      
      return fullRiderData;
    } catch (error) {
      console.error("Sync Error:", error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 🎯 Check if Supabase client is actually valid
        if (!supabase) throw new Error("Supabase client failed to initialize");

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const session = data?.session;
        
        if (session?.user) {
          const syncedData = await restoreRiderData(session.user.id);
          if (syncedData) {
            setRider(syncedData);
            // If already have data, skip splash if needed or wait for it
          }
        } else {
          const saved = localStorage.getItem('kilo_rider_session');
          if (saved) setRider(JSON.parse(saved));
        }
      } catch (e: any) {
        console.error("Auth init failed", e);
        setInitError(e.message || "Connection Error");
      } finally {
        setAuthChecked(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await restoreRiderData(session.user.id);
        setStage('dashboard');
      } else if (event === 'SIGNED_OUT') {
        setRider(null);
        localStorage.removeItem('kilo_rider_session');
        setStage('login');
      }
    });

    return () => subscription.unsubscribe();
  }, [restoreRiderData]);

  const handleSplashComplete = useCallback(() => {
  setStage(rider ? 'dashboard' : 'login');
}, [rider]);

  const handleLogin = async (riderData: any) => {
    setRider(riderData);
    await restoreRiderData(riderData.id);
    setStage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('kilo_rider_session');
    setRider(null);
    setStage('login');
  };

  return (
    <div className="bg-[#08080a] min-h-screen text-white font-sans selection:bg-primary/30">
      
      {/* 🎯 DEBUG OVERLAY (Visible only during Red Screen state) */}
      {!authChecked && (
        <div className="fixed top-2 left-2 z-[9999] text-[8px] opacity-30 pointer-events-none">
          Checking Auth... {initError && `Error: ${initError}`}
        </div>
      )}

      {isSyncing && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Restoring Profile...</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {stage === 'loading' && (
          <motion.div 
            key="splash" 
            exit={{ opacity: 0, scale: 1.1 }} 
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <SplashScreen onComplete={handleSplashComplete} />
          </motion.div>
        )}

        {stage === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginPage onLogin={handleLogin} />
          </motion.div>
        )}

        {stage === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <RiderDashboard rider={rider} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎯 EMERGENCY ESCAPE: If stuck on splash/loading for > 8s */}
      {stage === 'loading' && authChecked && (
          <button 
            onClick={handleSplashComplete}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-tighter opacity-20 hover:opacity-100 transition-opacity"
          >
            Skip Loading
          </button>
      )}
    </div>
  );
}

export default App;