import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bike, Zap } from "lucide-react";

interface SplashProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#08080a] flex flex-col items-center justify-center overflow-hidden z-[1000]">
      {/* Background Glow */}
      <div className="absolute w-64 h-64 bg-primary/10 blur-[120px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative flex flex-col items-center">
        {/* Animated Icon Container */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 0.2 
          }}
          className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center text-black shadow-[0_0_50px_rgba(255,153,193,0.3)] mb-8"
        >
          <Bike size={48} strokeWidth={2.5} />
          
          {/* Speed Lines */}
          <motion.div 
            animate={{ x: [0, -10, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="absolute -left-8 flex flex-col gap-2"
          >
            <div className="h-1 w-6 bg-primary/40 rounded-full" />
            <div className="h-1 w-4 bg-primary/20 rounded-full" />
          </motion.div>
        </motion.div>

        {/* Text Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-black tracking-tighter italic text-white flex items-center gap-2">
            KILO <span className="text-primary">PARTNER</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2 opacity-40">
            <Zap size={12} className="text-primary fill-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Logistics Network</p>
          </div>
        </motion.div>
      </div>

      {/* Loading Progress Bar */}
      <div className="absolute bottom-20 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="h-full bg-primary"
        />
      </div>
    </div>
  );
};

export default SplashScreen;