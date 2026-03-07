export interface Product {
  id: number;
  productName: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock: number;
  externalLink?: string;
  features?: string;
  userId?: number;
}

export interface ProductPayload {
  productName: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock: number;
  externalLink?: string;
  features?: string;
}
