import React from 'react';
import NavigationV5 from '@/components/v5/NavigationV5';
import DynamicFooter from '@/components/DynamicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CreditCard, Eye, FileText, Clock, Users } from 'lucide-react';

const Policies = () => {
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
              Clear, transparent policies to ensure you have the best possible experience at Horseland Hotel & Mountain Spa.
            </p>
          </div>
        </div>
      </section>

      {/* Policies Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <Tabs defaultValue="booking" className="max-w-4xl mx-auto">
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
                      <li>• Valid photo identification required at check-in</li>
                      <li>• Credit card or advance payment required to secure booking</li>
                      <li>• Group bookings (8+ guests) require special arrangements</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Check-in / Check-out</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Standard check-in: 2:00 PM</li>
                      <li>• Standard check-out: 11:00 AM</li>
                      <li>• Early check-in/late check-out subject to availability</li>
                      <li>• Late check-out may incur additional charges</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Age Restrictions</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Guests under 18 must be accompanied by an adult</li>
                      <li>• Children under 5 stay free when sharing parents' bed</li>
                      <li>• Extra bed charges apply for children 5-12 years</li>
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
                      <li>• Free cancellation up to 48 hours before arrival</li>
                      <li>• Cancellations within 48 hours: 50% of total booking amount</li>
                      <li>• No-show or same-day cancellation: 100% of booking amount</li>
                      <li>• Refunds processed within 7-10 business days</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Peak Season Policy</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• During peak season (Dec 20 - Jan 5): 7-day advance cancellation required</li>
                      <li>• Cancellations within 7 days: 75% of total booking amount</li>
                      <li>• Festival periods may have stricter cancellation terms</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Modification Policy</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Date changes subject to availability and rate differences</li>
                      <li>• Room upgrades available based on availability</li>
                      <li>• Guest count changes must be confirmed 24 hours in advance</li>
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
                      <li>• Credit/Debit Cards (Visa, MasterCard, American Express)</li>
                      <li>• Digital payments (UPI, Google Pay, PhonePe)</li>
                      <li>• Bank transfers and NEFT</li>
                      <li>• Cash payments accepted at the property</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Payment Schedule</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• 50% advance payment required to confirm booking</li>
                      <li>• Remaining balance due at check-in</li>
                      <li>• Additional services charged at check-out</li>
                      <li>• All rates include applicable taxes</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Refund Information</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Refunds processed according to cancellation policy</li>
                      <li>• Bank transfer refunds: 7-10 business days</li>
                      <li>• Credit card refunds: 10-15 business days</li>
                      <li>• Processing fees may apply for certain payment methods</li>
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
                      <li>• Personal details for reservation and check-in purposes</li>
                      <li>• Contact information for booking confirmation and communication</li>
                      <li>• Payment information for processing transactions</li>
                      <li>• Preferences to enhance your stay experience</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">How We Use Your Information</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Processing reservations and providing hotel services</li>
                      <li>• Communicating important information about your stay</li>
                      <li>• Improving our services and guest experience</li>
                      <li>• Marketing communications (with your consent)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Data Protection</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Secure encryption for all sensitive data</li>
                      <li>• Limited access to authorized personnel only</li>
                      <li>• Regular security audits and updates</li>
                      <li>• Compliance with applicable data protection laws</li>
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
                      <li>• These terms apply to all guests and services</li>
                      <li>• The hotel reserves the right to modify terms with notice</li>
                      <li>• Disputes subject to local jurisdiction</li>
                      <li>• Force majeure events may affect service availability</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Liability</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Hotel liability limited to direct damages only</li>
                      <li>• Guests responsible for personal belongings</li>
                      <li>• Travel insurance recommended for comprehensive coverage</li>
                      <li>• Activities participation at guest's own risk</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Intellectual Property</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• All website content is protected by copyright</li>
                      <li>• Horseland name and logo are registered trademarks</li>
                      <li>• Guest photos may be used for marketing with permission</li>
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
                      <li>• Compliance with all hotel rules and regulations</li>
                      <li>• No smoking in designated non-smoking areas</li>
                      <li>• Quiet hours: 10:00 PM to 7:00 AM</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Environmental Responsibility</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Respect for Matheran's eco-sensitive environment</li>
                      <li>• No littering or damage to natural surroundings</li>
                      <li>• Conservation of water and electricity</li>
                      <li>• Participation in our sustainability initiatives</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Safety Guidelines</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Follow all safety instructions and guidelines</li>
                      <li>• Report any safety concerns immediately</li>
                      <li>• Use of safety equipment for outdoor activities</li>
                      <li>• No unauthorized access to restricted areas</li>
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