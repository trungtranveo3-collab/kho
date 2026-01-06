import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Download, 
  Calendar,
  AlertTriangle,
  History,
  TrendingUp,
  Tag,
  FileSpreadsheet
} from 'lucide-react';
import { Product } from '../types.ts';

export const Reports: React.FC<{ products: Product[] }> = ({ products }) => {
  // Tính toán dữ liệu theo danh mục
  const categoryDataMap = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.quantity;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({
    name,
    value
  }));

  // Tính toán các sản phẩm sắp hết hạn (trong vòng 60 ngày)
  const today = new Date();
  const sixtyDaysLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  
  const expiringSoon = products.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp <= sixtyDaysLater && exp >= today;
  });

  const expired = products.filter(p => {
    if (!p.expiryDate) return false;
    return new Date(p.expiryDate) < today;
  });

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

  // Hàm xuất file Excel (CSV UTF-8 BOM)
  const handleDownloadExcel = () => {
    if (products.length === 0) {
      alert("Không có dữ liệu để xuất báo cáo!");
      return;
    }

    // Tiêu đề cột
    const headers = [
      "Mã SKU",
      "Tên sản phẩm",
      "Danh mục",
      "Số lượng",
      "Giá vốn (đ)",
      "Giá bán (đ)",
      "Hạn dùng",
      "Kho",
      "Kệ",
      "Tầng",
      "Hộp"
    ];

    // Chuyển đổi dữ liệu sản phẩm thành các dòng CSV
    const rows = products.map(p => [
      p.sku,
      p.name,
      p.category,
      p.quantity,
      p.cost,
      p.price,
      p.expiryDate || "N/A",
      p.location.warehouse,
      p.location.shelf,
      p.location.tier,
      p.location.box
    ]);

    // Tạo nội dung CSV với UTF-8 BOM để Excel đọc được tiếng Việt
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Tạo link ẩn để tải về
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_Cao_Kho_SmartWare_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase">Báo cáo kho</h2>
          <p className="text-sm font-bold text-slate-400">Dữ liệu được cập nhật thời gian thực</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadExcel}
            title="Tải báo cáo Excel"
            className="p-5 bg-blue-600 text-white rounded-[24px] shadow-xl shadow-blue-500/20 active:scale-90 transition-all hover:bg-blue-700 flex items-center gap-3"
          >
            <FileSpreadsheet size={24} />
            <span className="font-black text-xs uppercase tracking-widest hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 1. Tồn kho theo Danh Mục */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
            <Tag size={20} />
          </div>
          <h3 className="font-black text-lg uppercase tracking-tight">Tồn kho theo danh mục</h3>
        </div>
        
        <div className="h-64 w-full">
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={80} />
                <Tooltip 
                  cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 font-bold italic">Chưa có dữ liệu danh mục</div>
          )}
        </div>
      </div>

      {/* 2. Cảnh báo Lô & Hạn dùng (Lot/Date) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight">Hết hạn / Sắp hết</h3>
          </div>
          
          <div className="space-y-4">
            {expired.length === 0 && expiringSoon.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Không có cảnh báo</div>
            ) : (
              <>
                {expired.map(p => (
                  <ExpiringItem key={p.id} product={p} status="EXPIRED" />
                ))}
                {expiringSoon.map(p => (
                  <ExpiringItem key={p.id} product={p} status="SOON" />
                ))}
              </>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl flex items-center justify-center">
              <History size={20} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight">Tình trạng Lô hàng</h3>
          </div>
          
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Kho trống</div>
            ) : (
              products.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{p.sku}</span>
                    <span className="font-bold text-sm truncate max-w-[120px]">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black px-3 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm">LÔ: {p.sku.split('-')[1] || 'NEW'}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">SL: {p.quantity}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Phân bổ giá trị tài sản */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp size={24} className="text-blue-400" />
            <h3 className="font-black text-xl uppercase tracking-tighter">Giá trị tài sản kho</h3>
          </div>
          <div className="flex flex-col gap-1 mb-8">
            <span className="text-sm font-bold opacity-60 uppercase tracking-[0.2em]">Tổng vốn tồn kho</span>
            <span className="text-5xl font-black tracking-tighter">
              {products.reduce((acc, p) => acc + (p.cost * p.quantity), 0).toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="block text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Doanh thu dự kiến</span>
                <span className="text-xl font-bold">
                  {products.reduce((acc, p) => acc + (p.price * p.quantity), 0).toLocaleString('vi-VN')}đ
                </span>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="block text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Lợi nhuận gộp</span>
                <span className="text-xl font-bold text-green-400">
                  {products.reduce((acc, p) => acc + ((p.price - p.cost) * p.quantity), 0).toLocaleString('vi-VN')}đ
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpiringItem: React.FC<{ product: Product, status: 'EXPIRED' | 'SOON' }> = ({ product, status }) => (
  <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${status === 'EXPIRED' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30'}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${status === 'EXPIRED' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
      <Calendar size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-sm truncate uppercase tracking-tight">{product.name}</h4>
      <p className={`text-[10px] font-black uppercase ${status === 'EXPIRED' ? 'text-red-600' : 'text-orange-600'}`}>
        {status === 'EXPIRED' ? 'ĐÃ HẾT HẠN' : 'SẮP HẾT HẠN'}: {product.expiryDate}
      </p>
    </div>
    <div className="text-right">
      <span className="text-lg font-black">{product.quantity}</span>
      <span className="block text-[8px] font-bold opacity-40 uppercase">Tồn</span>
    </div>
  </div>
);