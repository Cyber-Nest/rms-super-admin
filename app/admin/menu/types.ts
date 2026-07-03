export interface Category {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  displayOrder: number;
}

export interface ModifierOption {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  isDefault: boolean;
  image?: string;
  modifierGroups?: string[];
}

export interface ModifierGroup {
  id?: string;
  _id?: string;
  name: string;
  required: boolean;
  minSelection: number;
  maxSelection: number;
  displayType: "radio" | "checkbox" | "card";
  options: ModifierOption[];
}

export interface Product {
  id?: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  itemType: "simple" | "combo";
  categoryId: string | any;
  modifierGroups: string[] | any[];
  badge?: "Popular" | "Best Seller" | "New" | null;
  productId?: string;
  isActive?: boolean;
}
