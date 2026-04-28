import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChefHat, Clock, CheckCircle2, Package, AlertCircle, RefreshCw, Receipt, Utensils } from 'lucide-react';
import { Order } from '../types';
import { orderDB } from '../store/db';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'We received your order', icon: Receipt, color: 'bg-blue-500' },
  { key: 'preparing', label: 'Preparing', desc: 'Kitchen is cooking', icon: ChefHat, color: 'bg-amber-500' },
  { key: 'ready', label: 'Ready', desc: 'Your order is ready!', icon: Package, color: 'bg-emerald-500' },
  { key: 'completed', label: 'Completed', desc: 'Enjoy your meal!', icon: CheckCircle2, color: 'bg-purple-500' },
] as const;

const STATUS_MESSAGES: Record<Order['status'], string> = {
  pending: "Your order is queued — our kitchen will start soon! ⏳",
  preparing: "Hands are busy in the kitchen crafting your order! 👨‍🍳",
  ready: "Your order is ready! Head to the counter or wait for service 🎉",
  completed: "Order complete. We hope you enjoy every bite! 😋",
};

const ESTIMATED_TIMES: Record<Order['status'], string> = {
  pending: '~20–25 min',
  preparing: '~10–15 min',
  ready: 'Now!',
  completed: 'Completed',
};

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 300));
    const o = orderDB.getById(orderId);
    setOrder(o ?? null);
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const currentStepIdx = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;

  if (order === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h1>
        <p className="text-gray-500 mb-6 text-sm">The order ID "{orderId}" doesn't exist.</p>
        <Link to="/" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="font-bold text-gray-900 text-base">Order Tracking</h1>
              <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 12)}...</p>
            </div>
          </div>
          <button onClick={fetchOrder} disabled={refreshing} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">
            <motion.span animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 0.8 }}><RefreshCw className="w-3.5 h-3.5" /></motion.span>
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div key={order.status} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div><p className="text-gray-400 text-sm mb-1">Table {order.tableId}</p><h2 className="text-2xl font-black capitalize">{order.status === 'pending' ? 'Order Placed' : order.status === 'preparing' ? 'Preparing...' : order.status === 'ready' ? 'Ready! 🎉' : 'Completed ✓'}</h2></div>
              <div className="text-right"><p className="text-gray-400 text-xs">Est. time</p><p className="text-orange-400 font-bold">{ESTIMATED_TIMES[order.status]}</p></div>
            </div>
            <p className="text-gray-300 text-sm mb-5">{STATUS_MESSAGES[order.status]}</p>
            <div className="relative">
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" initial={{ width: '0%' }} animate={{ width: `${((currentStepIdx + 1) / STATUS_STEPS.length) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
              </div>
              <div className="flex justify-between mt-4">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const done = idx <= currentStepIdx;
                  const active = idx === currentStepIdx;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1.5">
                      <motion.div animate={active ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${done ? step.color : 'bg-gray-700'} ${active ? 'ring-2 ring-white/30' : ''}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </motion.div>
                      <span className={`text-xs font-medium ${done ? 'text-white' : 'text-gray-500'}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-500" /><h3 className="font-bold text-gray-900">Order Items</h3></div>
          <div className="divide-y divide-gray-50">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3"><span className="w-7 h-7 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">{item.quantity}</span><div><p className="font-medium text-gray-900 text-sm">{item.name}</p>{item.notes && <p className="text-gray-400 text-xs">Note: {item.notes}</p>}</div></div>
                <span className="font-bold text-gray-900 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-2 gap-4">
          <div><p className="text-xs text-gray-400 mb-0.5">Order ID</p><p className="font-mono text-xs font-bold text-gray-700 break-all">{order.id}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Table</p><p className="font-bold text-gray-900">Table {order.tableId}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Payment</p><p className="font-medium text-gray-900 capitalize">{order.paymentMethod === 'table' ? '🪑 Pay at table' : '🏃 Pay on pickup'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Total</p><p className="font-black text-orange-500 text-lg">${order.total.toFixed(2)}</p></div>
          {order.customerNote && (<div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">Special Instructions</p><p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{order.customerNote}</p></div>)}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 px-1"><div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>Ordered at {new Date(order.createdAt).toLocaleTimeString()}</span></div><span>Refreshed: {lastRefresh.toLocaleTimeString()}</span></div>
        <div className="text-center"><p className="text-xs text-gray-400">Auto-refreshes every 15 seconds</p><div className="flex justify-center gap-1 mt-1">{Array.from({ length: 3 }).map((_,i) => (<motion.div key={i} className="w-1 h-1 bg-orange-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }} />))}</div></div>
      </div>
    </div>
  );
}
