import React, { useEffect, useState } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Button } from '@/components/ui/button';
import { Leaf, Award, Heart, Mountain, Users, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { useTranslation } from 'react-i18next';

const About = () => {
  const { i18n } = useTranslation();
  const { getTranslation } = useContentTranslation('pages');
  const [pageData, setPageData] = useState<any>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      const { data } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', 'about')
        .single();
      
      if (data) {
        setPageData(data);
      }
    };
    
    fetchPageData();
  }, []);

  if (!pageData) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <NavigationV5 />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const content = pageData.structured_content || {};
  const legacy = content.legacy || {};
  const founder = content.founder || {};
  const team = content.team || {};
  const matheran = content.matheran || {};
  const recognition = content.recognition || {};

  const displayTitle = i18n.language !== 'en'
    ? getTranslation(`page.${pageData.slug}.title`, pageData.title)
    : pageData.title;

  const displaySubtitle = i18n.language !== 'en'
    ? getTranslation(`page.${pageData.slug}.subtitle`, pageData.subtitle)
    : pageData.subtitle;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${pageData.hero_image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'}')`
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            {displayTitle}
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90 max-w-2xl mx-auto">
            {displaySubtitle}
          </p>
        </div>
      </section>

      {/* Legacy Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
                {legacy.heading || 'A Legacy of Hospitality'}
              </h2>
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                {legacy.paragraph1 || ''}
              </p>
              <p className="text-muted-foreground font-body mb-8 leading-relaxed">
                {legacy.paragraph2 || ''}
              </p>
              <Button size="lg" className="font-body">
                {legacy.buttonText || 'Our Values'}
              </Button>
            </div>
            <div className="relative">
              <img 
                src={legacy.image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                alt="Historic hotel building"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Team Section - Moved up and made more prominent */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 text-foreground">
              {team.heading || 'Meet Our Team'}
            </h2>
            <p className="text-xl text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed">
              {team.description || 'The dedicated professionals who make your stay exceptional'}
            </p>
          </div>

          {team.items && team.items.length > 0 && (
            <div className="grid md:grid-cols-3 gap-12 mb-16">
              {team.items.map((member: any, index: number) => (
                <div key={index} className="group">
                  <div className="relative mb-6 overflow-hidden rounded-xl">
                    <img 
                      src={member.image || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                      alt={member.name}
                      className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <h3 className="text-2xl font-heading font-bold mb-2 text-foreground">{member.name}</h3>
                  <p className="text-primary font-semibold text-lg mb-3">{member.role}</p>
                  <p className="text-muted-foreground font-body leading-relaxed">
                    {member.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {team.quote && (
            <div className="text-center mt-16 max-w-4xl mx-auto">
              <blockquote className="text-2xl font-body text-muted-foreground italic border-l-4 border-primary pl-8">
                "{team.quote}"
              </blockquote>
            </div>
          )}
        </div>
      </section>

      {/* Founder Section - Condensed and moved down */}
      <section className="py-12 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-card rounded-xl shadow-lg p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="relative">
                  <img 
                    src={founder.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                    alt={`${founder.name || 'Founder'}`}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover object-top shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-2xl font-heading font-bold text-foreground mb-1">
                    {founder.name || 'Adi Bharucha'}
                  </h3>
                  <p className="text-primary font-semibold">{founder.role || 'Founder'}</p>
                </div>
                <p className="text-muted-foreground font-body leading-relaxed mb-4">
                  {founder.bio1 || ''}
                </p>
                {founder.quote && (
                  <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground text-sm">
                    "{founder.quote}"
                  </blockquote>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Matheran Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
              {matheran.heading || 'Discover Matheran'}
            </h2>
            <p className="text-lg text-muted-foreground font-body max-w-3xl mx-auto">
              {matheran.description || ''}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">
                {matheran.feature1?.title || 'Vehicle-Free Zone'}
              </h3>
              <p className="text-muted-foreground font-body">
                {matheran.feature1?.description || ''}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mountain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">
                {matheran.feature2?.title || 'Red Mud Trails'}
              </h3>
              <p className="text-muted-foreground font-body">
                {matheran.feature2?.description || ''}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">
                {matheran.feature3?.title || 'Forest Living'}
              </h3>
              <p className="text-muted-foreground font-body">
                {matheran.feature3?.description || ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-foreground">
            {recognition.heading || 'Recognition & Awards'}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {recognition.award1 && (
              <div className="bg-card border rounded-lg p-6">
                <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-heading font-semibold mb-3">
                  {recognition.award1.title}
                </h3>
                <p className="text-muted-foreground font-body">
                  {recognition.award1.source}
                </p>
              </div>
            )}

            {recognition.award2 && (
              <div className="bg-card border rounded-lg p-6">
                <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-heading font-semibold mb-3">
                  {recognition.award2.title}
                </h3>
                <p className="text-muted-foreground font-body">
                  {recognition.award2.source}
                </p>
              </div>
            )}
          </div>

          {recognition.testimonial && (
            <div className="mt-12">
              <p className="text-muted-foreground font-body italic">
                "{recognition.testimonial}" 
                <br />{recognition.testimonialSource}
              </p>
            </div>
          )}
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default About;