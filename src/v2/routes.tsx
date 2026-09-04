import { Route } from 'react-router-dom';

import V2Index from './pages/Index';
import V2About from './pages/About';
import V2Contact from './pages/Contact';
import V2Stay from './pages/Stay';
import V2RoomDetail from './pages/RoomDetail';
import V2Dining from './pages/Dining';
import V2Activities from './pages/Activities';
import V2ActivityDetail from './pages/ActivityDetail';
import V2Spa from './pages/Spa';
import V2SpaServiceDetail from './pages/SpaServiceDetail';
import V2Experiences from './pages/Experiences';
import V2Journal from './pages/Journal';
import V2BlogPost from './pages/BlogPost';
import V2Packages from './pages/Packages';
import V2PackageDetail from './pages/PackageDetail';
import V2FAQ from './pages/FAQ';
import V2Policies from './pages/Policies';
import V2STAAHBooking from './pages/STAAHBooking';
import V2DynamicPage from './pages/DynamicPage';
import V2NotFound from './pages/NotFound';

// Version 2: fully static, CMS-independent frontend.
export const v2Routes = (
  <Route path="/v2">
    <Route index element={<V2Index />} />
    <Route path="about" element={<V2About />} />
    <Route path="contact" element={<V2Contact />} />
    <Route path="stay" element={<V2Stay />} />
    <Route path="stay/:roomId" element={<V2RoomDetail />} />
    <Route path="dining" element={<V2Dining />} />
    <Route path="activities" element={<V2Activities />} />
    <Route path="activities/:activityId" element={<V2ActivityDetail />} />
    <Route path="spa" element={<V2Spa />} />
    <Route path="spa/:serviceId" element={<V2SpaServiceDetail />} />
    <Route path="experiences" element={<V2Experiences />} />
    <Route path="journal" element={<V2Journal />} />
    <Route path="journal/:slug" element={<V2BlogPost />} />
    <Route path="packages" element={<V2Packages />} />
    <Route path="packages/:packageId" element={<V2PackageDetail />} />
    <Route path="faq" element={<V2FAQ />} />
    <Route path="policies" element={<V2Policies />} />
    <Route path="staah-booking" element={<V2STAAHBooking />} />
    <Route path=":slug" element={<V2DynamicPage />} />
    <Route path="*" element={<V2NotFound />} />
  </Route>
);

export default v2Routes;
