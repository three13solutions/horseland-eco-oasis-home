import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";

interface FAQCategory {
  id: string;
  title: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface FAQItem {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

const iconOptions = [
  { value: "BookOpen", label: "Book Open" },
  { value: "Hotel", label: "Hotel" },
  { value: "TreePine", label: "Tree Pine" },
  { value: "Shield", label: "Shield" },
  { value: "HelpCircle", label: "Help Circle" },
  { value: "Info", label: "Info" },
  { value: "MessageCircle", label: "Message Circle" },
  { value: "Settings", label: "Settings" },
];

export default function FAQManagement() {
  const queryClient = useQueryClient();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["faq-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FAQCategory[];
    },
  });

  // Fetch items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["faq-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FAQItem[];
    },
  });

  // Category mutations
  const saveCategoryMutation = useMutation({
    mutationFn: async (category: Partial<FAQCategory> & { title: string; icon: string; sort_order: number }) => {
      if (category.id) {
        const { error } = await supabase
          .from("faq_categories")
          .update(category)
          .eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faq_categories").insert([category]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-categories"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast.success("Category saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save category: " + error.message);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-categories"] });
      queryClient.invalidateQueries({ queryKey: ["faq-items"] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete category: " + error.message);
    },
  });

  // Item mutations
  const saveItemMutation = useMutation({
    mutationFn: async (item: Partial<FAQItem> & { category_id: string; question: string; answer: string; sort_order: number }) => {
      if (item.id) {
        const { error } = await supabase
          .from("faq_items")
          .update(item)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faq_items").insert([item]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-items"] });
      setItemDialogOpen(false);
      setEditingItem(null);
      toast.success("FAQ item saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save FAQ item: " + error.message);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-items"] });
      toast.success("FAQ item deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete FAQ item: " + error.message);
    },
  });

  const handleSaveCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const category: any = {
      title: formData.get("title") as string,
      icon: formData.get("icon") as string,
      sort_order: parseInt(formData.get("sort_order") as string),
      is_active: formData.get("is_active") === "on",
    };
    if (editingCategory?.id) {
      category.id = editingCategory.id;
    }
    saveCategoryMutation.mutate(category);
  };

  const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item: any = {
      category_id: formData.get("category_id") as string,
      question: formData.get("question") as string,
      answer: formData.get("answer") as string,
      sort_order: parseInt(formData.get("sort_order") as string),
      is_active: formData.get("is_active") === "on",
    };
    if (editingItem?.id) {
      item.id = editingItem.id;
    }
    saveItemMutation.mutate(item);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getItemsByCategory = (categoryId: string) => {
    return items.filter((item) => item.category_id === categoryId);
  };

  if (categoriesLoading || itemsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">FAQ Management</h1>
          <p className="text-muted-foreground mt-2">Manage FAQ categories and items</p>
        </div>
        <Button onClick={() => {
          setEditingCategory(null);
          setCategoryDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category) => {
          const categoryItems = getItemsByCategory(category.id);
          const isExpanded = expandedCategories.has(category.id);
          
          return (
            <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
              <div className="border rounded-lg bg-card">
                {/* Category Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-4 flex-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{category.title}</h3>
                        <span className="text-xs text-muted-foreground">({categoryItems.length} items)</span>
                        {!category.is_active && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Icon: {category.icon} | Sort: {category.sort_order}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setEditingItem(null);
                        setItemDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this category? All FAQ items will also be deleted.")) {
                          deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* FAQ Items */}
                <CollapsibleContent>
                  <div className="p-4">
                    {categoryItems.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No FAQ items in this category</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead className="w-16">Sort</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Answer</TableHead>
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                              </TableCell>
                              <TableCell>{item.sort_order}</TableCell>
                              <TableCell className="font-medium">{item.question}</TableCell>
                              <TableCell className="max-w-md truncate">{item.answer}</TableCell>
                              <TableCell>
                                {item.is_active ? (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                                ) : (
                                  <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingItem(item);
                                      setSelectedCategoryId(item.category_id);
                                      setItemDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to delete this FAQ item?")) {
                                        deleteItemMutation.mutate(item.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                name="title"
                defaultValue={editingCategory?.title}
                required
                placeholder="e.g., Booking & Reservations"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Icon</label>
              <Select name="icon" defaultValue={editingCategory?.icon || "HelpCircle"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Sort Order</label>
              <Input
                name="sort_order"
                type="number"
                defaultValue={editingCategory?.sort_order || 0}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                name="is_active"
                defaultChecked={editingCategory?.is_active ?? true}
              />
              <label className="text-sm font-medium">Active</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FAQ Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit FAQ Item" : "Add FAQ Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                name="category_id"
                defaultValue={editingItem?.category_id || selectedCategoryId}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Question</label>
              <Input
                name="question"
                defaultValue={editingItem?.question}
                required
                placeholder="e.g., What is your cancellation policy?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Answer</label>
              <Textarea
                name="answer"
                defaultValue={editingItem?.answer}
                required
                rows={6}
                placeholder="Enter the detailed answer..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sort Order</label>
              <Input
                name="sort_order"
                type="number"
                defaultValue={editingItem?.sort_order || 0}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                name="is_active"
                defaultChecked={editingItem?.is_active ?? true}
              />
              <label className="text-sm font-medium">Active</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save FAQ Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
