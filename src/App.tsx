import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
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
import About from "./pages/About";
import Contact from "./pages/Contact";
import Stay from "./pages/Stay";
import RoomDetail from './pages/RoomDetail';
import SearchAvailability from './pages/SearchAvailability';
import Dining from './pages/Dining';
import Activities from "./pages/Activities";
import ActivityDetail from "./pages/ActivityDetail";
import Spa from "./pages/Spa";
import SpaServiceDetail from "./pages/SpaServiceDetail";
import Experiences from "./pages/Experiences";
import Journal from "./pages/Journal";
import BlogPost from "./pages/BlogPost";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import Policies from "./pages/Policies";
import BookingConfirmation from "./pages/BookingConfirmation";

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
import MealsManagement from "./pages/admin/MealsManagement";
import MealPlansManagement from "./pages/admin/MealPlansManagement";
import CancellationPoliciesManagement from "./pages/admin/CancellationPoliciesManagement";
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
import FAQManagement from "./pages/admin/FAQManagement";
import DynamicPage from "./pages/DynamicPage";
import PricingDashboard from "./pages/admin/PricingDashboard";
import BaseConfiguration from "./pages/admin/BaseConfiguration";
import BasePricing from "./pages/admin/BasePricing";
import PricingRules from "./pages/admin/PricingRules";
import LiveRateCard from "./pages/admin/LiveRateCard";
import GSTConfiguration from "./pages/admin/GSTConfiguration";
import { Navigate } from 'react-router-dom';
// Old imports kept for backwards compatibility within consolidated pages
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
            <ShadcnToaster />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
              {/* General Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/stay" element={<Stay />} />
              <Route path="/stay/:roomId" element={<RoomDetail />} />
              <Route path="/search-availability" element={<SearchAvailability />} />
              <Route path="/dining" element={<Dining />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/activities/:activityId" element={<ActivityDetail />} />
              <Route path="/spa" element={<Spa />} />
              <Route path="/spa/:serviceId" element={<SpaServiceDetail />} />
              <Route path="/experiences" element={<Experiences />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/:slug" element={<BlogPost />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/booking/confirmation" element={<BookingConfirmation />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/packages/:packageId" element={<PackageDetail />} />
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
                <Route path="pricing" element={<PricingDashboard />} />
                <Route path="pricing/config" element={<BaseConfiguration />} />
                <Route path="pricing/rates" element={<BasePricing />} />
                <Route path="pricing/rules" element={<PricingRules />} />
                <Route path="pricing/rate-card" element={<LiveRateCard />} />
                <Route path="pricing/meal-plans" element={<MealPlansManagement />} />
                <Route path="pricing/cancellation-policies" element={<CancellationPoliciesManagement />} />
                <Route path="pricing/gst" element={<GSTConfiguration />} />
                
                {/* Redirects for backwards compatibility */}
                <Route path="pricing/categories" element={<Navigate to="/admin/pricing/rates?tab=categories" replace />} />
                <Route path="pricing/units" element={<Navigate to="/admin/pricing/rates?tab=units" replace />} />
            <Route path="pricing/seasons" element={<Navigate to="/admin/pricing/config?section=seasons" replace />} />
            <Route path="pricing/rounding" element={<Navigate to="/admin/pricing/config?section=rounding" replace />} />
            <Route path="rooms" element={<RoomManagement />} />
            <Route path="packages" element={<PackageManagement />} />
            <Route path="meals" element={<MealsManagement />} />
            <Route path="dining" element={<Navigate to="/admin/meals" replace />} />
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
                <Route path="faq" element={<FAQManagement />} />
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
