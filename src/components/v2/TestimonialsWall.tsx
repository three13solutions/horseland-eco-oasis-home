
import React from 'react';
import { Star, Quote } from 'lucide-react';

const TestimonialsWall = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Arjun & Priya Mehta',
      location: 'Mumbai',
      rating: 5,
      text: 'Horseland redefined comfort for us. The zero-noise environment and forest-backed views created the perfect romantic getaway. Every detail was thoughtfully curated.',
      image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=100&h=100&fit=crop&crop=face',
      highlight: 'Perfect romantic getaway'
    },
    {
      id: 2,
      name: 'Rajesh Kumar',
      location: 'Delhi',
      rating: 5,
      text: 'The horse rides through red earth trails were magical! Combined with the heritage toy train experience, it was like stepping back in time. Unforgettable.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      highlight: 'Magical horse rides'
    },
    {
      id: 3,
      name: 'Sarah & James Wilson',
      location: 'London',
      rating: 5,
      text: 'As sustainability enthusiasts, we were impressed by Horseland\'s eco-practices. The zero-waste dining was exceptional, and the spa treatments were world-class.',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b332446c?w=100&h=100&fit=crop&crop=face',
      highlight: 'Exceptional eco-practices'
    },
    {
      id: 4,
      name: 'Anjali Sharma',
      location: 'Bangalore',
      rating: 5,
      text: 'The personalized service was beyond expectations. From arrival to departure, every team member made us feel special. The mountain views from our suite were breathtaking.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      highlight: 'Breathtaking mountain views'
    },
    {
      id: 5,
      name: 'Michael Chen',
      location: 'Singapore',
      rating: 5,
      text: 'Perfect blend of comfort and nature. The wellness programs helped me disconnect from city stress. I left feeling completely rejuvenated and inspired.',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      highlight: 'Completely rejuvenated'
    },
    {
      id: 6,
      name: 'Deepika & Vikram',
      location: 'Pune',
      rating: 5,
      text: 'Our honeymoon at Horseland was pure magic. The private cottage, candlelit dinners, and spa treatments created memories we\'ll treasure forever.',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
      highlight: 'Pure honeymoon magic'
    }
  ];

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute top-20 left-20 text-9xl font-bold text-primary">★</div>
        <div className="absolute bottom-20 right-20 text-9xl font-bold text-accent">★</div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Guest
            <span className="block text-primary italic">Stories</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every review tells a story of exceptional experiences and lasting memories
          </p>
        </div>

        {/* Testimonials Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`break-inside-avoid bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-border/10 ${
                index % 3 === 1 ? 'bg-gradient-to-br from-primary/5 to-accent/5' : ''
              }`}
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="w-8 h-8 text-primary/30" />
              </div>

              {/* Rating */}
              <div className="flex items-center mb-4">
                {renderStars(testimonial.rating)}
              </div>

              {/* Highlight */}
              <div className="mb-4">
                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {testimonial.highlight}
                </span>
              </div>

              {/* Testimonial Text */}
              <p className="text-muted-foreground leading-relaxed mb-6 italic">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center space-x-4 pt-4 border-t border-border/10">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">4.9★</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Five Star Reviews</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Would Recommend</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">TripAdvisor</div>
              <div className="text-sm text-muted-foreground">Certificate of Excellence</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsWall;
