
export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export enum TransactionType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  TRANSFER = 'TRANSFER'
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  maxStock: number;
  expiryDate?: string;
  lot?: string; // Thêm trường lô hàng
  location: {
    warehouse: string;
    shelf: string;
    tier: string;
    box: string;
  };
  lastSupplier?: string;
}

export interface StockAlert {
  type: 'LOW_STOCK' | 'OVER_STOCK' | 'EXPIRING_SOON';
  productId: string;
  message: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  productId: string;
  quantity: number;
  timestamp: string;
  userId: string;
  supplierId?: string;
  notes?: string;
}

export interface DashboardStats {
  totalValue: number;
  topProducts: { name: string; sales: number; stock: number }[];
  discrepancyRate: number;
}