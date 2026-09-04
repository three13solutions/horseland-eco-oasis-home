import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Linkedin,
  Video,
  MessageCircle,
} from "lucide-react";
import DOMPurify from "dompurify";
import { brand, getFooterSection, activePackages } from "@/v2/data";

const DynamicFooter = () => {
  const location = useLocation();
  const isOnPoliciesPage = location.pathname === "/v2/policies";

  const brandSection = getFooterSection("brand") as any;
  const contactSection = getFooterSection("contact") as any;
  const socialSection = getFooterSection("social") as any;
  const newsletterSection = getFooterSection("newsletter") as any;
  const packages = activePackages.slice(0, 4);

  const siteSettings = {
    brand_name: brand.name,
    brand_monogram: brand.monogram,
    brand_descriptor: brand.descriptor,
    copyright_text: brand.copyright,
    credits: brand.credits,
  };

  const handlePolicyClick = (sectionKey: string) => {
    if (isOnPoliciesPage) {
      window.location.hash = sectionKey;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  };

  const PolicyLink = ({
    sectionKey,
    children,
    className,
  }: {
    sectionKey: string;
    children: React.ReactNode;
    className: string;
  }) => {
    if (isOnPoliciesPage) {
      return (
        <button onClick={() => handlePolicyClick(sectionKey)} className={className}>
          {children}
        </button>
      );
    } else {
      return (
        <Link to={`/v2/policies#${sectionKey}`} className={className}>
          {children}
        </Link>
      );
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return <Facebook className="w-5 h-5" />;
      case "instagram":
        return <Instagram className="w-5 h-5" />;
      case "twitter":
        return <Twitter className="w-5 h-5" />;
      case "youtube":
        return <Youtube className="w-5 h-5" />;
      case "linkedin":
        return <Linkedin className="w-5 h-5" />;
      case "tiktok":
        return <Video className="w-5 h-5" />;
      case "whatsapp":
        return <MessageCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <footer className="bg-gradient-to-b from-foreground to-foreground/90 text-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-8">
          <div className="md:col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <img
                src={siteSettings.brand_monogram}
                alt={siteSettings.brand_name}
                className="h-20 w-auto drop-shadow-lg"
              />
              <div className="flex flex-col">
                <span className="font-bold text-xl text-background">{siteSettings.brand_name}</span>
                {siteSettings.brand_descriptor && (
                  <span className="text-background/80 text-sm">{siteSettings.brand_descriptor}</span>
                )}
              </div>
            </div>
            {brandSection?.description && (
              <p className="text-background/80 leading-relaxed text-sm">{brandSection.description}</p>
            )}
          </div>

          {newsletterSection && (
            <div className="md:col-span-2 lg:col-span-2 space-y-4">
              <h3 className="text-xl font-semibold text-background flex items-center">
                <Mail className="w-5 h-5 mr-2 text-primary" />
                {newsletterSection.title || "Stay Connected"}
              </h3>
              <p className="text-background/80 text-sm">
                {newsletterSection.description || "Subscribe for updates and special offers"}
              </p>
              <div className="flex flex-col space-y-3">
                <Input
                  placeholder="Enter your email"
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/50 rounded-xl"
                />
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">Subscribe</Button>
              </div>
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-2 space-y-4 md:pl-6 lg:pl-8">
            <h3 className="text-lg font-semibold text-background">Explore Packages</h3>
            {packages.length > 0 ? (
              <>
                <ul className="space-y-2">
                  {packages.map((pkg) => (
                    <li key={pkg.id}>
                      <Link
                        to={`/v2/packages/${pkg.id}`}
                        className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block text-sm"
                      >
                        {pkg.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/v2/packages"
                  className="inline-flex items-center text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                >
                  View All Packages
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </>
            ) : (
              <Link
                to="/v2/packages"
                className="inline-flex items-center text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                View All Packages
                <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            )}
          </div>

          {contactSection && (
            <div className="md:col-span-2 lg:col-span-2 space-y-6">
              <h4 className="text-xl font-semibold text-background">Connect</h4>
              <div className="space-y-4">
                {contactSection.email && (
                  <div className="flex items-start space-x-3">
                    <Mail className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-background/80 text-xs">Email Us</p>
                      <p className="font-medium text-background text-sm">{contactSection.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-background/80 text-xs mb-2">Reservations Team</p>
                    <div className="space-y-1">
                      <p className="font-medium text-background text-sm">Mahesh: +91 94042 24600</p>
                      <p className="font-medium text-background text-sm">Sachin: +91 90044 24567</p>
                    </div>
                  </div>
                </div>
                {contactSection.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-background/80 text-xs">Visit Us</p>
                      <a
                        href="https://maps.google.com/?q=Horseland+Hotel+Matheran+Hill+Station+Maharashtra+India"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-background text-sm hover:text-primary transition-colors cursor-pointer"
                      >
                        Matheran Hill Station
                        <br />
                        Maharashtra, India 410102
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-8">
            <div className="md:col-span-6 lg:col-span-6">
              <h4 className="text-sm font-semibold text-background mb-3">Policies</h4>
              <div className="flex items-center space-x-3 text-sm text-background/60">
                <PolicyLink sectionKey="booking" className="hover:text-primary transition-colors whitespace-nowrap">
                  Booking
                </PolicyLink>
                <PolicyLink
                  sectionKey="cancellation"
                  className="hover:text-primary transition-colors whitespace-nowrap"
                >
                  Cancellation
                </PolicyLink>
                <PolicyLink sectionKey="payment" className="hover:text-primary transition-colors whitespace-nowrap">
                  Payment
                </PolicyLink>
                <PolicyLink sectionKey="privacy" className="hover:text-primary transition-colors whitespace-nowrap">
                  Privacy
                </PolicyLink>
                <PolicyLink sectionKey="terms" className="hover:text-primary transition-colors whitespace-nowrap">
                  Terms
                </PolicyLink>
                <PolicyLink sectionKey="guest" className="hover:text-primary transition-colors whitespace-nowrap">
                  Guest Conduct
                </PolicyLink>
              </div>
            </div>

            {socialSection && (
              <div className="md:col-span-2 lg:col-span-2 space-y-3">
                <p className="text-background/80 text-sm">Follow Our Journey</p>
                <div className="flex space-x-3">
                  {socialSection.networks &&
                    socialSection.networks
                      .filter((network: any) => network.enabled && network.url)
                      .map((network: any) => (
                        <a
                          key={network.platform}
                          href={network.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-background/10 rounded-full hover:bg-background/20 transition-all duration-300 transform hover:scale-110 text-background/80 hover:text-primary"
                        >
                          {getSocialIcon(network.platform)}
                        </a>
                      ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-background/60">{siteSettings.copyright_text}</p>
            <p
              className="text-sm text-background/60"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(siteSettings.credits) }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DynamicFooter;
