import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, QrCode, Link as LinkIcon, ChefHat } from 'lucide-react';
import { Link } from 'react-router-dom';
import QRCodeLib from 'qrcode';

const TABLES = [1, 2, 3, 4];

interface QREntry { table: number; url: string; dataUrl: string; }

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

export default function QRCodes() {
  const [qrCodes, setQrCodes] = useState<QREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    const generate = async () => {
      const entries: QREntry[] = [];
      for (const table of TABLES) {
        const url = `${BASE_URL}/table/${table}`;
        const dataUrl = await QRCodeLib.toDataURL(url, { width: 400, margin: 2, color: { dark: '#111827', light: '#FFFFFF' }, errorCorrectionLevel: 'H' });
        entries.push({ table, url, dataUrl });
      }
      setQrCodes(entries);
      setLoading(false);
    };
    generate();
  }, []);

  const handleCopy = (url: string, table: number) => {
    navigator.clipboard.writeText(url).then(() => { setCopied(table); setTimeout(() => setCopied(null), 2000); });
  };

  const handleDownload = (entry: QREntry) => {
    const a = document.createElement('a');
    a.href = entry.dataUrl;
    a.download = `tablebite-qr-table-${entry.table}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center"><ChefHat className="w-4 h-4 text-white" /></div><div><h1 className="font-bold text-gray-900">Table QR Codes</h1><p className="text-xs text-gray-400">Print & place on tables</p></div></div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8"><div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><QrCode className="w-7 h-7 text-blue-600" /></div><h2 className="text-2xl font-black text-gray-900 mb-2">Table QR Codes</h2><p className="text-gray-500 text-sm max-w-md mx-auto">Print these QR codes and place them on the corresponding tables. Customers scan to order directly from their table.</p></div>
        {loading ? (<div className="flex justify-center py-20"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {qrCodes.map((entry, i) => (
              <motion.div key={entry.table} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                <div className={`py-4 text-center text-white font-black text-sm ${['bg-orange-500','bg-blue-500','bg-emerald-500','bg-purple-500'][i % 4]}`}>TABLE {entry.table}</div>
                <div className="flex justify-center p-8"><div className="w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-gray-50"><img src={entry.dataUrl} alt={`QR Code Table ${entry.table}`} className="w-full h-full" /></div></div>
                <div className="px-5 pb-2"><div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 border border-gray-100 break-all"><LinkIcon className="w-3 h-3 shrink-0 text-gray-400" />{entry.url}</div></div>
                <div className="flex gap-2 p-4">
                  <button onClick={() => handleCopy(entry.url, entry.table)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${copied === entry.table ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>{copied === entry.table ? '✓ Copied!' : 'Copy URL'}</button>
                  <button onClick={() => handleDownload(entry)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"><Download className="w-4 h-4" /> Download</button>
                </div>
                <div className="px-4 pb-4"><p className="text-xs text-gray-400 text-center">Scan to order from Table {entry.table} — auto-linked</p></div>
              </motion.div>
            ))}
          </div>
        )}
        <div className="mt-10 bg-blue-50 border border-blue-100 rounded-2xl p-5"><h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><QrCode className="w-4 h-4" /> How to use</h3><ol className="space-y-1.5 text-sm text-blue-700"><li>1. Download each QR code for the corresponding table</li><li>2. Print and laminate for durability</li><li>3. Place on the table (table tent, frame, or sticker)</li><li>4. Customers scan → menu loads → order is linked to table automatically</li></ol></div>
      </div>
    </div>
  );
}
