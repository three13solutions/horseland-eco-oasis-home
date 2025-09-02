import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, RefreshCw, Copy, Languages, Upload, Download, Globe, Zap, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Translation {
  id: string;
  language_code: string;
  section: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

interface TranslationSection {
  section_key: string;
  section_name: string;
  description: string;
}

interface ContentPage {
  key: string;
  name: string;
  description: string;
  type: 'translation' | 'policy';
}

const ContentManagement = () => {
  const [contentPages, setContentPages] = useState<ContentPage[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const { toast } = useToast();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'mr', name: 'Marathi' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'bn', name: 'Bengali' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ur', name: 'Urdu' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'ru', name: 'Russian' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load translation sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('translation_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (sectionsError) throw sectionsError;

      // Load policies content
      const { data: policiesData, error: policiesError } = await supabase
        .from('policies_content')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (policiesError) throw policiesError;

      // Load translations
      const { data: translationsData, error: translationsError } = await supabase
        .from('translations')
        .select('*')
        .order('section, key');

      if (translationsError) throw translationsError;

      // Define the specific pages and their mappings
      const specificPageMappings: { [key: string]: string } = {
        'home': 'Home',
        'homepage': 'Home',
        'about': 'About',
        'stay': 'Stay',
        'rooms': 'Stay',
        'experiences': 'Experiences',
        'activities': 'Experiences',
        'packages': 'Packages',
        'journal': 'Journal',
        'blog': 'Journal',
        'faq': 'FAQ',
        'contact': 'Contact',
        'policies': 'Policies'
      };

      const specificPages: ContentPage[] = [];
      const globalContentSections: string[] = [];
      const policyContentSections: string[] = [];

      // Process translation sections
      (sectionsData || []).forEach(section => {
        const mappedName = specificPageMappings[section.section_key];
        if (mappedName) {
          specificPages.push({
            key: section.section_key,
            name: mappedName,
            description: section.description,
            type: 'translation' as const
          });
        } else {
          globalContentSections.push(section.section_key);
        }
      });

      // Process policy sections - collect them for the Policies page
      (policiesData || []).forEach(policy => {
        policyContentSections.push(policy.section_key);
      });

      // Add Policies page if there are policy sections
      if (policyContentSections.length > 0) {
        specificPages.push({
          key: 'policies',
          name: 'Policies',
          description: `All policy content sections (${policyContentSections.length} sections)`,
          type: 'policy' as const
        });
      }

      // Create the final pages array
      const pages: ContentPage[] = [...specificPages];

      // Add Global Content if there are unmapped sections
      if (globalContentSections.length > 0) {
        pages.push({
          key: 'global_content',
          name: 'Global Content',
          description: `Shared content, navigation, footer and other global elements (${globalContentSections.length} sections)`,
          type: 'translation' as const
        });
      }

      // Sort pages by the desired order
      const pageOrder = [
        'Home', 'About', 'Stay', 'Experiences', 'Packages', 'Journal', 'FAQ', 'Contact',
        'Policies', 'Global Content'
      ];

      const sortedPages = pages.sort((a, b) => {
        const aIndex = pageOrder.indexOf(a.name);
        const bIndex = pageOrder.indexOf(b.name);
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      setContentPages(sortedPages);
      setTranslations(translationsData || []);

      // Store global content sections and policy sections for later use
      (window as any).globalContentSections = globalContentSections;
      (window as any).policyContentSections = policyContentSections;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const autoTranslate = async (key: string, sourceText: string) => {
    if (selectedLanguage === 'en') return;
    
    setTranslating(key);
    try {
      const { data, error } = await supabase.functions.invoke('auto-translate', {
        body: {
          text: sourceText,
          targetLanguage: selectedLanguage,
          sourceLanguage: 'en'
        }
      });

      if (error) throw error;

      setEditingValues(prev => ({
        ...prev,
        [key]: data.translatedText
      }));

      toast({
        title: "Success",
        description: "Text auto-translated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to auto-translate text",
        variant: "destructive",
      });
    } finally {
      setTranslating(null);
    }
  };

  const autoTranslateAll = async () => {
    if (selectedLanguage === 'en') return;
    
    setShowTranslateDialog(true);
    const pageKeys = getPageKeys();
    let completed = 0;
    
    for (const key of pageKeys) {
      let englishTranslation;
      
      if (selectedPage === 'global_content') {
        // For global content, find the English translation from any of the global sections
        const globalSections = (window as any).globalContentSections || [];
        englishTranslation = translations.find(t => 
          t.key === key && t.language_code === 'en' && globalSections.includes(t.section)
        );
      } else if (selectedPage === 'policies') {
        // For policies page, find the English translation from any of the policy sections
        const policySections = (window as any).policyContentSections || [];
        englishTranslation = translations.find(t => 
          t.key === key && t.language_code === 'en' && policySections.includes(t.section)
        );
      } else {
        // For specific pages, find the English translation from that section
        englishTranslation = translations.find(t => 
          t.key === key && t.language_code === 'en' && t.section === selectedPage
        );
      }
      
      if (englishTranslation) {
        try {
          const { data, error } = await supabase.functions.invoke('auto-translate', {
            body: {
              text: englishTranslation.value,
              targetLanguage: selectedLanguage,
              sourceLanguage: 'en'
            }
          });

          if (!error && data.translatedText) {
            await saveTranslation(key, data.translatedText, false, englishTranslation.section);
          }
        } catch (error) {
          console.warn(`Failed to translate ${key}:`, error);
        }
      }
      
      completed++;
      setTranslateProgress((completed / pageKeys.length) * 100);
    }

    toast({
      title: "Success",
      description: `Auto-translated ${completed} items`,
    });
    
    setShowTranslateDialog(false);
    setTranslateProgress(0);
    await loadData();
  };


  const getCurrentTranslations = () => {
    if (selectedPage === 'global_content') {
      // For global content, get translations from all unmapped sections
      const globalSections = (window as any).globalContentSections || [];
      return translations.filter(t => 
        globalSections.includes(t.section) && t.language_code === selectedLanguage
      );
    } else if (selectedPage === 'policies') {
      // For policies page, get translations from all policy sections
      const policySections = (window as any).policyContentSections || [];
      return translations.filter(t => 
        policySections.includes(t.section) && t.language_code === selectedLanguage
      );
    } else {
      // For specific pages, get translations from that section only
      return translations.filter(t => 
        t.section === selectedPage && t.language_code === selectedLanguage
      );
    }
  };

  const getPageKeys = () => {
    if (selectedPage === 'global_content') {
      // For global content, get keys from all unmapped sections
      const globalSections = (window as any).globalContentSections || [];
      const keys = new Set(
        translations
          .filter(t => globalSections.includes(t.section))
          .map(t => t.key)
      );
      return Array.from(keys).sort();
    } else if (selectedPage === 'policies') {
      // For policies page, get keys from all policy sections
      const policySections = (window as any).policyContentSections || [];
      const keys = new Set(
        translations
          .filter(t => policySections.includes(t.section))
          .map(t => t.key)
      );
      return Array.from(keys).sort();
    } else {
      // For specific pages, get keys from that section only
      const keys = new Set(
        translations
          .filter(t => t.section === selectedPage)
          .map(t => t.key)
      );
      return Array.from(keys).sort();
    }
  };

  const saveTranslation = async (key: string, value: string, showToast = true, targetSection?: string) => {
    setSaving(key);
    try {
      // For global content or policies, determine which section this key belongs to
      let sectionToUse = selectedPage;
      if (selectedPage === 'global_content') {
        if (targetSection) {
          sectionToUse = targetSection;
        } else {
          // Find the section from existing translations
          const existingTranslation = translations.find(t => 
            t.key === key && t.language_code === 'en'
          );
          if (existingTranslation) {
            sectionToUse = existingTranslation.section;
          } else {
            // Fallback to first global section
            const globalSections = (window as any).globalContentSections || [];
            sectionToUse = globalSections[0] || selectedPage;
          }
        }
      } else if (selectedPage === 'policies') {
        if (targetSection) {
          sectionToUse = targetSection;
        } else {
          // Find the section from existing translations
          const existingTranslation = translations.find(t => 
            t.key === key && t.language_code === 'en'
          );
          if (existingTranslation) {
            sectionToUse = existingTranslation.section;
          } else {
            // Fallback to first policy section
            const policySections = (window as any).policyContentSections || [];
            sectionToUse = policySections[0] || selectedPage;
          }
        }
      }

      const { error } = await supabase
        .from('translations')
        .upsert({
          language_code: selectedLanguage,
          section: sectionToUse,
          key,
          value
        }, {
          onConflict: 'language_code,section,key'
        });

      if (error) throw error;

      // Update local state
      setTranslations(prev => {
        const existing = prev.find(t => 
          t.language_code === selectedLanguage && 
          t.section === sectionToUse && 
          t.key === key
        );

        if (existing) {
          return prev.map(t => 
            t.id === existing.id ? { ...t, value } : t
          );
        } else {
          return [...prev, {
            id: `temp-${Date.now()}`,
            language_code: selectedLanguage,
            section: sectionToUse,
            key,
            value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }];
        }
      });

      // Clear editing value
      setEditingValues(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

      if (showToast) {
        toast({
          title: "Success",
          description: "Translation saved successfully",
        });
      }
    } catch (error) {
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to save translation",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(null);
    }
  };

  const copyFromLanguage = async (sourceLang: string) => {
    try {
      let sourceTranslations;
      
      if (selectedPage === 'global_content') {
        // For global content, get translations from all unmapped sections
        const globalSections = (window as any).globalContentSections || [];
        sourceTranslations = translations.filter(t => 
          globalSections.includes(t.section) && t.language_code === sourceLang
        );
      } else if (selectedPage === 'policies') {
        // For policies page, get translations from all policy sections
        const policySections = (window as any).policyContentSections || [];
        sourceTranslations = translations.filter(t => 
          policySections.includes(t.section) && t.language_code === sourceLang
        );
      } else {
        // For specific pages, get translations from that section only
        sourceTranslations = translations.filter(t => 
          t.section === selectedPage && t.language_code === sourceLang
        );
      }

      for (const sourceTranslation of sourceTranslations) {
        await saveTranslation(sourceTranslation.key, sourceTranslation.value, false, sourceTranslation.section);
      }

      toast({
        title: "Success",
        description: `Copied ${sourceTranslations.length} translations from ${sourceLang}`,
      });

      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy translations",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Content Management</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="page-select" className="text-sm font-medium">
                Select Page:
              </Label>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger id="page-select" className="w-64 bg-background border shadow-sm">
                  <SelectValue placeholder="Choose a page to edit content" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {contentPages.map((page) => (
                    <SelectItem key={page.key} value={page.key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{page.name}</span>
                        <span className="text-xs text-muted-foreground">{page.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main content */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Content Translations</CardTitle>
                  <CardDescription>
                    Manage content for {contentPages.find(p => p.key === selectedPage)?.name || 'selected page'}
                  </CardDescription>
                </div>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-32 bg-background border shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedPage ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    <span className="text-lg font-medium">
                      {contentPages.find(p => p.key === selectedPage)?.name} ({selectedLanguage.toUpperCase()})
                    </span>
                    <Badge variant="secondary">
                      {getPageKeys().length} keys
                    </Badge>
                  </div>
                      <div className="flex gap-2">
                        {selectedLanguage !== 'en' && (
                          <Button
                            onClick={autoTranslateAll}
                            variant="outline"
                            size="sm"
                            disabled={translating !== null}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Auto-translate All
                          </Button>
                        )}
                        <Button
                          onClick={() => copyFromLanguage('en')}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy from English
                        </Button>
                      </div>
                    </div>

                <div className="space-y-4">
                  {getPageKeys().map((key) => {
                    const currentTranslation = getCurrentTranslations().find(t => t.key === key);
                    let englishTranslation;
                    
                    if (selectedPage === 'global_content') {
                      // For global content, find English translation from any global section
                      const globalSections = (window as any).globalContentSections || [];
                      englishTranslation = translations.find(t => 
                        t.key === key && t.language_code === 'en' && globalSections.includes(t.section)
                      );
                    } else if (selectedPage === 'policies') {
                      // For policies page, find English translation from any policy section
                      const policySections = (window as any).policyContentSections || [];
                      englishTranslation = translations.find(t => 
                        t.key === key && t.language_code === 'en' && policySections.includes(t.section)
                      );
                    } else {
                      // For specific pages, find English translation from that section
                      englishTranslation = translations.find(t => 
                        t.key === key && t.language_code === 'en' && t.section === selectedPage
                      );
                    }

                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Label className="font-medium">{key}</Label>
                          <div className="flex items-center gap-2">
                            {currentTranslation ? (
                              <Badge variant="default">Translated</Badge>
                            ) : (
                              <Badge variant="destructive">Missing</Badge>
                            )}
                          </div>
                        </div>
                        <Input
                          value={editingValues[key] ?? currentTranslation?.value ?? ''}
                          onChange={(e) => setEditingValues(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }))}
                          placeholder={`Enter ${selectedLanguage} translation for ${key}`}
                          className="mb-2"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {englishTranslation ? `EN: ${englishTranslation.value}` : 'No English version'}
                          </span>
                          <div className="flex gap-2">
                            {selectedLanguage !== 'en' && englishTranslation && (
                              <Button
                                onClick={() => autoTranslate(key, englishTranslation.value)}
                                disabled={translating === key}
                                variant="outline"
                                size="sm"
                              >
                                {translating === key ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Globe className="h-4 w-4 mr-2" />
                                )}
                                Auto-translate
                              </Button>
                            )}
                            <Button
                              onClick={() => saveTranslation(key, editingValues[key] ?? currentTranslation?.value ?? '', true, englishTranslation?.section)}
                              disabled={saving === key || (!editingValues[key] && !currentTranslation?.value)}
                              size="sm"
                            >
                              {saving === key ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {getPageKeys().length === 0 && selectedPage && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No content keys found for this page.</p>
                    <p className="text-sm mt-2">Add translations to get started.</p>
                  </div>
                )}
                  </>
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-4">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-medium text-foreground mb-2">Content Management</h3>
                    <p className="mb-4">Select a page from the dropdown above to view and edit content translations.</p>
                    <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                      <p className="font-medium text-foreground">Current Status:</p>
                      <p>📄 {contentPages.length} content pages available</p>
                      <p>🌐 {translations.length} total translations</p>
                      <p>🔤 {languages.length} languages supported</p>
                    </div>
                    {contentPages.length > 0 && (
                      <p className="mt-4 text-sm">
                        ☝️ Use the dropdown above to select a page like <strong>"{contentPages[0]?.name}"</strong> to get started
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Auto-translate Dialog */}
      <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-translating Content</DialogTitle>
            <DialogDescription>
              Please wait while we auto-translate all content in this section...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Progress value={translateProgress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {Math.round(translateProgress)}% complete
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;