import { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MenuItemForm } from './menu/MenuItemForm';
import { MenuItemGrid } from './menu/MenuItemGrid';

interface MenuItem {
  id: string;
  name: string;
  name_ko?: string;
  description?: string;
  description_ko?: string;
  price: number;
  category: string;
  is_available: boolean;
  image?: string;
}

export function MenuManagement() {
  const session = useSession();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ko: '',
    description: '',
    description_ko: '',
    price: '',
    category: '',
    is_available: true,
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  async function loadMenuItems() {
    try {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', session?.user?.id)
        .single();

      if (vendorData) {
        const { data } = await supabase
          .from('menu_items')
          .select('*')
          .eq('vendor_id', vendorData.id)
          .order('category', { ascending: true });
        setMenuItems(data || []);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load menu items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu_items')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu_items')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', session?.user?.id)
        .single();

      if (!vendorData) throw new Error('Vendor not found');

      let imageUrl = editingItem?.image;
      if (selectedImage) {
        imageUrl = await handleImageUpload(selectedImage);
      }

      const menuItemData = {
        vendor_id: vendorData.id,
        name: formData.name,
        name_ko: formData.name_ko || null,
        description: formData.description || null,
        description_ko: formData.description_ko || null,
        price: parseFloat(formData.price),
        category: formData.category,
        is_available: formData.is_available,
        image: imageUrl,
      };

      let error;
      if (editingItem) {
        ({ error } = await supabase
          .from('menu_items')
          .update(menuItemData)
          .eq('id', editingItem.id));
      } else {
        ({ error } = await supabase
          .from('menu_items')
          .insert([menuItemData]));
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Menu item ${editingItem ? 'updated' : 'added'} successfully`,
      });

      setIsDialogOpen(false);
      setEditingItem(null);
      setSelectedImage(null);
      resetForm();
      loadMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save menu item',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(itemId: string) {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Menu item deleted successfully',
      });

      loadMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete menu item',
        variant: 'destructive',
      });
    }
  }

  function handleEdit(item: MenuItem) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      name_ko: item.name_ko || '',
      description: item.description || '',
      description_ko: item.description_ko || '',
      price: item.price.toString(),
      category: item.category,
      is_available: item.is_available,
    });
    setIsDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      name_ko: '',
      description: '',
      description_ko: '',
      price: '',
      category: '',
      is_available: true,
    });
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 z-10 py-4 px-2">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              resetForm();
              setSelectedImage(null);
            }}>
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </DialogTitle>
            </DialogHeader>
            <MenuItemForm
              editingItem={editingItem}
              formData={formData}
              setFormData={setFormData}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              onSubmit={handleSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>
      <MenuItemGrid
        items={menuItems}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}