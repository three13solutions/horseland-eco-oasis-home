import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import ScrollToTop from './components/ScrollToTop';

// General
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Rooms from "./pages/Rooms";
import Dining from "./pages/Dining";
import Activities from "./pages/Activities";
import Spa from "./pages/Spa";
import Gallery from "./pages/Gallery";
import Offers from "./pages/Offers";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Bookings from "./pages/Bookings";
import NotFound from "./pages/NotFound";
import Testimonials from "./pages/Testimonials";
import Packages from "./pages/Packages";
import PackageDetails from "./pages/PackageDetails";

// Auth
import PasswordReset from "./pages/PasswordReset";
import UpdatePassword from "./pages/UpdatePassword";

// Admin imports
import AdminLogin from "./pages/AdminLogin";
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
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* General Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/dining" element={<Dining />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/spa" element={<Spa />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/packages/:id" element={<PackageDetails />} />
              <Route path="/testimonials" element={<Testimonials />} />

              {/* Auth Routes */}
              <Route path="/password-reset" element={<PasswordReset />} />
              <Route path="/update-password" element={<UpdatePassword />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/bookings" element={<BookingManagement />} />
              <Route path="/admin/guests" element={<GuestManagement />} />
              <Route path="/admin/payments" element={<PaymentManagement />} />
              <Route path="/admin/invoices" element={<InvoiceManagement />} />
              <Route path="/admin/rooms" element={<RoomManagement />} />
              <Route path="/admin/packages" element={<PackageManagement />} />
              <Route path="/admin/dining" element={<DiningManagement />} />
              <Route path="/admin/activities" element={<ActivitiesManagement />} />
              <Route path="/admin/spa" element={<SpaManagement />} />
              <Route path="/admin/media" element={<MediaManagement />} />
              <Route path="/admin/content" element={<ContentManagement />} />
              <Route path="/admin/integrations" element={<IntegrationsManagement />} /> {/* Added */}
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/settings" element={<SiteSettings />} />
              
              {/* Catch All Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export default App;
