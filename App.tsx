import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Inventory } from './components/Inventory.tsx';
import { TransactionFlow } from './components/TransactionFlow.tsx';
import { Reports } from './components/Reports.tsx';
import { Role, Product } from './types.ts';

// Làm sạch toàn bộ dữ liệu mẫu
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

  useEffect(() => {
    setIsSyncing(true);
    localStorage.setItem('swp_products', JSON.stringify(products));
    const timer = setTimeout(() => setIsSyncing(false), 800);
    return () => clearTimeout(timer);
  }, [products]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Cập nhật hoặc thêm mới sản phẩm
  const handleUpdateOrAddProduct = (updatedProduct: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.id === updatedProduct.id || p.sku === updatedProduct.sku);
      if (exists) {
        return prev.map(p => (p.id === updatedProduct.id || p.sku === updatedProduct.sku) ? updatedProduct : p);
      }
      return [...prev, updatedProduct];
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
            onUpdateProduct={handleUpdateOrAddProduct} 
          />
        )}
        {activeTab === 'transaction' && (
          <TransactionFlow 
            products={products} 
            onUpdateStock={handleUpdateOrAddProduct}
            onComplete={() => setActiveTab('inventory')} 
          />
        )}
        {activeTab === 'reports' && <Reports products={products} />}
      </main>
    </Layout>
  );
};

export default App;