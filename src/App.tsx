import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import ScrollToTop from './components/ScrollToTop';
import { TranslationProvider } from './components/admin/TranslationProvider';
import { useFavicon } from './hooks/useFavicon';

// General
import Index from "./pages/Index";
import IndexV2 from "./pages/IndexV2";
import IndexV3 from "./pages/IndexV3";
import IndexV4 from "./pages/IndexV4";
import IndexV5 from "./pages/IndexV5";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Stay from "./pages/Stay";
import RoomDetail from "./pages/RoomDetail";
import Dining from "./pages/Dining";
import Activities from "./pages/Activities";
import Spa from "./pages/Spa";
import Experiences from "./pages/Experiences";
import Journal from "./pages/Journal";
import BlogPost from "./pages/BlogPost";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import Packages from "./pages/Packages";
import Policies from "./pages/Policies";

// Admin imports
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import BookingManagement from "./pages/admin/BookingManagement";
import GuestManagement from "./pages/admin/GuestManagement";
import PaymentManagement from "./pages/admin/PaymentManagement";
import InvoiceManagement from "./pages/admin/InvoiceManagement";
import RoomManagement from "./pages/admin/RoomManagement";
import PackageManagement from "./pages/admin/PackageManagement";
import DiningManagement from "./pages/admin/DiningManagement";
import ActivitiesManagement from "./pages/admin/ActivitiesManagement";
import SpaManagement from "./pages/admin/SpaManagement";
import AddonsManagement from "./pages/admin/AddonsManagement";
import MediaManagement from "./pages/admin/MediaManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";
import GalleryManagement from "./pages/admin/GalleryManagement";
import ContentManagement from "./pages/admin/ContentManagement";
import IntegrationsManagement from "./pages/admin/IntegrationsManagement";
import UserManagement from "./pages/admin/UserManagement";
import SiteSettings from "./pages/admin/SiteSettings";
import BlogManagement from "./pages/admin/BlogManagement";
import PageManagement from "./pages/admin/PageManagement";
import DynamicPage from "./pages/DynamicPage";
import CategoryPricing from "./pages/admin/CategoryPricing";
import UnitPricing from "./pages/admin/UnitPricing";
import SeasonRules from "./pages/admin/SeasonRules";
import RoundingRule from "./pages/admin/RoundingRule";

const queryClient = new QueryClient();

function App() {
  // Load and apply dynamic favicon
  useFavicon();
  
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <TranslationProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
              {/* General Routes */}
              <Route path="/" element={<IndexV5 />} />
              <Route path="/v1" element={<Index />} />
              <Route path="/v2" element={<IndexV2 />} />
              <Route path="/v3" element={<IndexV3 />} />
              <Route path="/v4" element={<IndexV4 />} />
              <Route path="/v5" element={<IndexV5 />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/stay" element={<Stay />} />
              <Route path="/stay/:roomId" element={<RoomDetail />} />
              <Route path="/dining" element={<Dining />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/spa" element={<Spa />} />
              <Route path="/experiences" element={<Experiences />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/:slug" element={<BlogPost />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/policies" element={<Policies />} />
              
              {/* Dynamic Pages Route */}
              <Route path="/:slug" element={<DynamicPage />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="bookings" element={<BookingManagement />} />
                <Route path="guests" element={<GuestManagement />} />
                <Route path="payments" element={<PaymentManagement />} />
                <Route path="invoices" element={<InvoiceManagement />} />
                <Route path="pricing/categories" element={<CategoryPricing />} />
                <Route path="pricing/units" element={<UnitPricing />} />
                <Route path="pricing/seasons" element={<SeasonRules />} />
                <Route path="pricing/rounding" element={<RoundingRule />} />
                <Route path="rooms" element={<RoomManagement />} />
                <Route path="packages" element={<PackageManagement />} />
                <Route path="dining" element={<DiningManagement />} />
                <Route path="activities" element={<ActivitiesManagement />} />
                <Route path="spa" element={<SpaManagement />} />
                <Route path="addons" element={<AddonsManagement />} />
                <Route path="media" element={<MediaManagement />} />
                <Route path="categories" element={<CategoryManagement />} />
                <Route path="galleries" element={<GalleryManagement />} />
                <Route path="content" element={<ContentManagement />} />
                <Route path="integrations" element={<IntegrationsManagement />} />
                <Route path="blog" element={<BlogManagement />} />
                <Route path="pages" element={<PageManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="settings" element={<SiteSettings />} />
              </Route>
              
              {/* Catch All Route */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TranslationProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export default App;
