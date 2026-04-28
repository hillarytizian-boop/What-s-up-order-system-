import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, ChefHat, QrCode, LayoutDashboard, Utensils } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Category } from '../types';
import MenuCard from '../components/ui/MenuCard';
import CartDrawer from '../components/ui/CartDrawer';
import { Link } from 'react-router-dom';

const CATEGORIES: { id: Category | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All Items', emoji: '🍽️' },
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'salads', label: 'Salads', emoji: '🥗' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'drinks', label: 'Drinks', emoji: '🍹' },
];

export default function CustomerMenu() {
  const { menuItems, cartCount, cartTotal } = useApp();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = useMemo(() => {
    let items = menuItems.filter(m => m.available);
    if (category !== 'all') items = items.filter(m => m.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, category, search]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-gray-900 text-lg">TableBite</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/login" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <LayoutDashboard className="w-3.5 h-3.5" /> Staff
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-black">Taste the Difference</h1>
          <p className="text-white/80 mt-2 mb-4">Fresh ingredients, bold flavors — order from your table.</p>
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes..." className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 bg-white shadow-xl" />
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap ${category === cat.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">{item.name} - ${item.price}</div>)}
        </div>
      </div>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
