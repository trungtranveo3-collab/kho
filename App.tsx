
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Inventory } from './components/Inventory.tsx';
import { TransactionFlow } from './components/TransactionFlow.tsx';
import { Reports } from './components/Reports.tsx';
import { Role, Product } from './types.ts';

const DEFAULT_PRODUCTS: Product[] = [];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transaction' | 'reports'>('dashboard');
  const [userRole, setUserRole] = useState<Role>(Role.ADMIN);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('swp_products');
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
  });

  // Lưu trữ dữ liệu và thông báo đồng bộ
  useEffect(() => {
    setIsSyncing(true);
    localStorage.setItem('swp_products', JSON.stringify(products));
    const timer = setTimeout(() => setIsSyncing(false), 500);
    return () => clearTimeout(timer);
  }, [products]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  /**
   * HÀM CẬP NHẬT TRUNG TÂM (BATCH UPDATE)
   * Đảm bảo mọi thay đổi đều được gom nhóm để tránh mất dữ liệu khi cập nhật nhanh
   */
  const handleUpdateStock = (updates: Product | Product[]) => {
    const updateArray = Array.isArray(updates) ? updates : [updates];
    
    setProducts(prev => {
      const newList = [...prev];
      
      updateArray.forEach(updatedItem => {
        // Tìm theo SKU trước, ID sau
        const index = newList.findIndex(p => 
          (updatedItem.sku && p.sku === updatedItem.sku) || 
          (updatedItem.id && p.id === updatedItem.id)
        );

        if (index > -1) {
          // Cập nhật sản phẩm cũ, giữ nguyên các thông tin vị trí nếu update không có
          newList[index] = { 
            ...newList[index], 
            ...updatedItem,
            // Đảm bảo số lượng không bao giờ âm
            quantity: Math.max(0, updatedItem.quantity)
          };
        } else {
          // Thêm sản phẩm mới hoàn toàn
          newList.unshift({
            ...updatedItem,
            id: updatedItem.id || Math.random().toString(36).substr(2, 9),
            location: updatedItem.location || { warehouse: 'Kho Chính', shelf: 'Kệ Đợi', tier: 'Tầng 1', box: 'Chưa xếp' }
          });
        }
      });
      
      return newList;
    });
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
      userRole={userRole}
      isSyncing={isSyncing}
    >
      <main className="max-w-4xl mx-auto p-4 transition-all duration-300">
        {activeTab === 'dashboard' && <Dashboard userRole={userRole} products={products} />}
        {activeTab === 'inventory' && (
          <Inventory 
            userRole={userRole} 
            products={products} 
            onUpdateProduct={(p) => handleUpdateStock(p)} 
          />
        )}
        {activeTab === 'transaction' && (
          <TransactionFlow 
            products={products} 
            onUpdateStock={(p) => handleUpdateStock(p)}
            onComplete={() => setActiveTab('inventory')} 
          />
        )}
        {activeTab === 'reports' && <Reports products={products} />}
      </main>
    </Layout>
  );
};

export default App;
