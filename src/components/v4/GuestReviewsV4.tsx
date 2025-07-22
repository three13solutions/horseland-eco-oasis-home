import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const GuestReviewsV4 = () => {
  const [currentReview, setCurrentReview] = useState(0);

  const reviews = [
    {
      id: 1,
      name: "Priya & Arjun",
      location: "Mumbai",
      rating: 5,
      text: "The perfect escape from city chaos. Waking up to mountain views and the forest's gentle whispers was magical.",
      stay: "Valley View Deluxe",
      date: "December 2023"
    },
    {
      id: 2,
      name: "Rajesh Family",
      location: "Pune",
      rating: 5,
      text: "Kids loved the horse rides, we loved the peaceful atmosphere. The buffet was amazing - no waste, all taste!",
      stay: "Forest Cottage",
      date: "January 2024"
    },
    {
      id: 3,
      name: "Meera S.",
      location: "Delhi",
      rating: 5,
      text: "The spa treatments were heavenly. Yoga at sunrise with mountain views - this place truly heals the soul.",
      stay: "Sunrise Suite",
      date: "November 2023"
    },
    {
      id: 4,
      name: "Corporate Team",
      location: "Bangalore",
      rating: 4,
      text: "Great venue for our offsite. The meeting rooms with forest views inspired creativity and team bonding.",
      stay: "Corporate Package",
      date: "October 2023"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const nextReview = () => {
    setCurrentReview((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentReview((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const goToReview = (index: number) => {
    setCurrentReview(index);
  };

  return (
    <section className="py-12 md:py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
            Guest <span className="text-primary">Stories</span>
          </h2>
          <p className="text-muted-foreground">
            Hear from fellow travelers who found their peace in our mountains
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Review Carousel */}
          <div className="relative bg-background rounded-xl shadow-sm border border-border/50 p-8 md:p-12">
            <div className="text-center">
              {/* Stars */}
              <div className="flex justify-center mb-4">
                {[...Array(reviews[currentReview].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Review Text */}
              <blockquote className="text-lg md:text-xl text-foreground mb-6 leading-relaxed font-serif italic">
                "{reviews[currentReview].text}"
              </blockquote>

              {/* Guest Info */}
              <div className="space-y-1">
                <div className="font-semibold text-foreground">
                  {reviews[currentReview].name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {reviews[currentReview].location} • {reviews[currentReview].stay}
                </div>
                <div className="text-xs text-muted-foreground">
                  {reviews[currentReview].date}
                </div>
              </div>
            </div>

            {/* Navigation Arrows - Hidden on mobile */}
            <button
              onClick={prevReview}
              className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-muted/50 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={nextReview}
              className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-muted/50 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Dots Navigation */}
          <div className="flex justify-center space-x-2 mt-6">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => goToReview(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentReview 
                    ? 'bg-primary w-8' 
                    : 'bg-muted hover:bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>

          {/* Mobile Swipe Indicator */}
          <div className="md:hidden text-center mt-4">
            <p className="text-xs text-muted-foreground">
              Swipe or tap dots to read more reviews
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuestReviewsV4;