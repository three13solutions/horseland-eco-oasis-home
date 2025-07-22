import React from 'react';
import { Star, Quote, MapPin } from 'lucide-react';

const GuestReviewsV5 = () => {
  const testimonials = [
    {
      name: 'Priya Sharma',
      location: 'Mumbai',
      rating: 5,
      text: 'Amazing value for money! The room was clean, staff was helpful, and the location is perfect. Will definitely come back.',
      date: '2 weeks ago',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Rajesh Patel',
      location: 'Pune',
      rating: 4,
      text: 'Great place for families. Kids loved it here. Food was good and rooms were comfortable. Highly recommend for budget travelers.',
      date: '1 month ago',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Anita Kumar',
      location: 'Delhi',
      rating: 5,
      text: 'Perfect weekend getaway! The sunrise view from our room was breathtaking. Staff went out of their way to make us feel welcome.',
      date: '3 weeks ago',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Vikram Singh',
      location: 'Ahmedabad',
      rating: 4,
      text: 'Honest pricing, no hidden charges. What you see is what you pay. Room was exactly as shown in photos. Good value stay.',
      date: '1 week ago',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Kavita Joshi',
      location: 'Surat',
      rating: 5,
      text: 'Loved our stay here! The nature walks were amazing and completely free. Hotel provides great guidance for local sightseeing.',
      date: '2 months ago',
      avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Amit Verma',
      location: 'Nashik',
      rating: 4,
      text: 'Clean rooms, friendly staff, great location. Everything you need for a comfortable stay in Matheran. Will recommend to friends.',
      date: '3 weeks ago',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-accent fill-current' : 'text-muted-foreground/30'
        }`}
      />
    ));
  };

  return (
    <section className="py-12 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header - Keep v5 styling */}
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              What Our <span className="text-primary">Guests</span> Say
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real stories from travelers who found their perfect mountain escape at Horseland
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12 md:mb-16">
            <div className="text-center p-4 bg-card rounded-xl">
              <div className="text-2xl md:text-3xl font-bold text-primary">4.3</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center p-4 bg-card rounded-xl">
              <div className="text-2xl md:text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Happy Guests</div>
            </div>
            <div className="text-center p-4 bg-card rounded-xl">
              <div className="text-2xl md:text-3xl font-bold text-primary">94%</div>
              <div className="text-sm text-muted-foreground">Would Return</div>
            </div>
            <div className="text-center p-4 bg-card rounded-xl">
              <div className="text-2xl md:text-3xl font-bold text-primary">₹1,500</div>
              <div className="text-sm text-muted-foreground">Starting Price</div>
            </div>
          </div>

          {/* Testimonials Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative"
              >
                {/* Quote Icon */}
                <Quote className="absolute top-4 right-4 w-6 h-6 text-primary/20" />
                
                {/* Header */}
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {testimonial.location}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex space-x-1">
                    {renderStars(testimonial.rating)}
                  </div>
                  <span className="text-sm text-muted-foreground">{testimonial.date}</span>
                </div>

                {/* Review Text */}
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  "{testimonial.text}"
                </p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12 p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Join Our Happy Guests
            </h3>
            <p className="text-muted-foreground mb-6">
              Book your stay today and create your own memorable experience in Matheran.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
                Book Your Stay
              </button>
              <button className="border border-primary text-primary px-6 py-3 rounded-xl font-semibold hover:bg-primary/10 transition-all">
                View All Reviews
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuestReviewsV5;