import React, { useEffect } from 'react';
import NavigationV5 from '@/components/v5/NavigationV5';
import DynamicFooter from '@/components/DynamicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CreditCard, Eye, FileText, Clock, Users } from 'lucide-react';

const Policies = () => {
  const [activeTab, setActiveTab] = React.useState('booking');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['booking', 'cancellation', 'payment', 'privacy', 'terms', 'guest'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Our <span className="text-primary">Policies</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Clear, transparent policies to ensure you have the best possible experience at Horseland Hotel.
            </p>
          </div>
        </div>
      </section>

      {/* Policies Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="booking">Booking</TabsTrigger>
              <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
              <TabsTrigger value="guest">Guest</TabsTrigger>
            </TabsList>

            <TabsContent value="booking" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span>Booking Policy</span>
                  </CardTitle>
                  <CardDescription>
                    Information about making reservations and booking procedures
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Reservation Requirements</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• All reservations require advance booking with confirmation</li>
                      <li>• A 100% advance payment is required at the time of reservation</li>
                      <li>• Valid photo ID required at check-in for all guests</li>
                      <li>• The hotel reserves the right to deny admission without prior notice or reason</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Identification Documents</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Indian nationals: Passport, Aadhaar Card, Driving License, Voter ID, or PAN Card</li>
                      <li>• Foreign nationals: Passport and a valid visa</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Check-in / Check-out</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Standard check-in: 12:00 noon</li>
                      <li>• Standard check-out: 10:00 AM</li>
                      <li>• Early check-in/late check-out subject to availability and charges</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Children & Age Policy</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Children below 4 years stay free</li>
                      <li>• Children 4–9 years charged at half rate</li>
                      <li>• Guests 9 years and above are charged as adults</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Group Bookings</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Group bookings (8+ guests) require special arrangements</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">GST & Taxes</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• All rates are exclusive of GST</li>
                      <li>• Applicable GST: 5%, 12%, 18%, or 28% depending on service</li>
                      <li>• Taxes are subject to change as per government regulations</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cancellation" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Cancellation Policy</span>
                  </CardTitle>
                  <CardDescription>
                    Terms and conditions for booking modifications and cancellations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Standard Cancellation</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Free – 15 days prior to check-in</li>
                      <li>• 25% – 7 to 3 days before check-in</li>
                      <li>• 50% – 2 days to 24 hours before check-in</li>
                      <li>• 100% – Within 24 hours or no-show</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Peak Seasons, Weekends & Festivals</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• 75% – 7 to 3 days before check-in (instead of 25%/50%)</li>
                      <li>• 100% – Within 24 hours or no-show</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Refunds & Credit Notes</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• No cash refunds in any case</li>
                      <li>• Credit notes issued for all cancellations</li>
                      <li>• Valid for 6 months from issue date</li>
                      <li>• Redeemable at prevailing rates, subject to availability</li>
                      <li>• Bookings under privileged/promotional offers are non-cancellable, non-refundable, and non-changeable. Please check applicable promotion terms.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Modifications</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Guest count or room type changes allowed if available, with rate difference</li>
                      <li>• One-time modification allowed up to 24 hours before check-in, subject to availability</li>
                      <li>• Date changes are treated as cancellations and rebooked via credit note as per policy.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Contact for Cancellations</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• For cancellations or changes, please contact our Reservations Desk:</li>
                      <li>• Email: info@horeselandhotel.com</li>
                      <li>• Mahesh: 9404224600</li>
                      <li>• Sachin: 9004424567</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span>Payment Policy</span>
                  </CardTitle>
                  <CardDescription>
                    Payment methods, billing information, and refund procedures
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Accepted Payment Methods</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Credit/Debit Cards (Visa, MasterCard, AmEx)</li>
                      <li>• Digital payments (UPI, Google Pay, PhonePe)</li>
                      <li>• Bank transfers / NEFT</li>
                      <li>• Cash accepted only for walk-in bookings, subject to availability and prevailing rates</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Payment Schedule</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• A 100% advance payment is required at the time of reservation</li>
                      <li>• Booking confirmed only after receipt of full payment</li>
                      <li>• Additional services billed at check-out</li>
                      <li>• Guests are liable for charges relating to lost keys or damage to property (settled in the final billing)</li>
                      <li>• All dues, including extras, must be cleared before departure</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Rates & Taxes</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• All rates are exclusive of GST</li>
                      <li>• GST is applied separately at the time of invoicing/booking</li>
                      <li>• Applicable rates: 5%, 12%, 18%, or 28% depending on service</li>
                      <li>• Taxes are subject to change as per government regulation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <span>Privacy Policy</span>
                  </CardTitle>
                  <CardDescription>
                    How we collect, use, and protect your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Information We Collect</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Government-issued ID details as required by law</li>
                      <li>• Personal details for reservation and check-in</li>
                      <li>• Contact information for booking and communication</li>
                      <li>• Transaction details such as booking dates, amount, and services</li>
                      <li>• Payment details processed securely by our payment gateway (not stored by us)</li>
                      <li>• Guest details, including room preferences, dietary needs, family size, and travel purpose</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">How We Use Your Information</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Process reservations and provide hotel services</li>
                      <li>• Share important updates about your stay</li>
                      <li>• Maintain records for service history and accounting</li>
                      <li>• Meet compliance and legal obligations</li>
                      <li>• Improve services and guest experience</li>
                      <li>• Personalize services based on guest needs</li>
                      <li>• Send marketing communications (with your consent)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Data Protection & Security</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Secure encryption for sensitive data</li>
                      <li>• Access is limited to authorized staff</li>
                      <li>• Regular audits and security updates</li>
                      <li>• Physical, electronic, and managerial safeguards</li>
                      <li>• Compliance with data protection and legal requirements</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Cookies and Preferences</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Store preferences and session information</li>
                      <li>• Some features may not work if cookies are disabled</li>
                      <li>• Cookie data is confidential and not shared outside the company</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Links to Other Websites</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Our site may contain links to third-party websites</li>
                      <li>• We are not responsible for their privacy practices</li>
                      <li>• Review their policies before sharing information</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Your Rights & Control Over Personal Information</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• We do not sell or lease your data without consent, unless required by law</li>
                      <li>• You may request details of the personal data we hold</li>
                      <li>• You may request corrections if your data is inaccurate or incomplete</li>
                      <li>• Verified corrections will be updated promptly</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="terms" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Terms of Service</span>
                  </CardTitle>
                  <CardDescription>
                    Legal terms and conditions for using our services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">General Terms</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Applies to all guests and services</li>
                      <li>• The hotel may modify terms with notice</li>
                      <li>• Disputes are subject to local jurisdiction</li>
                      <li>• Force majeure events may affect service availability</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Liability</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Hotel liability limited to direct damages only</li>
                      <li>• Guests are responsible for their belongings</li>
                      <li>• Valuables must be deposited at reception for safekeeping</li>
                      <li>• Guests are liable for loss or damage to room keys caused by themselves, friends, or visitors</li>
                      <li>• Guests are liable for damage to hotel property caused by themselves, friends, or visitors</li>
                      <li>• Travel insurance is recommended for full coverage</li>
                      <li>• Participation in activities is at the guest's own risk</li>
                      <li>• No refunds or discounts for service interruptions (electricity, AC, TV, Wi-Fi)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Intellectual Property</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Website content is protected by copyright</li>
                      <li>• Hotel name and logo are registered trademarks</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Dining, Swimming & Hot Water Timings</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Dining Hall:</li>
                      <li className="ml-4">Breakfast: 8:30 – 10:30 AM</li>
                      <li className="ml-4">Lunch: 1:30 – 3:00 PM</li>
                      <li className="ml-4">Evening Tea/Coffee/Snacks: 4:30 – 6:00 PM</li>
                      <li className="ml-4">Dinner: 8:30 – 10:30 PM</li>
                      <li>• Swimming Pool: 8:30 AM – 6:00 PM (swimming costume compulsory)</li>
                      <li>• Hot Water Supply:</li>
                      <li className="ml-4">Morning: 7:30 – 10:30 AM</li>
                      <li className="ml-4">Evening: 5:00 – 7:00 PM</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Wi-Fi Usage</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Free Wi-Fi is available in designated areas</li>
                      <li>• Office Wi-Fi is functional only at reception/office area</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guest" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Guest Conduct Policy</span>
                  </CardTitle>
                  <CardDescription>
                    Guidelines for behavior and conduct during your stay
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">General Conduct</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Respectful behavior towards staff and other guests</li>
                      <li>• Drunk, rude, or abusive behavior will not be tolerated</li>
                      <li>• Avoid loud noise, shouting, or playing TV/music at high volume</li>
                      <li>• Compliance with hotel rules and regulations</li>
                      <li>• Quiet hours: 12:00 midnight – 6:00 AM</li>
                      <li>• The hotel reserves the right to remove guests for non-compliance with rules</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Food, Alcohol & Smoking</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Outside food and beverages are not permitted in the hotel premises or rooms</li>
                      <li>• Outside alcohol is not permitted in the buffet/dining area</li>
                      <li>• Smoking is prohibited in all rooms and indoor hotel areas</li>
                      <li>• Hookah is strictly banned as per the Maharashtra State law</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Environmental Responsibility</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Respect Matheran's eco-sensitive environment</li>
                      <li>• No littering or damage to natural surroundings</li>
                      <li>• Conserve water and electricity</li>
                      <li>• Participate in the hotel's sustainability initiatives</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Safety Guidelines</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Follow the safety instructions provided by the hotel staff</li>
                      <li>• Report any safety concerns immediately</li>
                      <li>• Use safety equipment for outdoor activities</li>
                      <li>• No unauthorized access to restricted areas</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Keys & Hotel Property</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Treat hotel property and room keys with care and respect</li>
                      <li>• Do not abuse, mishandle, or damage property</li>
                      <li>• Keys must be deposited at reception when leaving the hotel</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
};

export default Policies;