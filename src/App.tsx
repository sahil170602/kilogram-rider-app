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
  const [authChecked, setAuthChecked] = useState(false); // 🎯 CRITICAL: Track if auth check finished

  const restoreRiderData = useCallback(async (userId: string) => {
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
      localStorage.setItem('kilo_rider_session', JSON.stringify(fullRiderData));
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
      // 🎯 1. Check Supabase session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const data = await restoreRiderData(session.user.id);
        if (data) {
           setRider(data);
        }
      } else {
        // 🎯 2. If no session, check localStorage as backup
        const saved = localStorage.getItem('kilo_rider_session');
        if (saved) setRider(JSON.parse(saved));
      }
      
      setAuthChecked(true); // 🎯 Auth process finished
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const data = await restoreRiderData(session.user.id);
        if (data) setStage('dashboard');
      } else if (event === 'SIGNED_OUT') {
        setRider(null);
        localStorage.removeItem('kilo_rider_session');
        setStage('login');
      }
    });

    return () => subscription.unsubscribe();
  }, [restoreRiderData]);

  const handleSplashComplete = () => {
    // 🎯 If auth check is still running, don't leave splash yet
    if (!authChecked) return;

    if (rider) {
      setStage('dashboard');
    } else {
      setStage('login');
    }
  };

  const handleLogin = async (riderData: any) => {
    setRider(riderData);
    const syncedData = await restoreRiderData(riderData.id);
    if (syncedData) {
      setStage('dashboard');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('kilo_rider_session');
    setRider(null);
    setStage('login');
  };

  return (
    <div className="bg-[#08080a] min-h-screen text-white font-sans lowercase selection:bg-primary/30">
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
          <motion.div key="splash" exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.5 }}>
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
    </div>
  );
}

export default App;