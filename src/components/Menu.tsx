import { useLanguage } from "@/contexts/LanguageContext";
import { useCart, MenuItem } from "@/contexts/CartContext";
import { MenuGrid } from "./menu/MenuGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export function Menu() {
  const { t } = useLanguage();
  const { addItem } = useCart();

  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      console.log('Fetching menu items...');
      const { data: items, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          order_items:order_items(
            quantity,
            order:orders(status)
          )
        `)
        .eq('is_available', true);

      if (error) {
        console.error('Error fetching menu items:', error);
        throw error;
      }

      console.log('Fetched menu items:', items);

      if (!items || items.length === 0) {
        console.log('No menu items found');
        return [];
      }

      return items.map(item => {
        // Only count quantities from completed or pending orders
        const totalOrdered = item.order_items?.reduce((sum, orderItem) => {
          const orderStatus = orderItem.order?.status;
          if (orderStatus === 'completed' || orderStatus === 'pending') {
            return sum + orderItem.quantity;
          }
          return sum;
        }, 0) || 0;

        // Calculate remaining quantity if there's a limit
        const remainingQuantity = item.quantity !== null 
          ? Math.max(0, item.quantity - totalOrdered)
          : null;

        return {
          id: item.id,
          name: item.name,
          nameKo: item.name_ko,
          description: item.description || '',
          descriptionKo: item.description_ko || '',
          price: Number(item.price),
          image: item.image || '/placeholder.svg',
          remainingQuantity
        };
      });
    }
  });

  if (error) {
    console.error('Error in menu component:', error);
    toast({
      title: "Error",
      description: "Failed to load menu items. Please try again later.",
      variant: "destructive",
    });
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-red-600">
          Failed to load menu items. Please try again later.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading menu items...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/20 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('menu.title')}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our selection of authentic Korean dishes, carefully prepared and beautifully presented
          </p>
        </div>
        <MenuGrid items={menuItems} onAddToCart={addItem} />
      </div>
    </div>
  );
}