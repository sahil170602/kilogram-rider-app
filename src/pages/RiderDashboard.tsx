import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { 
  MapPin, Phone, CheckCircle, Navigation, Bike, Loader2, LogOut, Check, Wallet,
  Zap, Clock, ShieldCheck, BellRing, ChevronRight, PackageCheck, Truck, AlertTriangle,
  Power, PowerOff, Map
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RiderDashboard = ({ rider, onLogout }: { rider: any, onLogout: () => void }) => {
  // --- UI & NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [isOnline, setIsOnline] = useState(rider?.is_active ?? true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // --- DATA STATE ---
  const [myTask, setMyTask] = useState<any | null>(null);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState({ address: "", lat: 0, lng: 0 });
  
  // --- NOTIFICATION & GEO STATE ---
  const [geoError, setGeoError] = useState<{show: boolean, msg: string} | null>(null);
  const [incomingAssignment, setIncomingAssignment] = useState<any | null>(null);
  const beepIntervalRef = useRef<any>(null);

  // --- 🎯 CORE: FETCH RIDER DATA ---
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

  // 🎯 CUSTOM LOGIC: Confirm pickup (Used when admin has packed the order)
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

  const openMaps = (addr: string) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex flex-col font-sans lowercase no-scrollbar">
      
      {actionLoading && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      <AnimatePresence>
        {incomingAssignment && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[500] bg-primary flex flex-col items-center justify-center p-10 text-black text-center">
            <BellRing size={80} className="mb-6 animate-bounce" />
            <h2 className="text-5xl font-black tracking-tighter uppercase italic leading-none mb-10">Dispatch<br/>Received</h2>
            
            <div className="bg-black/5 p-8 rounded-[2.5rem] w-full max-w-xs mb-10 border border-black/10">
                <p className="text-3xl font-black italic mb-2">₹{incomingAssignment.total_amount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{incomingAssignment.address}</p>
            </div>

            <div className="flex flex-col w-full max-w-xs">
              <button onClick={handleAccept} className="w-full h-20 bg-black text-white rounded-[2rem] font-black uppercase text-xl tracking-widest active:scale-95 shadow-2xl transition-all">Accept Order</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-8 pt-16 pb-10 bg-[#0c0c0f] border-b border-white/5 sticky top-0 z-50 text-left">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all ${isOnline ? 'bg-primary/10 text-primary border-2 border-primary/20 shadow-[0_0_30px_rgba(255,153,193,0.1)]' : 'bg-white/5 text-white/20'}`}>
              <Bike size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter italic">{rider?.full_name || 'Partner'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{isOnline ? 'online' : 'offline'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
              <button onClick={toggleOnlineStatus} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                {isOnline ? <Power size={20} className="text-red-500" /> : <PowerOff size={20} className="text-green-500" />}
              </button>
              <button onClick={onLogout} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center"><LogOut size={20} className="opacity-40" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.2rem] p-7">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Earnings</p>
            <p className="text-3xl font-black italic text-primary">₹{rider?.earnings || 0}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.2rem] p-7">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Success</p>
            <p className="text-3xl font-black italic">{completedOrders.length}</p>
          </div>
        </div>
      </header>

      <nav className="flex p-6 gap-3 bg-[#08080a] sticky top-[280px] z-40">
        <button onClick={() => setActiveTab('live')} className={`flex-1 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-primary text-black' : 'bg-white/5 text-white/20'}`}>live task</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-black' : 'bg-white/5 text-white/20'}`}>history</button>
      </nav>

      <main className="flex-1 px-6 pb-20 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'live' && (
            <motion.div key="live" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
              {!isOnline ? (
                <div className="py-24 text-center opacity-20"><PowerOff size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] tracking-widest">system offline</p></div>
              ) : !myTask ? (
                <div className="py-24 text-center space-y-4">
                    <Clock size={40} className="mx-auto text-white/10 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Awaiting dispatch...</p>
                </div>
              ) : (
                <motion.div layout className="bg-[#12121a] border-2 border-primary/30 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden text-left">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-pulse" />
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-2">
                            <span className="bg-primary/10 text-primary text-[9px] font-black uppercase px-2 py-1 rounded">{myTask.status}</span>
                            <h3 className="text-3xl font-black italic tracking-tighter text-white">{myTask.user_name}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">To Collect</p>
                            <p className="text-3xl font-black italic text-primary">₹{myTask.total_amount}</p>
                        </div>
                    </div>

                    {/* 🎯 MAP BUTTON: Logic changes based on pickup status */}
                    <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 flex items-start gap-5 mb-10" 
                         onClick={() => openMaps(myTask.status === 'order dispatched' ? myTask.address : storeInfo.address)}>
                        <MapPin size={24} className="text-primary shrink-0 mt-1" />
                        <div className="flex flex-col">
                            <p className="text-[10px] font-black uppercase text-white/20 mb-1">
                                {myTask.status === 'order dispatched' ? 'drop-off location' : 'pickup from hub'}
                            </p>
                            <p className="text-sm font-bold leading-relaxed opacity-80">
                                {myTask.status === 'order dispatched' ? myTask.address : storeInfo.address}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {myTask.status === 'order placed' || myTask.status === 'rider_assigned' || myTask.status === 'order packed' ? (
                           <div className="flex flex-col items-center">
                                <p className="text-[10px] font-bold text-white/20 mb-8 uppercase tracking-widest italic text-center">
                                    {myTask.status === 'order packed' ? 'order is packed! collect from hub.' : 'awaiting store preparation...'}
                                </p>
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <button onClick={() => openMaps(storeInfo.address)} className="py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-3">
                                        <Navigation size={18} /> Store location
                                    </button>
                                    <button 
                                        onClick={handleConfirmPickup}
                                        disabled={myTask.status !== 'order packed'}
                                        className={`py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${myTask.status === 'order packed' ? 'bg-primary text-black' : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'}`}>
                                        <Truck size={18} /> Picked order
                                    </button>
                                </div>
                           </div>
                        ) : (
                           <div className="space-y-6">
                             <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => openMaps(myTask.address)} className="h-16 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"><Navigation size={18} /> User Navigation</button>
                                <a href={`tel:${myTask.user_phone}`} className="h-16 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"><Phone size={18} /> Call User</a>
                             </div>
                             <button onClick={handleComplete} className="w-full py-6 bg-white text-black rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-4 shadow-xl active:scale-[0.98]">
                               <CheckCircle size={24} /> Complete Delivery
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
                  <div key={order.id} className="bg-white/[0.02] border border-white/5 rounded-[2.2rem] p-7 flex items-center justify-between text-left">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center"><Check size={24} strokeWidth={3} /></div>
                      <div>
                        <p className="text-lg font-black italic tracking-tighter text-white/90">{order.user_name || 'customer node'}</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">collected ₹{order.total_amount}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/10" />
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default RiderDashboard;