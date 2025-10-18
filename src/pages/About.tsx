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

      {/* Founder Section */}
      <section className="py-16 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src={founder.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                alt={`${founder.name || 'Founder'}, ${founder.role || ''}`}
                className="rounded-lg shadow-lg w-full"
              />
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Lightbulb className="w-10 h-10 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
                {founder.heading || 'Meet Our Founder'}
              </h2>
              <h3 className="text-xl font-semibold text-primary mb-4">{founder.name || 'Adi Bharucha'}</h3>
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                {founder.bio1 || ''}
              </p>
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                {founder.bio2 || ''}
              </p>
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                "{founder.quote || ''}"
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
              {team.heading || 'The Heart of Horseland'}
            </h2>
            <p className="text-lg text-muted-foreground font-body max-w-3xl mx-auto">
              {team.description || ''}
            </p>
          </div>

          {team.items && team.items.length > 0 && (
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {team.items.slice(0, 3).map((member: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                    <img 
                      src={member.image || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground font-body text-sm">
                    {member.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {team.items && team.items.length > 3 && (
            <div className="grid md:grid-cols-2 gap-8">
              {team.items.slice(3).map((member: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                    <img 
                      src={member.image || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground font-body text-sm">
                    {member.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {team.quote && (
            <div className="text-center mt-12">
              <p className="text-muted-foreground font-body italic max-w-2xl mx-auto">
                "{team.quote}"
              </p>
            </div>
          )}
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