import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AppToaster } from '@/components/AppToaster';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { CreatorDashboardPage } from '@/pages/CreatorDashboardPage';
import { CartPage } from '@/pages/CartPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { ProductReviewsPage } from '@/pages/ProductReviewsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppToaster />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
          <Routes>
            <Route path="/" element={<MarketplacePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<CreatorDashboardPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/products/:productId/reviews" element={<ProductReviewsPage />} />
            <Route path="/users/:userId" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrdersPage />} />
          </Routes>
        </main>
        <footer className="border-t border-surface-border py-6 text-center text-sm text-mist">
          © {new Date().getFullYear()} VividCraft — Digital Art & Comic Marketplace
        </footer>
      </div>
    </BrowserRouter>
  );
}
