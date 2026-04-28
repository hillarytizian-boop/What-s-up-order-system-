import { motion } from 'framer-motion';
import { Flame, Leaf, Star, Plus } from 'lucide-react';
import { MenuItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';

interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  const { addToCart } = useApp();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100"
      onClick={() => addToCart(item)}
    >
      <div className="relative h-36">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2 flex gap-1">
          {item.popular && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
          {item.spicy && <Flame className="w-5 h-5 text-red-500" />}
          {item.vegan && <Leaf className="w-5 h-5 text-green-500" />}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</h3>
          <span className="text-orange-500 font-bold text-sm">${item.price.toFixed(2)}</span>
        </div>
        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{item.description}</p>
        <button
          onClick={(e) => { e.stopPropagation(); addToCart(item); }}
          className="mt-2 w-full flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-600 py-1.5 rounded-xl text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add to Cart
        </button>
      </div>
    </motion.div>
  );
}
