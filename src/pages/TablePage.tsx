import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Minus, Plus, Trash2, CreditCard, UtensilsCrossed, ChefHat, Check, Shield, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { orderDB } from '../store/db';
import { generateOrderId, sanitizeText } from '../utils/security';
import { Order, PaymentMethod } from '../types';

const VALID_TABLES = [1, 2, 3, 4];

export default function TablePage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, showToast, menuItems } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('table');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [csrfToken] = useState(() => Math.random().toString(36).slice(2));

  const tableNum = parseInt(tableId || '0');
  const isValidTable = VALID_TABLES.includes(tableNum);

  useEffect(() => { if (!isValidTable) navigate('/404'); }, [isValidTable, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) { showToast('warning', 'Your cart is empty!'); return; }
    if (submitting) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    const orderId = generateOrderId();
    const now = new Date().toISOString();
    const order: Order = {
      id: orderId,
      tableId: tableNum,
      items: cart.map(c => ({ menuItemId: c.menuItem.id, name: c.menuItem.name, price: c.menuItem.price, quantity: c.quantity, notes: c.notes })),
      status: 'pending',
      paymentMethod,
      total: cartTotal,
      createdAt: now,
      updatedAt: now,
      customerNote: sanitizeText(note, 300),
    };
    orderDB.create(order);
    clearCart();
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { navigate(`/order/${orderId}`); }, 1500);
  };

  if (!isValidTable) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center"><ChefHat className="w-4 h-4 text-white" /></div><div><h1 className="font-bold text-gray-900 text-base leading-tight">Checkout</h1><p className="text-xs text-gray-400">Table {tableNum}</p></div></div>
          <div className="ml-auto bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">🪑 Table {tableNum}</div>
        </div>
      </header>
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto px-4 py-20 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="w-12 h-12 text-emerald-500" /></motion.div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Order Placed! 🎉</h2><p className="text-gray-500">Redirecting to order tracking...</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-6 pb-10">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl mb-5"><Shield className="w-4 h-4 text-emerald-500" /><span className="text-emerald-700 text-xs font-medium">Secure checkout — your data is protected</span></div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-orange-500" /><h2 className="font-bold text-gray-900">Order Summary</h2></div>
              {cart.length === 0 ? (<div className="px-4 py-8 text-center"><p className="text-gray-400">Your cart is empty</p><Link to="/" className="text-orange-500 font-semibold text-sm mt-2 block">← Browse menu</Link></div>) : (
                <div className="divide-y divide-gray-50">
                  {cart.map(item => {
                    const menuItem = menuItems.find(m => m.id === item.menuItem.id);
                    if (!menuItem) return null;
                    return (
                      <div key={item.menuItem.id} className="flex items-center gap-3 px-4 py-3">
                        <img src={item.menuItem.image} alt={item.menuItem.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                        <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 text-sm truncate">{item.menuItem.name}</p><p className="text-orange-500 font-bold text-sm">${(item.menuItem.price * item.quantity).toFixed(2)}</p></div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Minus className="w-3 h-3" /></button>
                          <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600"><Plus className="w-3 h-3 text-white" /></button>
                          <button onClick={() => removeFromCart(item.menuItem.id)} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-full group ml-1"><Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="_csrf" value={csrfToken} />
              <div className="bg-white rounded-2xl shadow-sm p-4"><h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-500" /> Payment Method</h3><div className="grid grid-cols-2 gap-3">
                {[{value:'table' as PaymentMethod, label:'Pay at Table', icon:'🪑', desc:'Pay when the bill arrives'},{value:'pickup' as PaymentMethod, label:'Pay on Pickup', icon:'🏃', desc:'Pay when you collect'}].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)} className={`flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left ${paymentMethod === opt.value ? 'border-orange-500 bg-orange-50' : 'border-gray-100'}`}>
                    <span className="text-xl mb-1.5">{opt.icon}</span><span className="font-bold text-gray-900 text-sm">{opt.label}</span><span className="text-gray-500 text-xs mt-0.5">{opt.desc}</span>
                    {paymentMethod === opt.value && <span className="mt-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></span>}
                  </button>
                ))}
              </div></div>
              <div className="bg-white rounded-2xl shadow-sm p-4"><h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-gray-500" /> Special Instructions</h3><textarea value={note} onChange={e => setNote(e.target.value.slice(0,300))} placeholder="Allergies, dietary preferences, or special requests..." rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" /><p className="text-xs text-gray-400 mt-1 text-right">{note.length}/300</p></div>
              <div className="bg-gray-900 text-white rounded-2xl p-4"><div className="flex items-center justify-between mb-3"><span className="text-gray-400">Subtotal</span><span className="font-bold">${cartTotal.toFixed(2)}</span></div><div className="flex items-center justify-between mb-1"><span className="text-gray-400 text-sm">Service</span><span className="text-sm text-gray-400">Included</span></div><div className="border-t border-gray-700 mt-3 pt-3 flex items-center justify-between"><span className="font-bold text-lg">Total</span><span className="font-black text-2xl text-orange-400">${cartTotal.toFixed(2)}</span></div></div>
              {cart.length === 0 && (<div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl"><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-amber-700 text-sm">Add items to your cart before checking out</span></div>)}
              <button type="submit" disabled={submitting || cart.length === 0} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl transition-colors text-lg shadow-lg shadow-orange-200 disabled:shadow-none">{submitting ? (<span className="flex items-center justify-center gap-2"><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Placing Order...</span>) : '🍽️ Place Order'}</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
