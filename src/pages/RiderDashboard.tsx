import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { 
  MapPin, 
  Phone, 
  CheckCircle, 
  Navigation, 
  Bike, 
  History, 
  Loader2, 
  LogOut, 
  Check,
  Wallet,
  Zap, 
  Clock, 
  ShieldCheck, 
  BellRing, 
  ChevronRight,
  PackageCheck, 
  Truck,
  AlertTriangle,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RiderDashboard = ({ rider, onLogout }: { rider: any, onLogout: () => void }) => {
  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  // --- DATA STATE ---
  const [myTask, setMyTask] = useState<any | null>(null);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState({ address: "", lat: 0, lng: 0 });
  
  // --- NOTIFICATION & ERROR STATE ---
  const [geoError, setGeoError] = useState<{show: boolean, msg: string} | null>(null);
  const [incomingAssignment, setIncomingAssignment] = useState<any | null>(null);
  const beepIntervalRef = useRef<any>(null);

  // --- LIFECYCLE: REAL-TIME SYNC ---
  useEffect(() => {
    fetchRiderData();

    const riderChannel = supabase.channel('rider-flow-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        if (payload.new && payload.new.rider_id === rider.id && payload.new.status === 'rider_assigned') {
          setIncomingAssignment(payload.new);
          startBeep();
        }
        if (payload.eventType === 'UPDATE' && payload.new.rider_id !== rider.id && incomingAssignment?.id === payload.new.id) {
            setIncomingAssignment(null);
            stopBeep();
        }
        fetchRiderData();
      })
      .subscribe();

    const storeChannel = supabase.channel('store-settings-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_settings' }, (payload: any) => {
        if (payload.new) {
          setStoreInfo({ 
            address: payload.new.store_address, 
            lat: payload.new.lat, 
            lng: payload.new.lng 
          });
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(riderChannel); 
      supabase.removeChannel(storeChannel);
      stopBeep();
    };
  }, [rider.id, incomingAssignment]);

  // --- DATA FETCHING ---
  const fetchRiderData = async () => {
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
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Haversine Distance Calculation (Meters)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const handlePickup = async () => {
    if (!myTask) return;
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const distance = getDistance(
          position.coords.latitude, 
          position.coords.longitude, 
          storeInfo.lat, 
          storeInfo.lng
        );

        // 🎯 STRICT: Must be within 50m of store
        if (distance <= 50) {
          await supabase.from('orders').update({ status: 'order dispatched' }).eq('id', myTask.id);
          fetchRiderData();
        } else {
          setGeoError({ show: true, msg: "Please reach the store to pickup. Within 50 meters required." });
        }
        setLoading(false);
      },
      () => { alert("Enable GPS to pickup orders"); setLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const handleMarkDelivered = async (orderId: string) => {
    if (!myTask) return;

    if (!myTask.lat || !myTask.lng) {
        confirmAndDeliver(orderId);
        return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const distance = getDistance(
          position.coords.latitude, 
          position.coords.longitude, 
          myTask.lat, 
          myTask.lng
        );

        // 🎯 STRICT: Must be within 50m of customer
        if (distance <= 50) {
          confirmAndDeliver(orderId);
        } else {
          setGeoError({ show: true, msg: "Please reach the customer's location to confirm delivery. Within 50 meters required." });
        }
        setLoading(false);
      },
      () => { alert("Enable GPS to confirm delivery"); setLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const confirmAndDeliver = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    await supabase.from('rider_profiles').update({ is_busy: false }).eq('id', rider.id);
    fetchRiderData();
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
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }, 1000);
  };

  const stopBeep = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  const handleAccept = async () => {
    stopBeep();
    const orderId = incomingAssignment.id;
    setIncomingAssignment(null);
    await supabase.from('orders').update({ status: 'order placed' }).eq('id', orderId);
    await supabase.from('rider_profiles').update({ is_busy: true }).eq('id', rider.id);
    fetchRiderData();
  };

  const handleReject = async () => {
    stopBeep();
    const orderId = incomingAssignment.id;
    setIncomingAssignment(null);
    await supabase.from('rider_profiles').update({ is_busy: false }).eq('id', rider.id);
    await supabase.from('orders').update({ rider_id: null, status: 'order placed' }).eq('id', orderId);
    fetchRiderData();
  };

  const openCustomerMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const openStoreMaps = () => {
    if (!storeInfo.address) return alert("Store location not set");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeInfo.address)}`, '_blank');
  };

  // --- 🎯 EARNINGS LOGIC: ₹5 per KM ---
  const calculateTotalEarnings = () => {
    let total = 0;
    completedOrders.forEach(order => {
      if (order.lat && order.lng && storeInfo.lat && storeInfo.lng) {
        const distMeters = getDistance(storeInfo.lat, storeInfo.lng, order.lat, order.lng);
        const distKm = distMeters / 1000;
        total += Math.round(distKm * 5); 
      } else {
        total += 10; // Fallback
      }
    });
    return total;
  };

  const totalEarnings = calculateTotalEarnings();

  return (
    <div className="min-h-screen bg-[#08080a] text-white flex flex-col font-sans lowercase no-scrollbar">
      
      <AnimatePresence>
        {geoError?.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="bg-[#12121a] border-2 border-red-500/30 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black uppercase mb-2 text-white">Location Required</h3>
              <p className="text-xs text-white/40 font-bold leading-relaxed mb-8 uppercase tracking-widest">{geoError.msg}</p>
              <button 
                onClick={() => setGeoError(null)}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em]"
              >
                ok, understood
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incomingAssignment && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center p-8 text-black text-center">
            <BellRing size={80} className="mb-6 animate-bounce" />
            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none italic">New Task<br/>Assigned!</h2>
            <div className="my-8 uppercase tracking-widest font-bold text-xs leading-loose">
              <p className="text-2xl italic mb-2 font-black">₹{incomingAssignment.total_amount}</p>
              <p className="opacity-60 px-4 line-clamp-2">{incomingAssignment.address}</p>
            </div>
            <div className="flex flex-col w-full gap-3 px-4">
              <button onClick={handleAccept} className="w-full h-20 bg-black text-white rounded-3xl font-black uppercase text-lg tracking-widest active:scale-95 shadow-2xl transition-transform">Accept & Start</button>
              <button onClick={handleReject} className="w-full h-16 bg-black/10 rounded-3xl font-black uppercase text-xs active:scale-95 transition-all">Reject</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-12 pb-8 bg-[#0c0c0f] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-[0_0_30px_rgba(255,153,193,0.1)]">
              <Bike size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter capitalize">{rider?.full_name || 'Partner'}</h1>
              <div className="flex items-center gap-1.5 opacity-40">
                <ShieldCheck size={10} className="text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Verified Partner</span>
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-transform"><LogOut size={16} className="text-white/40" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-[1.8rem] p-5 relative overflow-hidden text-primary">
            <Wallet size={32} className="absolute -right-2 -bottom-2 opacity-5" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">My Earnings</p>
            <p className="text-2xl font-black italic">₹{totalEarnings}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-[1.8rem] p-5 relative overflow-hidden">
            <Zap size={32} className="absolute -right-2 -bottom-2 opacity-5 text-white" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Delivered</p>
            <p className="text-2xl font-black text-white">{completedOrders.length}</p>
          </div>
        </div>
      </header>

      <nav className="flex p-4 gap-2 bg-[#08080a] sticky top-[210px] z-40">
        <button onClick={() => setActiveTab('live')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-primary text-black' : 'bg-white/5 text-white/40'}`}>active task</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-black' : 'bg-white/5 text-white/40'}`}>history</button>
      </nav>

      <main className="flex-1 px-4 pb-12 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'live' && (
            <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {!isOnline ? (
                <div className="py-20 text-center opacity-20"><Bike size={64} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] tracking-widest">Partner Offline</p></div>
              ) : loading && !myTask ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
              ) : !myTask ? (
                <div className="py-20 text-center space-y-4">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto"><Clock size={32} className="opacity-20" /></div>
                   <p className="font-black uppercase text-[10px] tracking-[0.3em] text-white/20">Waiting for assignment...</p>
                </div>
              ) : (
                <motion.div layout className="bg-[#12121a] border-2 border-primary/30 rounded-[2.2rem] p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
                    
                    {myTask.status === 'order placed' && (
                      <div className="flex flex-col items-center text-center py-6">
                        <Clock size={40} className="text-orange-400 mb-4 animate-pulse" />
                        <h3 className="text-xl font-black uppercase italic leading-tight text-white">Preparing Items...</h3>
                        <p className="text-xs font-bold text-white/30 mt-2 mb-8 uppercase tracking-widest leading-relaxed text-center">Store is preparing items. <br /> navigate to store location.</p>
                        <button onClick={openStoreMaps} className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary active:scale-95 transition-all shadow-xl"><MapPin size={16} /> Reach Store</button>
                      </div>
                    )}

                    {myTask.status === 'order packed' && (
                      <div className="flex flex-col items-center text-center py-6">
                        <PackageCheck size={48} className="text-primary mb-4" />
                        <h3 className="text-xl font-black uppercase italic leading-tight text-white">Ready for Pickup!</h3>
                        <p className="text-xs font-bold text-white/30 mt-2 mb-8 uppercase tracking-widest leading-relaxed text-center">Order is packed. <br /> confirm pickup to start delivery.</p>
                        <div className="flex w-full gap-3 mt-4 px-2">
                          <button onClick={openStoreMaps} className="flex-1 h-18 bg-white/5 border border-white/10 text-primary rounded-3xl font-black flex items-center justify-center active:scale-95 transition-all shadow-md"><MapPin size={20} /></button>
                          <button 
                            disabled={loading}
                            onClick={handlePickup} 
                            className="flex-[3] h-18 bg-white text-black rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
                          >
                            {loading ? <Loader2 size={22} className="animate-spin" /> : <><Truck size={22} /> Pickup Order</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {myTask.status === 'order dispatched' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-start px-2">
                          <div>
                            <span className="bg-primary/10 text-primary text-[9px] font-black uppercase px-2 py-1 rounded-md">Delivery in progress</span>
                            <h3 className="text-2xl font-black mt-2 capitalize text-white leading-none">{myTask.user_name}</h3>
                          </div>
                          <div className="text-right text-white"><p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">To Collect</p><p className="text-2xl font-black italic leading-none">₹{myTask.total_amount}</p></div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-start gap-4 text-white/80"><MapPin size={20} className="text-primary shrink-0 mt-1" /><p className="text-sm font-bold leading-relaxed">{myTask.address}</p></div>
                        <div className="grid grid-cols-2 gap-4 px-2">
                          <button onClick={() => openCustomerMaps(myTask.address)} className="h-14 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Navigation size={18} /> Navigation</button>
                          <a href={`tel:${myTask.user_phone}`} className="h-14 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Phone size={18} /> Call User</a>
                        </div>
                        <button 
                          disabled={loading}
                          onClick={() => handleMarkDelivered(myTask.id)} 
                          className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
                        >
                          {loading ? <Loader2 size={22} className="animate-spin" /> : <><CheckCircle size={22} strokeWidth={2.5} /> Delivery Complete</>}
                        </button>
                      </div>
                    )}
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              {completedOrders.length === 0 ? (
                <div className="py-20 text-center opacity-10 uppercase font-black text-[10px] tracking-[0.4em]">No delivery records</div>
              ) : (
                completedOrders.map(order => (
                  <div key={order.id} className="bg-white/[0.02] border border-white/5 rounded-[1.8rem] p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center shadow-inner"><Check size={18} strokeWidth={3} /></div>
                      <div className="text-white text-left">
                        <p className="text-sm font-black capitalize text-white/90">{order.user_name || 'Customer'}</p>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Collected ₹{order.total_amount}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/10" />
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