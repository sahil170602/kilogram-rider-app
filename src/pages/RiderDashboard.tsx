import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { 
  MapPin, Phone, CheckCircle, Navigation, Bike, Loader2, LogOut, Check, 
  Power, PowerOff, Clock, BellRing, ChevronRight, Truck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RiderDashboard = ({ rider, onLogout }: { rider: any, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [isOnline, setIsOnline] = useState(rider?.is_active ?? true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [myTask, setMyTask] = useState<any | null>(null);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState({ address: "", lat: 0, lng: 0 });
  
  const [incomingAssignment, setIncomingAssignment] = useState<any | null>(null);
  const beepIntervalRef = useRef<any>(null);

  const fetchRiderData = useCallback(async () => {
    if (!rider?.id) return;
    try {
      const { data: storeData } = await supabase
        .from('store_settings')
        .select('store_address, lat, lng')
        .limit(1)
        .maybeSingle();
      
      if (storeData) {
        setStoreInfo({ 
          address: storeData.store_address, 
          lat: storeData.lat, 
          lng: storeData.lng 
        });
      }

      const { data: active } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', rider.id)
        .in('status', ['order placed', 'order packed', 'order dispatched', 'rider_assigned'])
        .maybeSingle();

      const { data: history } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', rider.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      setMyTask(active);
      setCompletedOrders(history || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [rider?.id]);

  useEffect(() => {
    fetchRiderData();
    const riderChannel = supabase.channel(`rider-${rider.id}-sync`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `rider_id=eq.${rider.id}` 
      }, (payload: any) => {
        if (payload.new && payload.new.status === 'rider_assigned') {
          setIncomingAssignment(payload.new);
          startBeep();
        }
        fetchRiderData();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(riderChannel); 
      stopBeep();
    };
  }, [rider.id, fetchRiderData]);

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await supabase.from('rider_profiles').update({ is_active: newStatus }).eq('id', rider.id);
  };

  const handleAccept = async () => {
    if (!incomingAssignment) return;
    setActionLoading(true);
    stopBeep();
    const orderId = incomingAssignment.id;
    setIncomingAssignment(null);
    await supabase.from('orders').update({ status: 'order placed' }).eq('id', orderId);
    await supabase.from('rider_profiles').update({ is_busy: true }).eq('id', rider.id);
    await fetchRiderData();
    setActionLoading(false);
  };

  const handleConfirmPickup = async () => {
    if (!myTask) return;
    setActionLoading(true);
    await supabase.from('orders').update({ status: 'order dispatched' }).eq('id', myTask.id);
    await fetchRiderData();
    setActionLoading(false);
  };

  const handleComplete = async () => {
    if (!myTask) return;
    setActionLoading(true);
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', myTask.id);
    await supabase.from('rider_profiles').update({ is_busy: false }).eq('id', rider.id);
    fetchRiderData();
    setActionLoading(false);
  };

  const startBeep = () => {
    if (beepIntervalRef.current) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    beepIntervalRef.current = setInterval(() => {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    }, 800);
  };

  const stopBeep = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  const openMaps = (addr: string) => {
  const encodedAddr = encodeURIComponent(addr);
  
  // 1. Detect if the user is on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // 📱 ON PHONE: Use the native 'geo:' scheme to force the Maps App open
    window.location.href = `geo:0,0?q=${encodedAddr}`;
  } else {
    // 💻 ON PC: Open the standard Google Maps website in a new tab
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddr}`, '_blank');
  }
};

  return (
    // 🎯 FIX: h-[100dvh] ensures it uses exact mobile height, stopping address bar scroll issues
    <div className="h-[100dvh] bg-[#08080a] text-white flex flex-col font-sans lowercase overflow-hidden">  
      {actionLoading && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      <AnimatePresence>
        {incomingAssignment && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[1100] bg-primary flex flex-col items-center justify-center p-10 text-black text-center">
            <BellRing size={80} className="mb-6 animate-bounce" />
            <h2 className="text-5xl font-black tracking-tighter uppercase italic leading-none mb-10">Dispatch<br/>Received</h2>
            <div className="bg-black/5 p-8 rounded-[2.5rem] w-full max-w-xs mb-10 border border-black/10">
                <p className="text-3xl font-black italic mb-2">₹{incomingAssignment.total_amount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{incomingAssignment.address}</p>
            </div>
            <button onClick={handleAccept} className="w-full max-w-xs h-20 bg-black text-white rounded-[2rem] font-black uppercase text-xl tracking-widest shadow-2xl transition-all active:scale-95">Accept Order</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎯 HEADER (Shrink-0 prevents it from squishing) */}
      <header className="px-6 pt-12 pb-6 bg-[#0c0c0f] border-b border-white/5 flex items-center justify-between shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${isOnline ? 'bg-primary/10 text-primary border-2 border-primary/20 shadow-[0_0_20px_rgba(255,153,193,0.1)]' : 'bg-white/5 text-white/20'}`}>
            <Bike size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter italic leading-none mb-1">{rider?.full_name || 'Partner'}</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{isOnline ? 'online' : 'offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={toggleOnlineStatus} className="w-12 h-12 rounded-[1.2rem] bg-white/5 border border-white/5 flex items-center justify-center active:scale-95 transition-all">
              {isOnline ? <Power size={18} className="text-red-500" /> : <PowerOff size={18} className="text-green-500" />}
            </button>
            <button onClick={onLogout} className="w-12 h-12 rounded-[1.2rem] bg-white/5 border border-white/5 flex items-center justify-center active:scale-95 transition-all"><LogOut size={18} className="opacity-40" /></button>
        </div>
      </header>

      {/* 🎯 MAIN SCROLLABLE BODY */}
      <main className="flex-1 overflow-y-auto touch-pan-y no-scrollbar scroll-smooth relative w-full">
        
        {/* STATS MOVED HERE */}
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Earnings</p>
            <p className="text-2xl font-black italic text-primary">₹{Number(rider?.earnings || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Success</p>
            <p className="text-2xl font-black italic">{completedOrders.length}</p>
          </div>
        </div>

        {/* STICKY TABS */}
        <nav className="flex px-6 pb-4 gap-3 bg-[#08080a]/90 backdrop-blur-xl sticky top-0 z-40 border-b border-white/5 pt-2">
          <button onClick={() => setActiveTab('live')} className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-white/5 text-white/20'}`}>live task</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-white/5 text-white/20'}`}>history</button>
        </nav>

        {/* CONTENT AREA (pb-32 ensures bottom buttons are fully visible) */}
        <div className="px-6 pt-6 pb-32">
          <AnimatePresence mode="wait">
            {activeTab === 'live' && (
              <motion.div key="live" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                {!isOnline ? (
                  <div className="py-20 text-center opacity-20"><PowerOff size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] tracking-widest">system offline</p></div>
                ) : !myTask ? (
                  <div className="py-20 text-center space-y-4">
                      <Clock size={40} className="mx-auto text-white/10 animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Awaiting dispatch...</p>
                  </div>
                ) : (
                  <motion.div layout className="bg-[#12121a] border-2 border-primary/30 rounded-[2.5rem] p-7 shadow-2xl relative overflow-hidden text-left">
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
                      <div className="flex justify-between items-start mb-8">
                          <div className="space-y-2">
                              <span className="bg-primary/10 text-primary text-[8px] font-black uppercase px-2 py-1 rounded">{myTask.status}</span>
                              <h3 className="text-2xl font-black italic tracking-tight text-white">{myTask.user_name}</h3>
                          </div>
                          <div className="text-right">
                              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">To Collect</p>
                              <p className="text-2xl font-black italic text-primary">₹{myTask.total_amount}</p>
                          </div>
                      </div>

                      <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 flex items-start gap-4 mb-8" 
                           onClick={() => openMaps(myTask.status === 'order dispatched' ? myTask.address : storeInfo.address)}>
                          <MapPin size={22} className="text-primary shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                              <p className="text-[9px] font-black uppercase text-white/30 mb-1">
                                  {myTask.status === 'order dispatched' ? 'User navigation active' : 'Hub location active'}
                              </p>
                              <p className="text-xs font-bold leading-relaxed opacity-90">
                                  {myTask.status === 'order dispatched' ? myTask.address : storeInfo.address}
                              </p>
                          </div>
                      </div>

                      <div className="space-y-5">
                          {['order placed', 'rider_assigned', 'order packed'].includes(myTask.status) ? (
                             <div className="flex flex-col items-center">
                                  <p className="text-[9px] font-bold text-white/40 mb-6 uppercase tracking-widest italic text-center">
                                      {myTask.status === 'order packed' ? 'Admin packed order! confirm pickup.' : 'Store is preparing items...'}
                                  </p>
                                  <div className="grid grid-cols-2 gap-3 w-full">
                                      <button onClick={() => openMaps(storeInfo.address)} className="py-4 bg-white/5 border border-white/10 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2 active:scale-95 transition-all">
                                          <Navigation size={16} /> Store
                                      </button>
                                      <button 
                                          onClick={handleConfirmPickup}
                                          disabled={myTask.status !== 'order packed'}
                                          className={`py-4 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${myTask.status === 'order packed' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'}`}>
                                          <Truck size={16} /> Picked
                                      </button>
                                  </div>
                             </div>
                          ) : (
                             <div className="space-y-5">
                               <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => openMaps(myTask.address)} className="h-14 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-[1.2rem] font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    <Navigation size={16} /> Maps
                                  </button>
                                  <a href={`tel:${myTask.user_phone}`} className="h-14 bg-green-500/10 text-green-400 border border-green-500/20 rounded-[1.2rem] font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    <Phone size={16} /> Call
                                  </a>
                               </div>
                               <button onClick={handleComplete} className="w-full h-16 bg-white text-black rounded-[1.2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                                 <CheckCircle size={20} /> Complete Delivery
                               </button>
                             </div>
                          )}
                      </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                {completedOrders.length === 0 ? (
                  <div className="py-24 text-center opacity-10 uppercase font-black text-[10px] tracking-[0.5em]">no logs found</div>
                ) : (
                  completedOrders.map((order) => (
                    <div key={order.id} className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-5 flex items-center justify-between text-left shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-[1rem] flex items-center justify-center"><Check size={20} strokeWidth={3} /></div>
                        <div>
                          <p className="text-base font-black italic tracking-tight text-white/90">{order.user_name || 'customer node'}</p>
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">collected ₹{order.total_amount}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/10" />
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default RiderDashboard;