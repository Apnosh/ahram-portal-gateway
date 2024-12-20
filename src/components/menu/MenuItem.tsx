import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { MenuItem as MenuItemType } from "@/contexts/CartContext";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MenuItemProps {
  item: MenuItemType;
  onAddToCart: (item: MenuItemType) => void;
}

export function MenuItem({ item, onAddToCart }: MenuItemProps) {
  const { language, t } = useLanguage();
  const displayName = language === 'en' ? item.name : item.nameKo;
  const displayDescription = language === 'en' ? item.description : item.descriptionKo;

  // Query to get the total quantity ordered for this item
  const { data: orderedQuantity = 0 } = useQuery({
    queryKey: ['ordered-quantity', item.id],
    queryFn: async () => {
      if (!item.quantity_limit) return 0;

      const { data, error } = await supabase
        .from('order_items')
        .select('quantity')
        .eq('menu_item_id', item.id)
        .in('order.status', ['pending', 'confirmed']);

      if (error) {
        console.error('Error fetching ordered quantity:', error);
        return 0;
      }

      return data.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
    },
    enabled: !!item.quantity_limit,
  });

  const remainingQuantity = item.quantity_limit ? item.quantity_limit - orderedQuantity : null;

  const getQuantityDisplay = () => {
    if (!item.quantity_limit) return t('item.noLimit');
    if (remainingQuantity === 0) return t('item.soldOut');
    return `${t('Remaining: ')} ${remainingQuantity} `;
  };

  return (
    <Card className="group overflow-hidden rounded-lg transition-all duration-300 hover:shadow-lg animate-fade-in">
      <div className="aspect-w-16 aspect-h-9 relative overflow-hidden">
        {item.image && (
          <img
            src={item.image}
            alt={displayName}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-medium mb-1">
          {displayName}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {displayDescription}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-primary">${item.price}</span>
            <Badge 
              variant={remainingQuantity === 0 ? "destructive" : "secondary"} 
              className="text-xs"
            >
              {getQuantityDisplay()}
            </Badge>
          </div>
          <Button 
            onClick={() => onAddToCart(item)}
            className="w-full bg-primary hover:bg-primary/90 text-white"
            disabled={remainingQuantity === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('item.add')}
          </Button>
        </div>
      </div>
    </Card>
  );
}