import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ChefHat } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ChefHat className="w-10 h-10 text-orange-500" />
        </div>
        <h1 className="text-8xl font-black text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-700 mb-3">Page Not Found</h2>
        <p className="text-gray-500 max-w-sm mx-auto mb-8">
          Looks like this dish isn't on our menu. The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors shadow-lg shadow-orange-200"
        >
          <Home className="w-5 h-5" />
          Back to Menu
        </Link>
      </motion.div>
    </div>
  );
}
