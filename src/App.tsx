import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { seedDatabase } from './store/db';
import ToastContainer from './components/ui/ToastContainer';
import CustomerMenu from './pages/CustomerMenu';
import TablePage from './pages/TablePage';
import OrderTracking from './pages/OrderTracking';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import QRCodes from './pages/QRCodes';
import NotFound from './pages/NotFound';

function AppInit({ children }: { children: React.ReactNode }) {
  useEffect(() => { seedDatabase(); }, []);
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppInit>
          <ToastContainer />
          <Routes>
            <Route path="/" element={<CustomerMenu />} />
            <Route path="/table/:tableId" element={<TablePage />} />
            <Route path="/order/:orderId" element={<OrderTracking />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/admin/qr-codes" element={<QRCodes />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </AppInit>
      </AppProvider>
    </BrowserRouter>
  );
}
