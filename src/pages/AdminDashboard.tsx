import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Plus, Edit2, Trash2, Eye, Save, X, LayoutDashboard, Package, DollarSign, ToggleLeft, ToggleRight, Search, Flame, Leaf, Star, QrCode, Users } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { menuDB } from '../store/db';
import { MenuItem, Category } from '../types';
import { generateId, sanitizeText } from '../utils/security';
import AdminGuard from '../components/admin/AdminGuard';

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'salads', label: 'Salads', emoji: '🥗' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'drinks', label: 'Drinks', emoji: '🍹' },
];

const IMAGE_OPTIONS = [
  { url: '/images/burger.jpg', label: 'Burger' }, { url: '/images/pizza.jpg', label: 'Pizza' }, { url: '/images/pasta.jpg', label: 'Pasta' },
  { url: '/images/salad.jpg', label: 'Salad' }, { url: '/images/dessert.jpg', label: 'Dessert' }, { url: '/images/drinks.jpg', label: 'Drinks' },
];

const EMPTY_ITEM: Omit<MenuItem, 'id'> = {
  name: '', description: '', price: 0, category: 'burgers', image: '/images/burger.jpg', available: true, popular: false, spicy: false, vegan: false,
};

interface FormErrors { name?: string; description?: string; price?: string }

function MenuItemModal({ item, onSave, onClose }: { item: Partial<MenuItem> | null; onSave: (item: MenuItem) => void; onClose: () => void }) {
  const [form, setForm] = useState<Omit<MenuItem, 'id'>>(item ? { ...EMPTY_ITEM, ...item } : { ...EMPTY_ITEM });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else if (form.name.length > 60) e.name = 'Max 60 characters';
    if (!form.description.trim()) e.description = 'Description is required';
    if (form.price <= 0) e.price = 'Price must be greater than 0';
    if (form.price > 999) e.price = 'Price too high';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    onSave({ id: (item as MenuItem)?.id || generateId(), ...form, name: sanitizeText(form.name, 60), description: sanitizeText(form.description, 300) });
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl"><h2 className="font-bold text-gray-900 text-lg">{item && 'id' in item ? 'Edit Item' : 'New Menu Item'}</h2><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative h-40 rounded-2xl overflow-hidden bg-gray-100"><img src={form.image} alt={form.name || 'Preview'} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/20 flex items-end p-3"><div className="flex gap-1.5 flex-wrap">{IMAGE_OPTIONS.map(opt => (<button key={opt.url} type="button" onClick={() => setForm(f => ({ ...f, image: opt.url }))} className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${form.image === opt.url ? 'bg-orange-500 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'}`}>{opt.label}</button>))}</div></div></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.slice(0, 60) }))} className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.name ? 'border-red-300' : 'border-gray-200'}`} placeholder="Classic Smash Burger" />{errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}</div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 300) }))} rows={3} className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none ${errors.description ? 'border-red-300' : 'border-gray-200'}`} placeholder="Describe the dish..." />{errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}</div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-semibold text-gray-700 mb-1">Price ($) *</label><input type="number" step="0.01" min="0.01" max="999" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.price ? 'border-red-300' : 'border-gray-200'}`} placeholder="0.00" />{errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}</div><div><label className="block text-sm font-semibold text-gray-700 mb-1">Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</select></div></div>
          <div className="flex flex-wrap gap-2">{[{key:'available',label:'Available',icon:'✓',active:form.available},{key:'popular',label:'Popular',icon:'⭐',active:form.popular},{key:'spicy',label:'Spicy',icon:'🌶️',active:form.spicy},{key:'vegan',label:'Vegan',icon:'🌿',active:form.vegan}].map(flag => (<button key={flag.key} type="button" onClick={() => setForm(f => ({ ...f, [flag.key]: !f[flag.key as keyof typeof f] }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${form[flag.key as keyof typeof form] ? `bg-${flag.key==='available'?'emerald':flag.key==='popular'?'amber':flag.key==='spicy'?'red':'green'}-500 text-white` : 'bg-gray-100 text-gray-600'}`}><span>{flag.icon}</span> {flag.label}</button>))}</div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">Cancel</button><button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-70"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Item'}</button></div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { session, logout, showToast, refreshMenu } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all');
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(() => setItems(menuDB.getAll()), []);
  useEffect(() => load(), [load]);

  const filtered = items.filter(i => (catFilter === 'all' || i.category === catFilter)).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = (item: MenuItem) => { menuDB.upsert(item); load(); refreshMenu(); setEditItem(undefined); showToast('success', `${item.name} saved successfully!`); };
  const handleDelete = (id: string) => { menuDB.delete(id); load(); refreshMenu(); setDeleteConfirm(null); showToast('success', 'Item deleted'); };
  const toggleAvailable = (item: MenuItem) => { menuDB.upsert({ ...item, available: !item.available }); load(); refreshMenu(); showToast('info', `${item.name} ${!item.available ? 'enabled' : 'disabled'}`); };

  const stats = { total: items.length, available: items.filter(i => i.available).length, popular: items.filter(i => i.popular).length, avgPrice: items.length ? items.reduce((s,i)=>s+i.price,0)/items.length : 0 };
  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <AdminGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50 font-sans">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm"><div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center"><LayoutDashboard className="w-5 h-5 text-white" /></div><div><h1 className="font-black text-gray-900">Admin CMS</h1><p className="text-xs text-gray-400">{session?.username} · Admin</p></div></div><div className="flex items-center gap-2"><Link to="/staff" className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 px-3 py-1.5 bg-orange-50 rounded-xl"><Users className="w-3.5 h-3.5" /> Staff View</Link><Link to="/admin/qr-codes" className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-xl"><QrCode className="w-3.5 h-3.5" /> QR Codes</Link><button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"><LogOut className="w-3.5 h-3.5" /> Logout</button></div></div></header>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">{[{label:'Total Items',value:stats.total,icon:Package,color:'text-blue-500',bg:'bg-blue-50'},{label:'Available',value:stats.available,icon:Eye,color:'text-emerald-500',bg:'bg-emerald-50'},{label:'Popular',value:stats.popular,icon:Star,color:'text-amber-500',bg:'bg-amber-50'},{label:'Avg Price',value:`$${stats.avgPrice.toFixed(2)}`,icon:DollarSign,color:'text-purple-500',bg:'bg-purple-50'}].map(s=>(<div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"><div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`} /></div><div><p className="text-xl font-black text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div></div>))}</div>
          <div className="flex flex-wrap gap-3 mb-4"><div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menu items..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" /></div><select value={catFilter} onChange={e=>setCatFilter(e.target.value as Category|'all')} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"><option value="all">All Categories</option>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</select><button onClick={()=>setEditItem(null)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"><Plus className="w-4 h-4" /> Add Item</button></div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left text-xs font-bold text-gray-500 px-4 py-3 uppercase">Item</th><th className="text-left hidden sm:table-cell">Category</th><th className="text-left">Price</th><th className="text-left hidden md:table-cell">Flags</th><th className="text-left">Status</th><th className="text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-50"><AnimatePresence>{filtered.map(item=>(<motion.tr key={item.id} layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="hover:bg-gray-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-xl shrink-0" /><div><p className="font-semibold text-gray-900 text-sm">{item.name}</p><p className="text-gray-400 text-xs">{item.description.substring(0,40)}</p></div></div></td><td className="px-4 py-3 hidden sm:table-cell"><span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full capitalize">{item.category}</span></td><td className="px-4 py-3"><span className="font-bold text-gray-900">${item.price.toFixed(2)}</span></td><td className="px-4 py-3 hidden md:table-cell"><div className="flex gap-1">{item.popular && <Star className="w-3.5 h-3.5 text-amber-500" />}{item.spicy && <Flame className="w-3.5 h-3.5 text-red-500" />}{item.vegan && <Leaf className="w-3.5 h-3.5 text-green-500" />}</div></td><td className="px-4 py-3"><button onClick={()=>toggleAvailable(item)} className="transition-colors">{item.available ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><ToggleRight className="w-4 h-4" /> On</span> : <span className="flex items-center gap-1 text-xs text-gray-400 font-medium"><ToggleLeft className="w-4 h-4" /> Off</span>}</button></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={()=>setEditItem(item)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" /></button><button onClick={()=>setDeleteConfirm(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" /></button></div></td></motion.tr>))}</AnimatePresence></tbody></table>{filtered.length===0&&(<div className="text-center py-12"><Package className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">No items found</p></div>)}</div></div>
        </div>
        <AnimatePresence>{editItem !== undefined && <MenuItemModal item={editItem} onSave={handleSave} onClose={()=>setEditItem(undefined)} />}{deleteConfirm && (<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><motion.div initial={{scale:0.9}} animate={{scale:1}} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-500" /></div><h3 className="font-bold text-gray-900 text-center mb-2">Delete Item?</h3><p className="text-gray-500 text-sm text-center mb-5">This action cannot be undone.</p><div className="flex gap-3"><button onClick={()=>setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">Cancel</button><button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors">Delete</button></div></motion.div></motion.div>)}</AnimatePresence>
      </div>
    </AdminGuard>
  );
}
