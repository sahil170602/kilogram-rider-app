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

  // 🎯 RESTORE: Fetch from 'rider_profiles'
  const restoreRiderData = useCallback(async (userId: string) => {
    setIsSyncing(true);
    try {
      // 1. Fetch Profile safely
      const { data: profiles, error: pError } = await supabase
        .from('rider_profiles')
        .select('*')
        .eq('id', userId);

      if (pError) throw pError;

      if (!profiles || profiles.length === 0) {
        console.warn("No rider profile row found.");
        return null;
      }

      const profile = profiles[0];

      // 2. Fetch Orders for this rider
      const { data: orders, error: oError } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', userId)
        .order('created_at', { ascending: false });

      if (oError) throw oError;

      // 3. Calculate Earnings
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
      console.error("Error restoring rider data:", error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const data = await restoreRiderData(session.user.id);
        if (data) setStage('dashboard');
        else setStage('login');
      } else {
        const saved = localStorage.getItem('kilo_rider_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          setRider(parsed);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const data = await restoreRiderData(session.user.id);
        if (data) setStage('dashboard');
        else setStage('login');
      } else {
        setRider(null);
        setStage('login');
      }
    });

    return () => subscription.unsubscribe();
  }, [restoreRiderData]);

  const handleSplashComplete = () => {
    if (rider && rider.id) {
      setStage('dashboard');
    } else {
      setStage('login');
    }
  };

  const handleLogin = async (riderData: any) => {
    // Save minimal data and trigger full sync
    setRider(riderData);
    const syncedData = await restoreRiderData(riderData.id);
    if (syncedData) {
      setStage('dashboard');
    } else {
      setStage('dashboard'); // Still enter dashboard if just registered
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
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Syncing Profile...</p>
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