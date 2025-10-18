import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { MediaPicker } from './MediaPicker';

interface PageContentEditorProps {
  pageSlug: string;
  content: any;
  onChange: (content: any) => void;
  isTranslating?: boolean;
  language?: string;
}

export const PageContentEditor: React.FC<PageContentEditorProps> = ({
  pageSlug,
  content = {},
  onChange,
  isTranslating = false,
  language = 'en'
}) => {
  const updateSection = (sectionKey: string, value: any) => {
    onChange({
      ...content,
      [sectionKey]: value
    });
  };

  const updateNestedField = (sectionKey: string, fieldPath: string[], value: any) => {
    const section = { ...(content[sectionKey] || {}) };
    let current: any = section;
    
    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!current[fieldPath[i]]) {
        current[fieldPath[i]] = {};
      }
      current = current[fieldPath[i]];
    }
    
    current[fieldPath[fieldPath.length - 1]] = value;
    updateSection(sectionKey, section);
  };

  const addArrayItem = (sectionKey: string, arrayPath: string[], defaultItem: any) => {
    const section = { ...(content[sectionKey] || {}) };
    let current: any = section;
    
    for (const key of arrayPath) {
      if (!current[key]) {
        current[key] = [];
      }
      current = current[key];
    }
    
    if (Array.isArray(current)) {
      // Need to update parent
      const parent = section;
      if (!parent[arrayPath[0]]) parent[arrayPath[0]] = [];
      parent[arrayPath[0]] = [...parent[arrayPath[0]], defaultItem];
      updateSection(sectionKey, section);
    }
  };

  const removeArrayItem = (sectionKey: string, arrayPath: string[], index: number) => {
    const section = { ...(content[sectionKey] || {}) };
    const items = section[arrayPath[0]] || [];
    items.splice(index, 1);
    section[arrayPath[0]] = items;
    updateSection(sectionKey, section);
  };

  const updateArrayItem = (sectionKey: string, index: number, field: string, value: any) => {
    const section = { ...(content[sectionKey] || {}) };
    if (!section.items) section.items = [];
    if (!section.items[index]) section.items[index] = {};
    section.items[index][field] = value;
    updateSection(sectionKey, section);
  };

  // Render About Page Content
  if (pageSlug === 'about') {
    const legacy = content.legacy || {};
    const founder = content.founder || {};
    const team = content.team || {};
    const matheran = content.matheran || {};
    const recognition = content.recognition || {};

    return (
      <div className="space-y-6">
        {/* Legacy Section */}
        <Card>
          <CardHeader>
            <CardTitle>Legacy Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Section Heading</Label>
              <Input
                value={legacy.heading || ''}
                onChange={(e) => updateNestedField('legacy', ['heading'], e.target.value)}
                placeholder="A Legacy of Hospitality"
              />
            </div>
            <div>
              <Label>Paragraph 1</Label>
              <Textarea
                value={legacy.paragraph1 || ''}
                onChange={(e) => updateNestedField('legacy', ['paragraph1'], e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Paragraph 2</Label>
              <Textarea
                value={legacy.paragraph2 || ''}
                onChange={(e) => updateNestedField('legacy', ['paragraph2'], e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Button Text</Label>
              <Input
                value={legacy.buttonText || ''}
                onChange={(e) => updateNestedField('legacy', ['buttonText'], e.target.value)}
                placeholder="Our Values"
              />
            </div>
            <div>
              <Label>Section Image</Label>
              <MediaPicker
                value={legacy.image || ''}
                onChange={(url) => updateNestedField('legacy', ['image'], url)}
                label="Choose Image"
              />
            </div>
          </CardContent>
        </Card>

        {/* Founder Section */}
        <Card>
          <CardHeader>
            <CardTitle>Founder Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Section Heading</Label>
              <Input
                value={founder.heading || ''}
                onChange={(e) => updateNestedField('founder', ['heading'], e.target.value)}
                placeholder="Meet Our Founder"
              />
            </div>
            <div>
              <Label>Founder Name</Label>
              <Input
                value={founder.name || ''}
                onChange={(e) => updateNestedField('founder', ['name'], e.target.value)}
                placeholder="Adi Bharucha"
              />
            </div>
            <div>
              <Label>Founder Role</Label>
              <Input
                value={founder.role || ''}
                onChange={(e) => updateNestedField('founder', ['role'], e.target.value)}
                placeholder="Founder & Visionary"
              />
            </div>
            <div>
              <Label>Biography Paragraph 1</Label>
              <Textarea
                value={founder.bio1 || ''}
                onChange={(e) => updateNestedField('founder', ['bio1'], e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Biography Paragraph 2</Label>
              <Textarea
                value={founder.bio2 || ''}
                onChange={(e) => updateNestedField('founder', ['bio2'], e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Quote</Label>
              <Textarea
                value={founder.quote || ''}
                onChange={(e) => updateNestedField('founder', ['quote'], e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Founder Image</Label>
              <MediaPicker
                value={founder.image || ''}
                onChange={(url) => updateNestedField('founder', ['image'], url)}
                label="Choose Image"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Team Section</CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const items = team.items || [];
                  updateSection('team', {
                    ...team,
                    items: [...items, { name: '', role: '', description: '', image: '' }]
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Section Heading</Label>
              <Input
                value={team.heading || ''}
                onChange={(e) => updateNestedField('team', ['heading'], e.target.value)}
                placeholder="The Heart of Horseland"
              />
            </div>
            <div>
              <Label>Section Description</Label>
              <Textarea
                value={team.description || ''}
                onChange={(e) => updateNestedField('team', ['description'], e.target.value)}
                rows={2}
              />
            </div>

            {(team.items || []).map((member: any, index: number) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Team Member {index + 1}</h4>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeArrayItem('team', ['items'], index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={member.name || ''}
                      onChange={(e) => updateArrayItem('team', index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Input
                      value={member.role || ''}
                      onChange={(e) => updateArrayItem('team', index, 'role', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={member.description || ''}
                      onChange={(e) => updateArrayItem('team', index, 'description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Photo</Label>
                    <MediaPicker
                      value={member.image || ''}
                      onChange={(url) => updateArrayItem('team', index, 'image', url)}
                      label="Choose Photo"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <div>
              <Label>Team Quote (bottom)</Label>
              <Textarea
                value={team.quote || ''}
                onChange={(e) => updateNestedField('team', ['quote'], e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Matheran Section */}
        <Card>
          <CardHeader>
            <CardTitle>Discover Matheran Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Section Heading</Label>
              <Input
                value={matheran.heading || ''}
                onChange={(e) => updateNestedField('matheran', ['heading'], e.target.value)}
                placeholder="Discover Matheran"
              />
            </div>
            <div>
              <Label>Section Description</Label>
              <Textarea
                value={matheran.description || ''}
                onChange={(e) => updateNestedField('matheran', ['description'], e.target.value)}
                rows={2}
              />
            </div>

            {['feature1', 'feature2', 'feature3'].map((featureKey, idx) => {
              const feature = matheran[featureKey] || {};
              return (
                <Card key={featureKey} className="border-2">
                  <CardHeader>
                    <h4 className="font-semibold">Feature {idx + 1}</h4>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Feature Title</Label>
                      <Input
                        value={feature.title || ''}
                        onChange={(e) => updateNestedField('matheran', [featureKey, 'title'], e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Feature Description</Label>
                      <Textarea
                        value={feature.description || ''}
                        onChange={(e) => updateNestedField('matheran', [featureKey, 'description'], e.target.value)}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Recognition Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recognition & Awards Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Section Heading</Label>
              <Input
                value={recognition.heading || ''}
                onChange={(e) => updateNestedField('recognition', ['heading'], e.target.value)}
                placeholder="Recognition & Awards"
              />
            </div>

            {['award1', 'award2'].map((awardKey, idx) => {
              const award = recognition[awardKey] || {};
              return (
                <Card key={awardKey} className="border-2">
                  <CardHeader>
                    <h4 className="font-semibold">Award {idx + 1}</h4>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Award Title</Label>
                      <Input
                        value={award.title || ''}
                        onChange={(e) => updateNestedField('recognition', [awardKey, 'title'], e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Award Source</Label>
                      <Input
                        value={award.source || ''}
                        onChange={(e) => updateNestedField('recognition', [awardKey, 'source'], e.target.value)}
                        placeholder="e.g., Maharashtra Tourism Board, 2023"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div>
              <Label>Testimonial Quote</Label>
              <Textarea
                value={recognition.testimonial || ''}
                onChange={(e) => updateNestedField('recognition', ['testimonial'], e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Testimonial Source</Label>
              <Input
                value={recognition.testimonialSource || ''}
                onChange={(e) => updateNestedField('recognition', ['testimonialSource'], e.target.value)}
                placeholder="— Travel + Leisure India"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Experiences Page Content
  if (pageSlug === 'experiences') {
    const intro = content.intro || {};
    const experiences = content.experiences || {};
    const cta = content.cta || {};

    return (
      <div className="space-y-6">
        {/* Introduction Section */}
        <Card>
          <CardHeader>
            <CardTitle>Introduction Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Section Heading</Label>
              <Input
                value={intro.heading || ''}
                onChange={(e) => updateNestedField('intro', ['heading'], e.target.value)}
                placeholder="Three Pillars of Mountain Living"
              />
            </div>
            <div>
              <Label>Section Description</Label>
              <Textarea
                value={intro.description || ''}
                onChange={(e) => updateNestedField('intro', ['description'], e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Experience Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Experience Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {['activities', 'dining', 'spa'].map((expKey, idx) => {
              const exp = experiences[expKey] || {};
              return (
                <Card key={expKey} className="border-2">
                  <CardHeader>
                    <h4 className="font-semibold capitalize">{expKey} Experience</h4>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={exp.title || ''}
                        onChange={(e) => updateNestedField('experiences', [expKey, 'title'], e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={exp.description || ''}
                        onChange={(e) => updateNestedField('experiences', [expKey, 'description'], e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Card Image</Label>
                      <MediaPicker
                        value={exp.image || ''}
                        onChange={(url) => updateNestedField('experiences', [expKey, 'image'], url)}
                        label="Choose Image"
                      />
                    </div>
                    <div>
                      <Label>Highlights (comma-separated)</Label>
                      <Input
                        value={(exp.highlights || []).join(', ')}
                        onChange={(e) => updateNestedField('experiences', [expKey, 'highlights'], e.target.value.split(',').map((s: string) => s.trim()))}
                        placeholder="Horse Riding, Forest Trails, Sunset Points"
                      />
                    </div>
                    <div>
                      <Label>Button Text</Label>
                      <Input
                        value={exp.buttonText || ''}
                        onChange={(e) => updateNestedField('experiences', [expKey, 'buttonText'], e.target.value)}
                        placeholder="Explore Activities"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card>
          <CardHeader>
            <CardTitle>Call to Action Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>CTA Heading</Label>
              <Input
                value={cta.heading || ''}
                onChange={(e) => updateNestedField('cta', ['heading'], e.target.value)}
                placeholder="Ready to Begin Your Journey?"
              />
            </div>
            <div>
              <Label>CTA Description</Label>
              <Textarea
                value={cta.description || ''}
                onChange={(e) => updateNestedField('cta', ['description'], e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Button Text</Label>
              <Input
                value={cta.buttonText || ''}
                onChange={(e) => updateNestedField('cta', ['buttonText'], e.target.value)}
                placeholder="Plan Your Stay"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default for other pages
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        This page uses the standard content field. For structured content editing, 
        a custom editor for this page type needs to be configured.
      </p>
      <div>
        <Label>Page Content</Label>
        <Textarea
          value={typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
          onChange={(e) => onChange(e.target.value)}
          rows={15}
          placeholder="Enter page content..."
        />
      </div>
    </div>
  );
};
