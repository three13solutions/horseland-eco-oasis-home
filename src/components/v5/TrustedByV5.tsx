import React from 'react';

const TrustedByV5 = () => {
  const logos = [
    {
      name: "TripAdvisor",
      logo: "https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=120&h=60&fit=crop&crop=center",
      description: "Travelers' Choice 2024"
    },
    {
      name: "India Today",
      logo: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=120&h=60&fit=crop&crop=center",
      description: "Best Hill Station Resort"
    },
    {
      name: "Times Travel",
      logo: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120&h=60&fit=crop&crop=center",
      description: "Eco-Luxury Winner"
    },
    {
      name: "Conde Nast",
      logo: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120&h=60&fit=crop&crop=center",
      description: "Sustainable Tourism Award"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-white/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
            Trusted by <span className="text-primary">Leading Publications</span>
          </h2>
          <p className="text-muted-foreground">
            Recognized for excellence in sustainable luxury hospitality
          </p>
        </div>

        <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-6 pb-4 md:pb-0">
          {logos.map((item, index) => (
            <div 
              key={index}
              className="flex-shrink-0 w-64 md:w-auto text-center p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-border/20 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="h-16 flex items-center justify-center mb-4">
                <img
                  src={item.logo}
                  alt={item.name}
                  className="max-h-12 w-auto object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{item.name}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedByV5;