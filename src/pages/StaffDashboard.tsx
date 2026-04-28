import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, LogOut, RefreshCw, Clock, CheckCircle2, Package, Utensils, Receipt, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { orderDB } from '../store/db';
import { Order } from '../types';
import AdminGuard from '../components/admin/AdminGuard';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', next: 'preparing' as Order['status'], nextLabel: 'Start Preparing' },
  preparing: { label: 'Preparing', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', next: 'ready' as Order['status'], nextLabel: 'Mark Ready' },
  ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', next: 'completed' as Order['status'], nextLabel: 'Complete Order' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', next: null, nextLabel: '' },
};

function OrderCard({ order, onStatusUpdate }: { order: Order; onStatusUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_CONFIG[order.status];

  const handleAdvance = async () => {
    if (!cfg.next || updating) return;
    setUpdating(true);
    await new Promise(r => setTimeout(r, 400));
    orderDB.updateStatus(order.id, cfg.next);
    onStatusUpdate();
    setUpdating(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-mono text-xs text-gray-400">#{order.id.slice(0,10)}</span><span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span></div><div className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">🪑 T{order.tableId}</span><Link to={`/order/${order.id}`} className="text-gray-400 hover:text-gray-600"><ArrowRight className="w-4 h-4" /></Link></div></div>
      <div className="px-4 py-3"><div className="space-y-1 mb-3">{order.items.map((item,i)=><div key={i} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-gray-700"><span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full text-xs flex items-center justify-center font-bold">{item.quantity}</span>{item.name}</span><span className="text-gray-500 text-xs">${(item.price*item.quantity).toFixed(2)}</span></div>)}</div>{order.customerNote && (<div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3 text-xs text-amber-700">📝 {order.customerNote}</div>)}<div className="flex items-center justify-between"><span className="font-black text-gray-900">${order.total.toFixed(2)}</span><div className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{new Date(order.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>{cfg.next && (<button onClick={handleAdvance} disabled={updating} className={`w-full mt-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${order.status==='pending'?'bg-amber-500 hover:bg-amber-600':order.status==='preparing'?'bg-emerald-500 hover:bg-emerald-600':'bg-purple-500 hover:bg-purple-600'} text-white`}>{updating ? 'Updating...' : cfg.nextLabel}</button>)}</div>
    </motion.div>
  );
}

export default function StaffDashboard() {
  const { session, logout, showToast } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    await new Promise(r => setTimeout(r, 200));
    setOrders(orderDB.getAll());
    setLastRefresh(new Date());
    if (!silent) setRefreshing(false);
  }, []);

  useEffect(() => { refresh(); const iv = setInterval(() => refresh(true), 10000); return () => clearInterval(iv); }, [refresh]);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const stats = { total: orders.length, pending: orders.filter(o=>o.status==='pending').length, preparing: orders.filter(o=>o.status==='preparing').length, ready: orders.filter(o=>o.status==='ready').length, revenue: orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total,0) };
  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 font-sans">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm"><div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center"><ChefHat className="w-5 h-5 text-white" /></div><div><h1 className="font-black text-gray-900">Staff Dashboard</h1><p className="text-xs text-gray-400">Welcome, {session?.username}</p></div></div><div className="flex items-center gap-2">{session?.role === 'admin' && (<Link to="/admin" className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-xl">Admin CMS →</Link>)}<button onClick={()=>refresh()} disabled={refreshing} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-50"><motion.span animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 0.8 }}><RefreshCw className="w-3.5 h-3.5" /></motion.span> Refresh</button><button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"><LogOut className="w-3.5 h-3.5" /> Logout</button></div></div></header>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">{[{label:'Active Orders',value:stats.pending+stats.preparing+stats.ready,icon:Receipt,color:'text-blue-500',bg:'bg-blue-50'},{label:'Pending',value:stats.pending,icon:Clock,color:'text-amber-500',bg:'bg-amber-50'},{label:'Preparing',value:stats.preparing,icon:Utensils,color:'text-orange-500',bg:'bg-orange-50'},{label:'Ready',value:stats.ready,icon:CheckCircle2,color:'text-emerald-500',bg:'bg-emerald-50'}].map(stat=>(<div key={stat.label} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"><div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center shrink-0`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div><div><p className="text-2xl font-black text-gray-900">{stat.value}</p><p className="text-xs text-gray-500">{stat.label}</p></div></div>))}</div>
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-4 mb-6 flex items-center justify-between"><div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-emerald-400" /><div><p className="text-gray-400 text-xs">Completed Revenue</p><p className="font-black text-xl text-emerald-400">${stats.revenue.toFixed(2)}</p></div></div><div className="text-right"><p className="text-gray-400 text-xs">Total Orders</p><p className="font-bold text-white">{stats.total}</p></div></div>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">{[{id:'all',label:'All',count:orders.length},{id:'pending',label:'Pending',count:stats.pending},{id:'preparing',label:'Preparing',count:stats.preparing},{id:'ready',label:'Ready',count:stats.ready},{id:'completed',label:'Done',count:orders.filter(o=>o.status==='completed').length}].map(tab=>(<button key={tab.id} onClick={()=>setFilter(tab.id as Order['status']|'all')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${filter===tab.id?'bg-orange-500 text-white shadow-md':'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}`}>{tab.label}<span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter===tab.id?'bg-white/20 text-white':'bg-gray-100 text-gray-500'}`}>{tab.count}</span></button>))}</div>
          {filtered.length===0?(<div className="text-center py-20"><Package className="w-16 h-16 text-gray-200 mx-auto mb-4" /><p className="text-gray-500 font-medium">No orders here</p><p className="text-gray-400 text-sm mt-1">Auto-refreshes every 10 seconds</p></div>):(<motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><AnimatePresence>{filtered.map(order=><OrderCard key={order.id} order={order} onStatusUpdate={()=>refresh()} />)}</AnimatePresence></motion.div>)}
          <p className="text-center text-xs text-gray-400 mt-6">Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refresh every 10s</p>
        </div>
      </div>
    </AdminGuard>
  );
}
