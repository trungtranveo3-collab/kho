import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  PackageCheck, 
  Zap,
  PlusCircle
} from 'lucide-react';
import { Role, Product } from '../types.ts';

export const Dashboard: React.FC<{ userRole: Role, products: Product[] }> = ({ userRole, products }) => {
  const isAdmin = userRole === Role.ADMIN;

  // Tính toán dữ liệu thực tế
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const lowStockCount = products.filter(p => p.quantity < p.minStock).length;
  
  const chartData = products.slice(0, 5).map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
    stock: p.quantity,
    value: p.price * p.quantity
  }));

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-6 animate-in fade-in duration-700">
        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
           <PackageCheck size={64} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight">KHO ĐANG TRỐNG</h2>
          <p className="text-slate-500 mt-2 font-medium">Hãy bắt đầu bằng việc nhập lô hàng đầu tiên.</p>
        </div>
        <div className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 transition-all cursor-pointer">
           <Zap size={20} /> NHẬP KHO NGAY
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Chào buổi sáng, <span className="text-blue-600">Admin</span>!</h2>
        <p className="opacity-60 text-lg">Hệ thống đang quản lý {products.length} mã hàng.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isAdmin && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-600">
              <DollarSign size={20} />
              <span className="font-semibold text-sm uppercase tracking-wider">Giá trị kho</span>
            </div>
            <div className="text-3xl font-bold">{totalInventoryValue.toLocaleString('vi-VN')}đ</div>
            <div className="flex items-center gap-1 text-blue-500 text-sm font-medium">
              <span>Cập nhật thời gian thực</span>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-orange-500">
            <AlertTriangle size={20} />
            <span className="font-semibold text-sm uppercase tracking-wider">Cảnh báo tồn</span>
          </div>
          <div className="text-3xl font-bold">{lowStockCount} Sản phẩm</div>
          <div className="text-slate-500 text-sm">Cần kiểm tra lại mức tồn tối thiểu</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-500">
            <Zap size={20} />
            <span className="font-semibold text-sm uppercase tracking-wider">Tổng sản phẩm</span>
          </div>
          <div className="text-3xl font-bold">{products.reduce((acc, p) => acc + p.quantity, 0)} Đvị</div>
          <div className="flex items-center gap-1 text-blue-500 text-sm font-medium">
            <span>Trong toàn bộ hệ thống</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-lg uppercase tracking-tighter">
            <TrendingUp className="text-blue-600" />
            Tồn kho theo sản phẩm
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="stock" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-lg uppercase tracking-tighter">
            <PackageCheck className="text-blue-600" />
            Cơ cấu danh mục
          </h3>
          <div className="h-64 w-full flex flex-col items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(products.reduce((acc, p) => {
                    acc[p.category] = (acc[p.category] || 0) + 1;
                    return acc;
                  }, {} as any)).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {products.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};