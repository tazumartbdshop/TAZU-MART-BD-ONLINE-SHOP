import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { realAnalytics } from './lib/realAnalytics';
import { UserLayout } from './components/layout/UserLayout';
import { useCategoryStore } from './store/useCategoryStore';
import { useProductStore } from './store/useProductStore';
import { useSearchStore } from './store/useSearchStore';
import { useOrderStore } from './store/useOrderStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useThemeStore } from './store/useThemeStore';
import { useOfferStore } from './store/useOfferStore';
import { useCustomerStore } from './store/useCustomerStore';
import { useBrandShowcaseStore } from './store/useBrandShowcaseStore';
import { useModeratorStore } from './store/useModeratorStore';
import { useBannerStore } from './store/useBannerStore';
import { useMenuSortStore } from './store/useMenuSortStore';
import { useDeliveryStore } from './store/useDeliveryStore';
import { broadcastSync } from './lib/broadcastSync';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import OrderInvoice from './pages/OrderInvoice';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Account from './pages/Account';
import AuthCallback from './pages/AuthCallback';
import AuthGate from './pages/AuthGate';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';
import AdminDashboard from './pages/admin/AdminDashboard';
import Product from './pages/Product';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import CategoryPage from './pages/CategoryPage';
import AllProducts from './pages/AllProducts';
import Settings from './pages/Settings';
import MyReviews from './pages/MyReviews';

import ReviewDetails from './pages/ReviewDetails';
import Support from './pages/Support';
import Offers from './pages/Offers';
import CampaignProductsPage from './pages/CampaignProductsPage';
import Games from './pages/Games';
import DeliveryPoints from './pages/DeliveryPoints';
import { ThemeInitializer } from './ThemeInitializer';

import Categories from './pages/Categories';
import Search from './pages/Search';
import LiveWebsiteGenerator from './pages/generated/LiveWebsiteGenerator';
import LiveWebsiteAdmin from './pages/generated/LiveWebsiteAdmin';
import Wishlist from './pages/Wishlist';
import WebViewViewer from './pages/WebViewViewer';

import OrderHistoryPage from './pages/orders/OrderHistoryPage';
import OrderDetailView from './pages/orders/OrderDetailView';
import CustomerNotificationsPage from './pages/CustomerNotificationsPage';
import CouponsAndOffersPage from './pages/CouponsAndOffersPage';

import AdminContentPages from './pages/admin/AdminContentPages';
import BrandsInformationPage from './pages/BrandsInformationPage';
import AboutUsPage from './pages/AboutUsPage';
import ContactUsPage from './pages/ContactUsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import PolicyPage from './pages/PolicyPage';
import DynamicLinkPage from './pages/DynamicLinkPage';
import { useSiteManagementStore } from './store/useSiteManagementStore';
import { useWebsitesStore } from './store/useWebsitesStore';
import { useBrandingStore } from './store/useBrandingStore';
import { RuntimeDiagnostics } from './components/common/RuntimeDiagnostics';

import { preloadHomepageDataAndAssets } from './utils/preloadHelper';

function AnalyticsRouteListener() {
  const location = useLocation();

  useEffect(() => {
    try {
      realAnalytics.init();
    } catch {}
  }, []);

  useEffect(() => {
    try {
      realAnalytics.trackPageView(location.pathname + location.search, document.title);
    } catch {}
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  const { fetchSettings } = useSiteManagementStore();
  const { user } = useAuthStore();
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    // Fire unified parallel homepage data fetching immediately at app boot
    preloadHomepageDataAndAssets();
    setIsConfigLoaded(true);
    broadcastSync.init();
    useAuthStore.getState().setInitializing(false);
  }, []);

  useEffect(() => {
    if (!isConfigLoaded) return;

    // Initial fetch for site management and branding data
    fetchSettings();
    useBrandingStore.getState().fetchBranding();

    // Subscribe to stores
    const unsubBranding = useBrandingStore.getState().subscribeRealtime();
    const unsubCategories = useCategoryStore.getState().subscribe();
    const unsubProducts = useProductStore.getState().subscribe();
    const unsubSearches = useSearchStore.getState().subscribe();
    
    // Subscribe to orders filtered by user ID for security and performance
    const currentUser = useAuthStore.getState().user;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
    
    // Admins see all, customers only their own
    const unsubOrders = useOrderStore.getState().subscribeOrders(isAdmin ? undefined : currentUser?.id);
    
    const unsubTrackingStatuses = useOrderStore.getState().subscribeTrackingStatuses();
    const unsubSettings = useSettingsStore.getState().subscribe();
    const unsubTheme = useThemeStore.getState().subscribe();
    const unsubOffers = useOfferStore.getState().subscribe();
    const unsubCustomers = useCustomerStore.getState().subscribe();
    const unsubBrands = useBrandShowcaseStore.getState().subscribe();
    const unsubModerators = useModeratorStore.getState().subscribe();
    const unsubWebsites = useWebsitesStore.getState().subscribe();
    const unsubBanners = useBannerStore.getState().subscribe();
    const unsubMenuSort = useMenuSortStore.getState().subscribe();
    const unsubDelivery = useDeliveryStore.getState().subscribe();
    
    return () => {
      unsubBranding();
      unsubCategories();
      unsubProducts();
      unsubSearches();
      unsubOrders();
      unsubTrackingStatuses();
      unsubSettings();
      unsubTheme();
      unsubOffers();
      unsubCustomers();
      unsubBrands();
      unsubModerators();
      unsubWebsites();
      unsubBanners();
      unsubMenuSort();
      unsubDelivery();
    };
  }, [isConfigLoaded, fetchSettings, user?.id]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              useAuthStore.getState().login(data.user);
            }
          }
        } catch (e) {
          console.warn('[Auth Init] Failed to verify JWT session:', e);
        }
      }
      useAuthStore.getState().setInitializing(false);
    };
    initAuth();
  }, [isConfigLoaded]);

  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const isBrandingLoaded = useBrandingStore((state) => state.isLoaded);
  const isSiteManagementLoaded = useSiteManagementStore((state) => state.isLoaded);
  const isBannerLoaded = useBannerStore((state) => state.isLoaded);
  const isBrandShowcaseLoaded = useBrandShowcaseStore((state) => state.isLoaded);
  const isCategoryLoaded = useCategoryStore((state) => state.isLoaded);
  const isProductLoaded = useProductStore((state) => state.isLoaded);
  
  const isAppReady = isConfigLoaded && isSettingsLoaded && isBrandingLoaded && isSiteManagementLoaded && isBannerLoaded && isBrandShowcaseLoaded && isCategoryLoaded && isProductLoaded;

  return (
    <Router>
      <AnalyticsRouteListener />
      <Toaster />
      <CookieConsentBanner />
      <ThemeInitializer />
      <RuntimeDiagnostics />
      <Routes>
        <Route path="/site/:storeDomain/*" element={<LiveWebsiteGenerator />} />
        <Route path="/site-admin/:storeDomain/*" element={<LiveWebsiteAdmin />} />
        
        {/* User Facing Routes */}
        <Route path="/" element={<UserLayout />}>
          <Route index element={<Home />} />
          <Route path="category/:id" element={<CategoryPage />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="product/:slug/reviews" element={<ReviewDetails />} />
          <Route path="support" element={<Support />} />
          <Route path="offers" element={<Offers />} />
          <Route path="products" element={<AllProducts />} />
          <Route path="campaign/:id" element={<CampaignProductsPage />} />
          <Route path="shop" element={<div className="container mx-auto py-24 text-center text-primary-900"><h1 className="text-4xl font-serif mb-4">All Products</h1><p className="text-gray-500">Shop all luxury items.</p></div>} />
          <Route path="categories" element={<Categories />} />
          <Route path="search" element={<Search />} />
          <Route path="account" element={<Login />} />
          <Route path="viewer" element={<WebViewViewer />} />
          
          <Route path="cart" element={<Cart />} />
          <Route path="login" element={<Login />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          
          <Route path="checkout" element={<Checkout />} />
          <Route path="checkout/success/:orderId" element={<OrderSuccess />} />
          <Route path="checkout/invoice/:orderId" element={<OrderInvoice />} />
          <Route path="orders" element={<OrderHistoryPage />} />
          <Route path="orders/:id" element={<OrderDetailView />} />
          <Route path="account/orders" element={<OrderHistoryPage />} />
          <Route path="account/orders/:status" element={<OrderHistoryPage />} />
          <Route path="account/orders/details/:id" element={<OrderDetailView />} />
          <Route path="notifications" element={<CustomerNotificationsPage />} />
          <Route path="account/notifications" element={<CustomerNotificationsPage />} />
          <Route path="coupons" element={<CouponsAndOffersPage />} />
          <Route path="offers" element={<CouponsAndOffersPage />} />
          <Route path="campaigns-and-offers" element={<CouponsAndOffersPage />} />
          <Route path="account/coupons" element={<CouponsAndOffersPage />} />

          <Route path="admin/link-pages" element={<AdminContentPages />} />
          {/* Dynamic & Content Pages */}
          <Route path="brands" element={<BrandsInformationPage />} />
          <Route path="about-us" element={<AboutUsPage />} />
          <Route path="about" element={<AboutUsPage />} />
          <Route path="contact-us" element={<ContactUsPage />} />
          <Route path="contact" element={<ContactUsPage />} />
          <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="privi" element={<PrivacyPolicyPage />} />
          <Route path="privi-policy" element={<PrivacyPolicyPage />} />
          <Route path="policy/privacy" element={<PrivacyPolicyPage />} />
          <Route path="policy/:type" element={<PolicyPage />} />
          <Route path="terms-and-conditions" element={<TermsConditionsPage />} />
          <Route path="terms" element={<TermsConditionsPage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="refund" element={<RefundPolicyPage />} />
          <Route path=":slug" element={<DynamicLinkPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="account/dashboard" element={<Account />} />
            <Route path="games" element={<Games />} />
            <Route path="help-center" element={<Settings />} />
            <Route path="my-reviews" element={<MyReviews />} />
            <Route path="payment-methods" element={<Settings />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="*" element={<div className="container mx-auto py-24 text-center text-primary-900"><h1 className="text-4xl font-serif mb-4">404</h1><p className="text-gray-500">Page Not Found</p></div>} />
        </Route>

        {/* Admin Dashboard */}
        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}
