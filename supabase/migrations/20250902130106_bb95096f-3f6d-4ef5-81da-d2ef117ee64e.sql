-- Create policies content table for managing policies sections
CREATE TABLE public.policies_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policies_content ENABLE ROW LEVEL SECURITY;

-- Create policies for admin management
CREATE POLICY "Admin users can manage policies content" 
ON public.policies_content 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);

-- Anyone can view active policies content
CREATE POLICY "Anyone can view active policies content" 
ON public.policies_content 
FOR SELECT 
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_policies_content_updated_at
BEFORE UPDATE ON public.policies_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default policies sections
INSERT INTO public.policies_content (section_key, title, description, content, icon, sort_order) VALUES
('booking', 'Booking Policy', 'Information about making reservations and booking procedures', '{"sections": [{"title": "Reservation Requirements", "items": ["All reservations require advance booking with confirmation", "A 100% advance payment is required at the time of reservation", "Valid photo ID required at check-in for all guests", "The hotel reserves the right to deny admission without prior notice or reason"]}, {"title": "Identification Documents", "items": ["Indian nationals: Passport, Aadhaar Card, Driving License, Voter ID, or PAN Card", "Foreign nationals: Passport and a valid visa"]}, {"title": "Check-in / Check-out", "items": ["Standard check-in: 12:00 noon", "Standard check-out: 10:00 AM", "Early check-in/late check-out subject to availability and charges"]}, {"title": "Children & Age Policy", "items": ["Children below 4 years stay free", "Children 4–9 years charged at half rate", "Guests 9 years and above are charged as adults"]}, {"title": "Group Bookings", "items": ["Group bookings (8+ guests) require special arrangements"]}, {"title": "GST & Taxes", "items": ["All rates are exclusive of GST", "Applicable GST: 5%, 12%, 18%, or 28% depending on service", "Taxes are subject to change as per government regulations"]}]}', 'Clock', 1),

('cancellation', 'Cancellation Policy', 'Terms and conditions for booking modifications and cancellations', '{"sections": [{"title": "Standard Cancellation", "items": ["Free – 15 days prior to check-in", "25% – 7 to 3 days before check-in", "50% – 2 days to 24 hours before check-in", "100% – Within 24 hours or no-show"]}, {"title": "Peak Seasons, Weekends & Festivals", "items": ["75% – 7 to 3 days before check-in (instead of 25%/50%)", "100% – Within 24 hours or no-show"]}, {"title": "Refunds & Credit Notes", "items": ["No cash refunds in any case", "Credit notes issued for all cancellations", "Valid for 6 months from issue date", "Redeemable at prevailing rates, subject to availability", "Bookings under privileged/promotional offers are non-cancellable, non-refundable, and non-changeable. Please check applicable promotion terms."]}, {"title": "Modifications", "items": ["Guest count or room type changes allowed if available, with rate difference", "One-time modification allowed up to 24 hours before check-in, subject to availability", "Date changes are treated as cancellations and rebooked via credit note as per policy."]}, {"title": "Contact for Cancellations", "items": ["For cancellations or changes, please contact our Reservations Desk:", "Email: info@horeselandhotel.com", "Mahesh: 9404224600", "Sachin: 9004424567"]}]}', 'FileText', 2),

('payment', 'Payment Policy', 'Payment methods, billing information, and refund procedures', '{"sections": [{"title": "Accepted Payment Methods", "items": ["Credit/Debit Cards (Visa, MasterCard, AmEx)", "Digital payments (UPI, Google Pay, PhonePe)", "Bank transfers / NEFT", "Cash accepted only for walk-in bookings, subject to availability and prevailing rates"]}, {"title": "Payment Schedule", "items": ["A 100% advance payment is required at the time of reservation", "Booking confirmed only after receipt of full payment", "Additional services billed at check-out", "Guests are liable for charges relating to lost keys or damage to property (settled in the final billing)", "All dues, including extras, must be cleared before departure"]}, {"title": "Rates & Taxes", "items": ["All rates are exclusive of GST", "GST is applied separately at the time of invoicing/booking", "Applicable rates: 5%, 12%, 18%, or 28% depending on service", "Taxes are subject to change as per government regulation"]}]}', 'CreditCard', 3),

('privacy', 'Privacy Policy', 'How we collect, use, and protect your personal information', '{"sections": [{"title": "Information We Collect", "items": ["Government-issued ID details as required by law", "Personal details for reservation and check-in", "Contact information for booking and communication", "Transaction details such as booking dates, amount, and services", "Payment details processed securely by our payment gateway (not stored by us)", "Guest details, including room preferences, dietary needs, family size, and travel purpose"]}, {"title": "How We Use Your Information", "items": ["Process reservations and provide hotel services", "Share important updates about your stay", "Maintain records for service history and accounting", "Meet compliance and legal obligations", "Improve services and guest experience", "Personalize services based on guest needs", "Send marketing communications (with your consent)"]}, {"title": "Data Protection & Security", "items": ["Secure encryption for sensitive data", "Access is limited to authorized staff", "Regular audits and security updates", "Physical, electronic, and managerial safeguards", "Compliance with data protection and legal requirements"]}, {"title": "Cookies and Preferences", "items": ["Store preferences and session information", "Some features may not work if cookies are disabled", "Cookie data is confidential and not shared outside the company"]}, {"title": "Links to Other Websites", "items": ["Our site may contain links to third-party websites", "We are not responsible for their privacy practices", "Review their policies before sharing information"]}, {"title": "Your Rights & Control Over Personal Information", "items": ["We do not sell or lease your data without consent, unless required by law", "You may request details of the personal data we hold", "You may request corrections if your data is inaccurate or incomplete", "Verified corrections will be updated promptly"]}]}', 'Eye', 4),

('terms', 'Terms of Service', 'Legal terms and conditions for using our services', '{"sections": [{"title": "General Terms", "items": ["Applies to all guests and services", "The hotel may modify terms with notice", "Disputes are subject to local jurisdiction", "Force majeure events may affect service availability"]}, {"title": "Liability", "items": ["Hotel liability limited to direct damages only", "Guests are responsible for their belongings", "Valuables must be deposited at reception for safekeeping", "Insurance recommended for personal items"]}, {"title": "Intellectual Property", "items": ["Hotel content is proprietary and protected", "Guests may not reproduce or distribute hotel materials", "Photography for commercial use requires permission"]}, {"title": "Service Standards", "items": ["We strive to provide excellent service", "Service levels may vary during peak seasons", "Feedback and complaints handled promptly", "Quality standards maintained through regular training"]}]}', 'Shield', 5),

('guest', 'Guest Conduct', 'Guidelines for guest behavior and hotel rules', '{"sections": [{"title": "General Conduct", "items": ["Respectful behavior towards staff and other guests", "Compliance with hotel rules and local laws", "No smoking in non-designated areas", "Quiet hours: 10 PM to 7 AM"]}, {"title": "Property Care", "items": ["Care for hotel property and facilities", "Report damages or maintenance issues promptly", "Additional charges for damages beyond normal wear", "Lost room keys incur replacement charges"]}, {"title": "Safety & Security", "items": ["Follow safety instructions and emergency procedures", "Keep valuables secured or deposited at reception", "Report suspicious activities to hotel security", "Comply with fire safety and evacuation procedures"]}, {"title": "Prohibited Activities", "items": ["No illegal substances or activities", "No pets unless pre-approved", "No outside food in dining areas", "No loud music or disturbances during quiet hours"]}]}', 'Users', 6);

-- Add policies section to translation_sections
INSERT INTO public.translation_sections (section_key, section_name, description, sort_order) 
VALUES ('policies', 'Policies Content', 'Manage policies content and translations', 6)
ON CONFLICT (section_key) DO NOTHING;