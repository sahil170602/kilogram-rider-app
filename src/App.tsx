// Inside your rider-app/src/App.tsx

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SplashScreen from './components/SplashScreen';
import LoginPage from './pages/LoginPage';
import RiderDashboard from './pages/RiderDashboard';

function App() {
  const [stage, setStage] = useState<'loading' | 'login' | 'dashboard'>('loading');
  const [rider, setRider] = useState<any>(null);

  useEffect(() => {
    // 🎯 Check for existing session
    const checkSession = () => {
      const savedRider = localStorage.getItem('kilo_rider_session');
      if (savedRider) {
        try {
          setRider(JSON.parse(savedRider));
          // Don't set stage to dashboard yet, let the splash screen handle it
        } catch (e) {
          localStorage.removeItem('kilo_rider_session');
        }
      }
    };
    checkSession();
  }, []);

  const handleSplashComplete = () => {
    // Logic: If rider state is set from useEffect, go dashboard, else login
    if (rider) setStage('dashboard');
    else setStage('login');
  };

  const handleLogin = (riderData: any) => {
    setRider(riderData);
    // 🎯 PERSISTENCE: Save to localStorage
    localStorage.setItem('kilo_rider_session', JSON.stringify(riderData));
    setStage('dashboard');
  };

  const handleLogout = () => {
    // 🎯 CLEAR PERSISTENCE
    localStorage.removeItem('kilo_rider_session');
    setRider(null);
    setStage('login');
  };

  return (
    <div className="bg-[#08080a] min-h-screen text-white font-sans lowercase">
      <AnimatePresence mode="wait">
        {stage === 'loading' && (
          <motion.div key="splash" exit={{ opacity: 0, scale: 1.1 }}>
            <SplashScreen onComplete={handleSplashComplete} />
          </motion.div>
        )}

        {stage === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <LoginPage onLogin={handleLogin} />
          </motion.div>
        )}

        {stage === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <RiderDashboard rider={rider} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;