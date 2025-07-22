import React from 'react';
import { Star } from 'lucide-react';

const GuestReviewsV5 = () => {
  const reviews = [
    {
      name: "Priya & Arjun",
      rating: 5,
      review: "Perfect honeymoon escape! The forest views from our room were breathtaking, and the spa treatments were incredibly relaxing.",
      location: "Mumbai",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "The Sharma Family",
      rating: 5,
      review: "Kids loved the horse rides and bonfire stories. Parents enjoyed the peaceful environment and zero vehicle noise. Highly recommend!",
      location: "Pune",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "Rajesh Kumar",
      rating: 5,
      review: "Business retreat was perfectly organized. The conference facilities were excellent, and the mountain air boosted our team's creativity.",
      location: "Delhi",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "Meera Patel",
      rating: 5,
      review: "Solo traveler here! Felt completely safe and welcomed. The yoga sessions and meditation walks were exactly what my soul needed.",
      location: "Ahmedabad",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            What Our <span className="text-primary">Guests</span> Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from travelers who found their perfect mountain escape at Horseland
          </p>
        </div>

        <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-4 md:pb-0">
          {reviews.map((review, index) => (
            <div 
              key={index}
              className="flex-shrink-0 w-80 md:w-auto bg-white/80 backdrop-blur-sm rounded-2xl border border-border/20 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center mb-4">
                <img
                  src={review.image}
                  alt={review.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-foreground">{review.name}</h4>
                  <p className="text-sm text-muted-foreground">{review.location}</p>
                </div>
              </div>
              
              <div className="flex mb-3">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                "{review.review}"
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Read more stories on</p>
          <div className="flex justify-center space-x-4">
            <span className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-border/20 text-sm font-medium">
              TripAdvisor 4.8/5
            </span>
            <span className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-border/20 text-sm font-medium">
              Google Reviews 4.9/5
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuestReviewsV5;