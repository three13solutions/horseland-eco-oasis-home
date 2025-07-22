import React from 'react';
import { Heart, Users, Briefcase, Leaf, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PackagesPreviewV4 = () => {
  const packages = [
    {
      icon: Heart,
      title: "Couple Getaway",
      tag: "ROMANTIC",
      description: "Private candlelit dinners, couples spa treatments, and sunset horse rides designed for romance.",
      price: "Starting ₹8,500",
      features: ["2 nights stay", "Couples massage", "Private dining", "Horse ride"],
      color: "bg-red-50 text-red-600 border-red-200"
    },
    {
      icon: Users,
      title: "Family Escape",
      tag: "FAMILY FUN",
      description: "Kid-friendly activities, family rooms, and guided nature walks perfect for creating memories.",
      price: "Starting ₹12,000",
      features: ["3 nights stay", "Family activities", "Kid-friendly meals", "Nature tours"],
      color: "bg-blue-50 text-blue-600 border-blue-200"
    },
    {
      icon: Briefcase,
      title: "Corporate Offsite",
      tag: "TEAM BUILDING",
      description: "Meeting facilities, team activities, and inspiring mountain views for productive retreats.",
      price: "Starting ₹15,000",
      features: ["Conference room", "Team activities", "Business meals", "Group booking"],
      color: "bg-gray-50 text-gray-600 border-gray-200"
    },
    {
      icon: Leaf,
      title: "Membership Plan",
      tag: "EXCLUSIVE",
      description: "Year-round privileges, priority booking, and special rates for our mountain sanctuary.",
      price: "₹25,000/year",
      features: ["Priority booking", "Member rates", "Special events", "Spa discounts"],
      color: "bg-green-50 text-green-600 border-green-200"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
            Special Packages for Every Kind of <span className="text-primary">Guest</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Carefully crafted experiences tailored to make your mountain retreat exactly what you need
          </p>
        </div>

        {/* Mobile: Vertical Stack */}
        <div className="md:hidden space-y-6">
          {packages.map((pkg, index) => (
            <div key={index} className="bg-background rounded-xl border border-border/50 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <pkg.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${pkg.color}`}>
                      {pkg.tag}
                    </span>
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-2">{pkg.title}</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">{pkg.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {pkg.features.map((feature, idx) => (
                  <span key={idx} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">{pkg.price}</span>
                <Button size="sm" variant="outline">Explore Package</Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg, index) => (
            <div key={index} className="bg-background rounded-xl border border-border/50 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 group">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <pkg.icon className="w-8 h-8 text-primary" />
                </div>
                
                <span className={`text-xs px-3 py-1 rounded-full border ${pkg.color} mb-3 inline-block`}>
                  {pkg.tag}
                </span>
                
                <h3 className="text-lg font-semibold text-foreground mb-3">{pkg.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{pkg.description}</p>
                
                <div className="space-y-2 mb-4">
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      • {feature}
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-border/50 pt-4">
                  <div className="font-semibold text-primary mb-3">{pkg.price}</div>
                  <Button size="sm" variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Explore Package
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="outline" className="group">
            See All Packages
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PackagesPreviewV4;