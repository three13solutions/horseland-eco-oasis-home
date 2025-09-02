import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Save, Plus, Trash2, Edit, Clock, FileText, CreditCard, Eye, Shield, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PolicyContent {
  id: string;
  section_key: string;
  title: string;
  description: string;
  content: {
    sections: Array<{
      title: string;
      items: string[];
    }>;
  };
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface NewPolicySection {
  title: string;
  items: string[];
}

const PoliciesManager = () => {
  const [policies, setPolicies] = useState<PolicyContent[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [newSection, setNewSection] = useState<NewPolicySection>({ title: '', items: [''] });
  const { toast } = useToast();

  const iconMap: { [key: string]: React.ReactNode } = {
    Clock: <Clock className="w-5 h-5" />,
    FileText: <FileText className="w-5 h-5" />,
    CreditCard: <CreditCard className="w-5 h-5" />,
    Eye: <Eye className="w-5 h-5" />,
    Shield: <Shield className="w-5 h-5" />,
    Users: <Users className="w-5 h-5" />,
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('policies_content')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setPolicies((data || []) as unknown as PolicyContent[]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async (policy: PolicyContent) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('policies_content')
        .update({
          title: policy.title,
          description: policy.description,
          content: policy.content,
        })
        .eq('id', policy.id);

      if (error) throw error;

      setPolicies(prev => prev.map(p => p.id === policy.id ? policy as unknown as PolicyContent : p));
      setEditingContent(null);
      
      toast({
        title: "Success",
        description: "Policy saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save policy",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addSection = (policyId: string) => {
    if (!newSection.title.trim()) return;

    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedContent = {
      ...policy.content,
      sections: [
        ...policy.content.sections,
        {
          title: newSection.title,
          items: newSection.items.filter(item => item.trim())
        }
      ]
    };

    const updatedPolicy = { ...policy, content: updatedContent };
    savePolicy(updatedPolicy);
    setNewSection({ title: '', items: [''] });
    setShowAddSectionDialog(false);
  };

  const removeSection = (policyId: string, sectionIndex: number) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedContent = {
      ...policy.content,
      sections: policy.content.sections.filter((_, index) => index !== sectionIndex)
    };

    const updatedPolicy = { ...policy, content: updatedContent };
    savePolicy(updatedPolicy);
  };

  const updateSectionTitle = (policyId: string, sectionIndex: number, newTitle: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedContent = {
      ...policy.content,
      sections: policy.content.sections.map((section, index) => 
        index === sectionIndex ? { ...section, title: newTitle } : section
      )
    };

    setEditingContent({ ...policy, content: updatedContent });
  };

  const updateSectionItem = (policyId: string, sectionIndex: number, itemIndex: number, newItem: string) => {
    const policy = editingContent || policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedContent = {
      ...policy.content,
      sections: policy.content.sections.map((section, sIndex) => 
        sIndex === sectionIndex 
          ? {
              ...section,
              items: section.items.map((item, iIndex) => 
                iIndex === itemIndex ? newItem : item
              )
            }
          : section
      )
    };

    setEditingContent({ ...policy, content: updatedContent });
  };

  const addSectionItem = (policyId: string, sectionIndex: number) => {
    const policy = editingContent || policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedContent = {
      ...policy.content,
      sections: policy.content.sections.map((section, sIndex) => 
        sIndex === sectionIndex 
          ? { ...section, items: [...section.items, ''] }
          : section
      )
    };

    setEditingContent({ ...policy, content: updatedContent });
  };

  const removeSectionItem = (policyId: string, sectionIndex: number, itemIndex: number) => {
    const policy = editingContent || policies.find(p => p.id === policyId);
    if (!policy) return;

    const updatedContent = {
      ...policy.content,
      sections: policy.content.sections.map((section, sIndex) => 
        sIndex === sectionIndex 
          ? { ...section, items: section.items.filter((_, iIndex) => iIndex !== itemIndex) }
          : section
      )
    };

    setEditingContent({ ...policy, content: updatedContent });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Policies Management</h2>
          <p className="text-muted-foreground">Manage hotel policies content and sections</p>
        </div>
        <Button onClick={loadPolicies} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((policy) => (
          <Card key={policy.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {iconMap[policy.icon]}
                  <div>
                    <CardTitle className="text-lg">{policy.title}</CardTitle>
                    <CardDescription>{policy.description}</CardDescription>
                  </div>
                </div>
                <Badge variant={policy.is_active ? "default" : "secondary"}>
                  {policy.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policy.content.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={editingContent?.id === policy.id ? editingContent.content.sections[sectionIndex]?.title : section.title}
                        onChange={(e) => updateSectionTitle(policy.id, sectionIndex, e.target.value)}
                        className="font-medium text-sm"
                        placeholder="Section title"
                      />
                      <Button
                        onClick={() => removeSection(policy.id, sectionIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {(editingContent?.id === policy.id ? editingContent.content.sections[sectionIndex]?.items : section.items)?.map((item: string, itemIndex: number) => (
                        <div key={itemIndex} className="flex items-center space-x-2">
                          <Textarea
                            value={item}
                            onChange={(e) => updateSectionItem(policy.id, sectionIndex, itemIndex, e.target.value)}
                            placeholder="Policy item"
                            className="flex-1 min-h-[60px]"
                          />
                          <Button
                            onClick={() => removeSectionItem(policy.id, sectionIndex, itemIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        onClick={() => addSectionItem(policy.id, sectionIndex)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                ))}

                <Dialog open={showAddSectionDialog && selectedPolicy?.id === policy.id} onOpenChange={setShowAddSectionDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setSelectedPolicy(policy)}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Section</DialogTitle>
                      <DialogDescription>
                        Add a new section to {policy.title}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="section-title">Section Title</Label>
                        <Input
                          id="section-title"
                          value={newSection.title}
                          onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter section title"
                        />
                      </div>
                      <div>
                        <Label>Items</Label>
                        {newSection.items.map((item, index) => (
                          <div key={index} className="flex items-center space-x-2 mt-2">
                            <Input
                              value={item}
                              onChange={(e) => {
                                const newItems = [...newSection.items];
                                newItems[index] = e.target.value;
                                setNewSection(prev => ({ ...prev, items: newItems }));
                              }}
                              placeholder="Enter item"
                            />
                            {newSection.items.length > 1 && (
                              <Button
                                onClick={() => {
                                  const newItems = newSection.items.filter((_, i) => i !== index);
                                  setNewSection(prev => ({ ...prev, items: newItems }));
                                }}
                                variant="ghost"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          onClick={() => setNewSection(prev => ({ ...prev, items: [...prev.items, ''] }))}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => addSection(policy.id)}
                        disabled={!newSection.title.trim()}
                      >
                        Add Section
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Separator />
                
                <div className="flex justify-end space-x-2">
                  {editingContent?.id === policy.id && (
                    <>
                      <Button
                        onClick={() => setEditingContent(null)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => savePolicy(editingContent)}
                        disabled={saving}
                        size="sm"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PoliciesManager;