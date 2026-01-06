import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  AlertCircle,
  MapPin,
  Calendar,
  Box,
  Layers,
  Sparkles,
  Barcode,
  History,
  Package,
  Edit3,
  Check,
  X,
  Tag
} from 'lucide-react';
import { Product, Role } from '../types.ts';

interface InventoryProps {
  userRole: Role;
  products: Product[];
  onUpdateProduct: (p: Product) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ userRole, products, onUpdateProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'low' | 'expiring'>('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    if (selectedFilter === 'low') return matchesSearch && p.quantity < p.minStock;
    if (selectedFilter === 'expiring') {
        if (!p.expiryDate) return false;
        return matchesSearch && new Date(p.expiryDate) < new Date('2025-12-31');
    }
    return matchesSearch;
  });

  const handleAddNewManual = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newProd: Product = {
      id: newId,
      sku: `NEW-${newId.substring(0, 4).toUpperCase()}`,
      name: "Sản phẩm mới",
      category: "Chưa phân loại",
      price: 0,
      cost: 0,
      quantity: 0,
      minStock: 5,
      maxStock: 100,
      lot: "LÔ-01",
      location: { warehouse: 'Kho A', shelf: 'Kệ 01', tier: 'Tầng 1', box: 'Hộp 01' }
    };
    onUpdateProduct(newProd);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
             <h2 className="text-3xl font-black tracking-tighter uppercase">Kho Hàng</h2>
             <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                <Sparkles size={14} className="text-blue-500" /> {products.length > 0 ? `Hiện tại có ${products.length} mã hàng` : 'Chưa có sản phẩm nào'}
             </p>
          </div>
          <button 
            onClick={handleAddNewManual}
            className="bg-blue-600 text-white w-16 h-16 rounded-[22px] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 active:scale-90 transition-all flex items-center justify-center"
          >
            <Plus size={32} />
          </button>
        </div>
        
        {products.length > 0 && (
          <>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={24} />
              <input 
                type="text"
                placeholder="Tìm theo Tên hoặc SKU..."
                className="w-full pl-14 pr-6 py-6 bg-white dark:bg-slate-800 border-none rounded-[32px] shadow-sm focus:ring-4 focus:ring-blue-500/10 text-xl font-bold tracking-tight transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
              <FilterButton 
                active={selectedFilter === 'all'} 
                onClick={() => setSelectedFilter('all')}
                label="TẤT CẢ" 
                count={products.length}
              />
              <FilterButton 
                active={selectedFilter === 'low'} 
                onClick={() => setSelectedFilter('low')}
                label="SẮP HẾT" 
                count={products.filter(p => p.quantity < p.minStock).length}
                color="bg-orange-600"
              />
              <FilterButton 
                active={selectedFilter === 'expiring'} 
                onClick={() => setSelectedFilter('expiring')}
                label="HẾT HẠN" 
                count={products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).length}
                color="bg-red-600"
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-[48px] border-2 border-dashed border-slate-200 dark:border-slate-700">
             <Package size={64} className="text-slate-200 mb-4" />
             <p className="font-bold text-slate-400">Danh sách trống</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              userRole={userRole} 
              onUpdate={onUpdateProduct}
            />
          ))
        )}
      </div>
    </div>
  );
};

const FilterButton: React.FC<{ label: string, count: number, active: boolean, onClick: () => void, color?: string }> = ({ label, count, active, onClick, color = "bg-blue-600" }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 ${
      active 
        ? `${color} text-white shadow-xl scale-105 ring-4 ring-offset-2 ring-transparent` 
        : 'bg-white dark:bg-slate-800 text-slate-500 border-2 border-slate-100 dark:border-slate-700'
    }`}
  >
    <span className="text-xs font-black tracking-widest">{label}</span>
    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{count}</span>
  </button>
);

const ProductCard: React.FC<{ product: Product, userRole: Role, onUpdate: (p: Product) => void }> = ({ product, userRole, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Product>(product);

  const isLowStock = product.quantity < product.minStock;
  const isAdmin = userRole === Role.ADMIN;
  const isExpired = product.expiryDate && new Date(product.expiryDate) < new Date();

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(product);
    setIsEditing(false);
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-[40px] p-6 shadow-sm border-2 transition-all group relative overflow-hidden ${isEditing ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-50 dark:border-slate-800 hover:shadow-2xl hover:border-blue-100'}`}>
      {isLowStock && !isEditing && (
        <div className="absolute top-0 right-0 bg-orange-600 text-white px-6 py-1.5 rounded-bl-[24px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
           <AlertCircle size={12} /> Cần nhập hàng
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-5 w-full">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-[28px] flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-600 group-hover:scale-105 transition-transform shrink-0">
             <img src={`https://picsum.photos/seed/${product.id}/200/200`} alt={product.name} className="object-cover w-full h-full" />
          </div>
          <div className="flex flex-col justify-center flex-1">
            {isEditing ? (
              <input 
                type="text" 
                value={editData.name}
                onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="font-black text-xl bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-xl mb-2 w-full uppercase"
              />
            ) : (
              <h3 className="font-black text-xl leading-tight mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight truncate max-w-[200px]">{product.name}</h3>
            )}
            
            <div className="flex flex-wrap items-center gap-2">
               {isEditing ? (
                 <>
                  <input 
                    type="text" 
                    value={editData.sku}
                    onChange={(e) => setEditData({...editData, sku: e.target.value})}
                    placeholder="Mã SKU"
                    className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg w-24"
                  />
                  <input 
                    type="text" 
                    value={editData.category}
                    onChange={(e) => setEditData({...editData, category: e.target.value})}
                    placeholder="Danh mục"
                    className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg w-24 uppercase"
                  />
                 </>
               ) : (
                 <>
                  <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg tracking-widest flex items-center gap-1.5">
                    <Barcode size={12} /> {product.sku}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{product.category}</span>
                 </>
               )}
            </div>
          </div>
        </div>
        {!isEditing && (
          <div className="text-right flex flex-col items-end shrink-0">
            <div className={`text-4xl font-black leading-none mb-1 ${isLowStock ? 'text-orange-600' : 'text-blue-600'}`}>
              {product.quantity}
            </div>
            <div className="text-[10px] uppercase font-black text-slate-300 tracking-[0.2em]">Tồn kho</div>
          </div>
        )}
      </div>

      {/* Manual Controls Grid (Kho, Kệ, Lô, Hạn dùng) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Kho & Kệ */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Kho & Kệ hàng</label>
          {isEditing ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={editData.location.warehouse}
                onChange={(e) => setEditData({...editData, location: {...editData.location, warehouse: e.target.value}})}
                placeholder="Tên Kho"
                className="flex-1 text-xs font-bold bg-slate-50 dark:bg-slate-700 p-3 rounded-2xl border border-slate-100"
              />
              <input 
                type="text" 
                value={editData.location.shelf}
                onChange={(e) => setEditData({...editData, location: {...editData.location, shelf: e.target.value}})}
                placeholder="Kệ"
                className="w-20 text-xs font-bold bg-slate-50 dark:bg-slate-700 p-3 rounded-2xl border border-slate-100"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-700/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
              <MapPin size={16} className="text-blue-500" />
              <span className="truncate">{product.location.warehouse} • {product.location.shelf}</span>
            </div>
          )}
        </div>

        {/* Lô & Hạn Dùng */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Lô & Hạn dùng</label>
          {isEditing ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={editData.lot || ''}
                onChange={(e) => setEditData({...editData, lot: e.target.value})}
                placeholder="Số Lô"
                className="w-24 text-xs font-bold bg-slate-50 dark:bg-slate-700 p-3 rounded-2xl border border-slate-100"
              />
              <input 
                type="date" 
                value={editData.expiryDate || ''}
                onChange={(e) => setEditData({...editData, expiryDate: e.target.value})}
                className="flex-1 text-xs font-bold bg-slate-50 dark:bg-slate-700 p-3 rounded-2xl border border-slate-100"
              />
            </div>
          ) : (
            <div className={`flex items-center gap-3 text-xs font-bold p-3 rounded-2xl border border-slate-100 dark:border-slate-700 ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
              <Calendar size={16} />
              <span className="truncate uppercase">Lô {product.lot || 'N/A'} • {isExpired ? 'HẾT HẠN' : 'HẠN'}: {product.expiryDate || 'N/A'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Details & Action Buttons */}
      <div className="flex items-center justify-between border-t-2 border-dashed dark:border-slate-700 pt-5 mt-2">
        <div className="flex gap-2">
           {isEditing ? (
             <>
               <input 
                  type="text" 
                  value={editData.location.tier}
                  onChange={(e) => setEditData({...editData, location: {...editData.location, tier: e.target.value}})}
                  placeholder="Tầng"
                  className="text-[10px] font-black px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl w-20"
                />
                <input 
                  type="text" 
                  value={editData.location.box}
                  onChange={(e) => setEditData({...editData, location: {...editData.location, box: e.target.value}})}
                  placeholder="Hộp"
                  className="text-[10px] font-black px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl w-20"
                />
             </>
           ) : (
             <>
                <div className="flex items-center gap-2 text-[10px] font-black px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500">
                  <Layers size={14} /> TẦNG {product.location.tier.split(' ')[1] || product.location.tier}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500">
                  <Box size={14} /> {product.location.box.toUpperCase()}
                </div>
             </>
           )}
        </div>
        
        <div className="flex items-center gap-3">
           {isEditing ? (
             <div className="flex gap-2">
                <button 
                  onClick={handleCancel}
                  className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                >
                  <X size={18} />
                </button>
                <button 
                  onClick={handleSave}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                >
                  <Check size={18} />
                </button>
             </div>
           ) : (
             <>
               {isAdmin && (
                 <div className="text-lg font-black text-slate-900 dark:text-white mr-2">
                   {product.price.toLocaleString('vi-VN')}đ
                 </div>
               )}
               <button 
                onClick={() => setIsEditing(true)}
                className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
               >
                  <Edit3 size={18} />
               </button>
               <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 transition-all">
                  <History size={18} />
               </button>
             </>
           )}
        </div>
      </div>
    </div>
  );
}