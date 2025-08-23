import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import ScrollToTop from './components/ScrollToTop';
import { TranslationProvider } from './components/admin/TranslationProvider';

// General
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Stay from "./pages/Stay";
import Dining from "./pages/Dining";
import Activities from "./pages/Activities";
import Spa from "./pages/Spa";
import Experiences from "./pages/Experiences";
import Journal from "./pages/Journal";
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
import ContentManagement from "./pages/admin/ContentManagement";
import IntegrationsManagement from "./pages/admin/IntegrationsManagement"; // Added
import UserManagement from "./pages/admin/UserManagement";
import SiteSettings from "./pages/admin/SiteSettings";

const queryClient = new QueryClient();

function App() {
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
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/stay" element={<Stay />} />
              <Route path="/dining" element={<Dining />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/spa" element={<Spa />} />
              <Route path="/experiences" element={<Experiences />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/policies" element={<Policies />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="bookings" element={<BookingManagement />} />
                <Route path="guests" element={<GuestManagement />} />
                <Route path="payments" element={<PaymentManagement />} />
                <Route path="invoices" element={<InvoiceManagement />} />
                <Route path="rooms" element={<RoomManagement />} />
                <Route path="packages" element={<PackageManagement />} />
                <Route path="dining" element={<DiningManagement />} />
                <Route path="activities" element={<ActivitiesManagement />} />
                <Route path="spa" element={<SpaManagement />} />
                <Route path="addons" element={<AddonsManagement />} />
                <Route path="media" element={<MediaManagement />} />
                <Route path="content" element={<ContentManagement />} />
                <Route path="integrations" element={<IntegrationsManagement />} />
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
