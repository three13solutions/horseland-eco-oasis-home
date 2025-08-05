
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TranslationProvider } from "./components/admin/TranslationProvider";
import ScrollToTop from "./components/ScrollToTop";
import "./lib/i18n";
import Index from "./pages/Index";
import IndexV2 from "./pages/IndexV2";
import IndexV3 from "./pages/IndexV3";
import IndexV4 from "./pages/IndexV4";
import IndexV5 from "./pages/IndexV5";
import About from "./pages/About";
import Stay from "./pages/Stay";
import Experiences from "./pages/Experiences";
import Activities from "./pages/Activities";
import Dining from "./pages/Dining";
import Spa from "./pages/Spa";
import Packages from "./pages/Packages";
import Journal from "./pages/Journal";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Policies from "./pages/Policies";
import RoomDetail from "./pages/RoomDetail";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import RoomManagement from "./pages/admin/RoomManagement";
import UserManagement from "./pages/admin/UserManagement";
import SiteSettings from "./pages/admin/SiteSettings";
import ContentManagement from "./pages/admin/ContentManagement";
import MediaManagement from "./pages/admin/MediaManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TranslationProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
        <Routes>
          <Route path="/" element={<IndexV5 />} />
          <Route path="/v1" element={<Index />} />
          <Route path="/v2" element={<IndexV2 />} />
          <Route path="/v3" element={<IndexV3 />} />
          <Route path="/v4" element={<IndexV4 />} />
          <Route path="/v5" element={<IndexV5 />} />
          <Route path="/about" element={<About />} />
          <Route path="/stay" element={<Stay />} />
          <Route path="/stay/:roomId" element={<RoomDetail />} />
          <Route path="/experiences" element={<Experiences />} />
          <Route path="/experiences/activities" element={<Activities />} />
          <Route path="/experiences/dining" element={<Dining />} />
          <Route path="/experiences/spa" element={<Spa />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/rooms" element={<RoomManagement />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/media" element={<MediaManagement />} />
          <Route path="/admin/settings" element={<SiteSettings />} />
          <Route path="/admin/content" element={<ContentManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TranslationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
