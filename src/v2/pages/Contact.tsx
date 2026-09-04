import React, { useState } from "react";
import Navigation from "@/v2/components/Navigation";
import DynamicFooter from "@/v2/components/DynamicFooter";
import CombinedFloating from "@/v2/components/CombinedFloating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GoogleMap from "@/v2/components/GoogleMap";
import { getPageBySlug, contact } from "@/v2/data";

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "AIzaSyA8704uuYTZC8gKSoovX5Ox5o4SGK9q-W8";

const Contact = () => {
  const pageData = getPageBySlug("contact");
  const heroImage =
    (pageData?.hero_type === "carousel" &&
      Array.isArray(pageData?.hero_gallery) &&
      pageData.hero_gallery.length > 0 &&
      String(pageData.hero_gallery[0])) ||
    pageData?.hero_image ||
    "";

  const contactEmail = (contact as any)?.email || "info@horselandhotel.com";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const subject = formData.subject || "Website inquiry";
      const body = [
        "Name: " + formData.name,
        "Email: " + formData.email,
        "Phone: " + formData.phone,
        "",
        formData.message,
      ].join("\n");

      const mailtoUrl = "mailto:" + contactEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.location.href = mailtoUrl;

      toast({
        title: "Opening your email client",
        description: "Please send the pre-filled message to complete your inquiry.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error sending message",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
        {heroImage && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('" + heroImage + "')" }}
          >
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        )}

        <div
          className={(heroImage ? "relative z-10 text-white" : "bg-gradient-to-b from-muted/50 to-background py-16") + " container mx-auto px-6"}
        >
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Get in <span className={heroImage ? "text-white" : "text-primary"}>Touch</span>
            </h1>
            <p className={"text-lg " + (heroImage ? "text-white/90" : "text-muted-foreground")}>
              We're here to help you plan your perfect mountain getaway. Reach out to us for reservations, questions, or
              special requests.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-serif font-bold text-foreground mb-6">Contact Information</h2>
                <p className="text-muted-foreground mb-8">
                  Our team is available to assist you with your booking and answer any questions about your stay at
                  Horseland Hotel.
                </p>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Address</h3>
                        <p className="text-muted-foreground">
                          Horseland Hotel
                          <br />
                          Vithalrao Kotwal Road,
                          <br />
                          Near Dasturi Point, Matheran
                          <br />
                          Maharashtra 410102, India
                          <br />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Phone</h3>
                        <p className="text-muted-foreground">
                          Mahesh: +91 9404224600
                          <br />
                          Sachin: +91 9004424567
                          <br />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Email</h3>
                        <p className="text-muted-foreground">
                          {contactEmail}
                          <br />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Operating Hours</h3>
                        <p className="text-muted-foreground">
                          Reservation: 10:00 AM to 09:00 PM
                          <br />
                          Restaurant: 7:00 AM - 11:00 PM
                          <br />
                          Spa: 8:00 AM - 8:00 PM
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Send us a Message</span>
                  </CardTitle>
                  <CardDescription>Fill out the form below and we'll get back to you within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                          Name *
                        </label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                          Email *
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                          Phone
                        </label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                          Subject
                        </label>
                        <Input
                          id="subject"
                          name="subject"
                          type="text"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="Booking inquiry, general question, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                        Message *
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your inquiry, preferred dates, special requirements, etc."
                        rows={6}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-accent"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">Find Us in Matheran</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Located in the heart of Matheran's car-free hill station, we're easily accessible by the heritage toy
              train or horse ride from the main road.
            </p>
          </div>

          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            {GOOGLE_MAPS_API_KEY ? (
              <iframe
                width="100%"
                height="450"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={"https://www.google.com/maps/embed/v1/place?key=" + GOOGLE_MAPS_API_KEY + "&q=Horseland+Hotel,Vithalrao+Kotwal+Road,Near+Dasturi+Point,Matheran,Maharashtra+410102&zoom=15"}
                className="w-full min-h-[450px]"
              />
            ) : (
              <div className="aspect-video bg-muted/50 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Map integration not configured
                    <br />
                    GPS coordinates: 18.9847° N, 73.2673° E
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloating />
    </div>
  );
};

export default Contact;
