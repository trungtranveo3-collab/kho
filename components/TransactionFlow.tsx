
import React, { useState, useRef, useEffect } from 'react';
import { 
  Scan, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  ChevronRight,
  CheckCircle2,
  Package,
  ArrowRight,
  FileUp,
  BrainCircuit,
  Loader2,
  Sparkles,
  ChevronLeft,
  Keyboard,
  ClipboardList,
  AlertCircle,
  Key
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import jsQR from "jsqr";
import { Product } from '../types.ts';

type Step = 'TYPE' | 'METHOD' | 'CHOICE' | 'SCAN_QR' | 'MANUAL_ENTRY' | 'AI_UPLOAD' | 'AI_REVIEW' | 'DETAILS' | 'SUCCESS';
type TxType = 'IN' | 'OUT' | 'TRANSFER';

interface AIAnalyzedItem {
  sku: string;
  name: string;
  quantity: number;
  category: string;
  price: number;
  cost: number;
  lot: string;
  expiryDate: string;
}

interface TransactionFlowProps {
  products: Product[];
  onUpdateStock: (product: Product) => void;
  onComplete: () => void;
}

// Fixed: Removed the conflicting manual declaration of 'aistudio' on Window.
// The environment already provides an 'AIStudio' type for 'window.aistudio'.

export const TransactionFlow: React.FC<TransactionFlowProps> = ({ products, onUpdateStock, onComplete }) => {
  const [step, setStep] = useState<Step>('TYPE');
  const [txType, setTxType] = useState<TxType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState<AIAnalyzedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsKeySelection, setNeedsKeySelection] = useState(false);
  
  const [manualForm, setManualForm] = useState<Partial<Product>>({
    sku: '',
    name: '',
    category: 'Tổng hợp',
    quantity: 0,
    lot: '',
    expiryDate: ''
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    if (step === 'SCAN_QR') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const handleKeySelection = async () => {
    try {
      // @ts-ignore - Assuming aistudio is globally available per requirements
      await window.aistudio.openSelectKey();
      setNeedsKeySelection(false);
      setError(null);
    } catch (e) {
      setError("Không thể mở trình chọn khóa API.");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err) {
      setError("Không thể mở camera.");
    }
  };

  const stopCamera = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };

  const scanTick = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          const found = products.find(p => p.sku === code.data || p.id === code.data);
          if (found) {
            setSelectedProduct(found);
            setStep('DETAILS');
          } else {
            setManualForm({ ...manualForm, sku: code.data });
            setStep('MANUAL_ENTRY');
          }
          return;
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanTick);
  };

  const handleFinalize = () => {
    if (selectedProduct && txType) {
      const adjustment = txType === 'IN' ? quantity : -quantity;
      const updatedProduct = {
        ...selectedProduct,
        quantity: Math.max(0, (selectedProduct.quantity || 0) + adjustment)
      };
      onUpdateStock(updatedProduct);
      setStep('SUCCESS');
    }
  };

  const handleManualSubmit = () => {
    if (!manualForm.sku || !manualForm.name) {
      setError("Vui lòng điền SKU và Tên sản phẩm");
      return;
    }
    
    const existing = products.find(p => p.sku === manualForm.sku);
    const productToUpdate: Product = existing ? {
      ...existing,
      quantity: txType === 'IN' ? (existing.quantity + (manualForm.quantity || 0)) : Math.max(0, existing.quantity - (manualForm.quantity || 0)),
      lot: manualForm.lot || existing.lot,
      expiryDate: manualForm.expiryDate || existing.expiryDate
    } : {
      id: Math.random().toString(36).substr(2, 9),
      sku: manualForm.sku!,
      name: manualForm.name!,
      category: manualForm.category || 'Chưa phân loại',
      price: 0,
      cost: 0,
      quantity: manualForm.quantity || 0,
      minStock: 5,
      maxStock: 100,
      lot: manualForm.lot,
      expiryDate: manualForm.expiryDate,
      location: { warehouse: 'Kho Mới', shelf: 'Kệ 01', tier: 'Tầng 1', box: 'Hộp 01' }
    };
    
    onUpdateStock(productToUpdate);
    setStep('SUCCESS');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra API Key Selection trước khi chạy AI
    // @ts-ignore - Assuming aistudio is globally available per requirements
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }

    setIsAnalyzing(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{
            parts: [
              { text: `BẠN LÀ CHUYÊN GIA KIỂM SOÁT KHO (INVENTORY AUDITOR) VỚI ĐỘ CHÍNH XÁC 100%.
NHIỆM VỤ: Trích xuất thông tin từ hóa đơn/phiếu nhập xuất đính kèm.

YÊU CẦU QUAN TRỌNG:
1. Đọc kĩ từng dòng (line items).
2. Tên sản phẩm (name): Trích xuất tên đầy đủ, không viết tắt.
3. Số lượng (quantity): Luôn lấy số lượng thực tế của từng mã hàng.
4. SKU: Nếu không có mã rõ ràng, hãy tạo mã dựa trên tên (VD: 'Bào Khí Khang' -> 'BKK').
5. Lô (lot): Rất quan trọng, tìm các ký hiệu như Lot, Lô, No.
6. Hạn dùng (expiryDate): Định dạng YYYY-MM-DD.

HÃY SUY LUẬN TỪNG BƯỚC (STEP-BY-STEP REASONING) TRƯỚC KHI TRẢ VỀ JSON.` },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }],
          config: {
            thinkingConfig: { thinkingBudget: 5000 },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sku: { type: Type.STRING },
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  cost: { type: Type.NUMBER },
                  lot: { type: Type.STRING },
                  expiryDate: { type: Type.STRING }
                },
                required: ["name", "quantity"]
              }
            }
          }
        });
        const result = JSON.parse(response.text || '[]');
        if (result.length === 0) throw new Error("AI không tìm thấy sản phẩm nào trong ảnh.");
        setAnalyzedItems(result);
        setStep('AI_REVIEW');
      } catch (err: any) {
        console.error(err);
        if (err.message?.includes("Requested entity was not found") || err.message?.includes("404")) {
          setNeedsKeySelection(true);
          setError("Lỗi kết nối API (NOT_FOUND). Vui lòng cấu hình lại API Key từ Project đã trả phí.");
        } else {
          setError("Không thể đọc được dữ liệu. Ảnh có thể bị mờ hoặc không phải hóa đơn hàng hóa.");
        }
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmAllAIItems = () => {
      analyzedItems.forEach(item => {
          const existing = products.find(p => p.sku === item.sku);
          const baseProduct = existing || {
              id: Math.random().toString(36).substr(2, 9),
              sku: item.sku || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              name: item.name,
              category: item.category || "AI Imported",
              price: item.price || 0,
              cost: item.cost || 0,
              quantity: 0,
              minStock: 5,
              maxStock: 100,
              location: { warehouse: 'Kho AI', shelf: 'Kệ 01', tier: 'Tầng 1', box: 'Hộp 01' }
          };
          
          const adjustment = txType === 'OUT' ? -item.quantity : item.quantity;
          onUpdateStock({
              ...baseProduct,
              quantity: Math.max(0, (baseProduct.quantity || 0) + adjustment),
              lot: item.lot || baseProduct.lot,
              expiryDate: item.expiryDate || baseProduct.expiryDate
          });
      });
      setStep('SUCCESS');
  };

  const renderStep = () => {
    switch (step) {
      case 'TYPE':
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300 px-2">
            <h3 className="text-2xl font-black text-center mb-10 tracking-tight uppercase">Loại giao dịch</h3>
            <div className="grid grid-cols-1 gap-5">
              <ActionButton icon={ArrowDownLeft} label="GHI NHẬP KHO" desc="Thêm mới hoặc Bổ sung hàng" color="bg-blue-600" onClick={() => { setTxType('IN'); setStep('METHOD'); }} />
              <ActionButton icon={ArrowUpRight} label="GHI XUẤT KHO" desc="Bán hàng hoặc Chuyển kho" color="bg-slate-800" onClick={() => { setTxType('OUT'); setStep('METHOD'); }} />
            </div>
          </div>
        );

      case 'METHOD':
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300 px-2">
            <div className="flex items-center mb-8">
              <button onClick={() => setStep('TYPE')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900"><ChevronLeft size={28} /></button>
              <h3 className="text-xl font-black flex-1 text-center pr-8 uppercase">Cách nhập liệu</h3>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <ActionButton icon={Scan} label="QUÉT QR / BARCODE" desc="Tự động tìm hoặc tạo mới" color="bg-blue-600" onClick={() => setStep('SCAN_QR')} />
              <ActionButton icon={BrainCircuit} label="HÌNH ẢNH / CHỨNG TỪ" desc="Nâng cấp bộ não AI thông minh" color="bg-gradient-to-r from-purple-600 to-blue-600" onClick={() => setStep('CHOICE')} special />
              <ActionButton icon={Keyboard} label="NHẬP FORM TRỰC TIẾP" desc="Nhập liệu nhanh bằng tay" color="bg-slate-700" onClick={() => { setManualForm({...manualForm, quantity: 1}); setStep('MANUAL_ENTRY'); }} />
            </div>
          </div>
        );

      case 'CHOICE':
        return (
          <div className="space-y-8 animate-in zoom-in duration-300 px-2 flex flex-col items-center justify-center py-10">
            <h3 className="text-2xl font-black uppercase text-center mb-2">Xử lý dữ liệu ảnh</h3>
            <p className="text-slate-500 font-bold text-center mb-8 px-10">AI phù hợp cho danh sách dài. Nhập tay nếu ảnh mờ hoặc chỉ có 1-2 món.</p>
            <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
              <button 
                onClick={() => setStep('AI_UPLOAD')}
                className="flex flex-col items-center gap-4 p-8 bg-blue-600 text-white rounded-[40px] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all"
              >
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center shadow-inner">
                    <BrainCircuit size={48} />
                </div>
                <div className="text-center">
                  <div className="font-black text-xl uppercase tracking-tighter">AI Smart Scan V2</div>
                  <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">Độ chính xác cao hơn</div>
                </div>
              </button>
              <button 
                onClick={() => setStep('MANUAL_ENTRY')}
                className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-slate-800 border-2 border-slate-100 rounded-[40px] shadow-sm active:scale-95 transition-all"
              >
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-3xl flex items-center justify-center">
                    <ClipboardList size={40} className="text-slate-400" />
                </div>
                <div className="text-center text-slate-900 dark:text-white">
                  <div className="font-black text-xl uppercase tracking-tighter">Nhập Thủ Công</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Chỉnh sửa chi tiết</div>
                </div>
              </button>
            </div>
            <button onClick={() => setStep('METHOD')} className="mt-8 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-blue-600 transition-colors">Quay lại</button>
          </div>
        );

      case 'MANUAL_ENTRY':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-300 px-2 pb-10">
            <div className="flex items-center mb-6">
              <button onClick={() => setStep('METHOD')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900"><ChevronLeft size={28} /></button>
              <h3 className="text-xl font-black flex-1 text-center pr-8 uppercase">Nhập hàng thủ công</h3>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[48px] border-2 border-slate-50 space-y-6 shadow-sm">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Mã sản phẩm (SKU)</label>
                <input 
                  type="text" 
                  value={manualForm.sku}
                  onChange={(e) => setManualForm({...manualForm, sku: e.target.value.toUpperCase()})}
                  className="w-full p-5 bg-slate-50 dark:bg-slate-700 rounded-[24px] border-none font-bold text-lg focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="VD: SP001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tên sản phẩm</label>
                <input 
                  type="text" 
                  value={manualForm.name}
                  onChange={(e) => setManualForm({...manualForm, name: e.target.value})}
                  className="w-full p-5 bg-slate-50 dark:bg-slate-700 rounded-[24px] border-none font-bold text-lg focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="Nhập tên hàng"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Số lượng</label>
                  <input 
                    type="number" 
                    value={manualForm.quantity}
                    onChange={(e) => setManualForm({...manualForm, quantity: parseInt(e.target.value) || 0})}
                    className="w-full p-5 bg-slate-50 dark:bg-slate-700 rounded-[24px] border-none font-black text-xl text-blue-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Lô hàng (Lot)</label>
                  <input 
                    type="text" 
                    value={manualForm.lot}
                    onChange={(e) => setManualForm({...manualForm, lot: e.target.value})}
                    className="w-full p-5 bg-slate-50 dark:bg-slate-700 rounded-[24px] border-none font-bold"
                    placeholder="VD: LOT23"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Hạn sử dụng</label>
                <input 
                  type="date" 
                  value={manualForm.expiryDate}
                  onChange={(e) => setManualForm({...manualForm, expiryDate: e.target.value})}
                  className="w-full p-5 bg-slate-50 dark:bg-slate-700 rounded-[24px] border-none font-bold"
                />
              </div>
            </div>

            {error && (
                <div className="p-5 bg-red-50 text-red-600 rounded-[32px] font-bold text-sm flex flex-col gap-3 border border-red-100">
                    <div className="flex items-center gap-2"><AlertCircle size={18}/> {error}</div>
                    {needsKeySelection && (
                        <button 
                            onClick={handleKeySelection}
                            className="bg-red-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                        >
                            <Key size={14} /> Cấu hình lại API Key
                        </button>
                    )}
                </div>
            )}

            <button 
              onClick={handleManualSubmit}
              className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-xl shadow-2xl uppercase tracking-tighter active:scale-[0.98] transition-all"
            >
              Xác nhận thực hiện
            </button>
          </div>
        );

      case 'AI_UPLOAD':
        return (
          <div className="space-y-8 animate-in slide-in-from-right duration-300 px-2">
            <div className="text-center">
               <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto flex items-center justify-center text-white shadow-2xl mb-6 animate-pulse">
                  <Sparkles size={48} />
               </div>
               <h3 className="text-3xl font-black tracking-tighter mb-2 uppercase">AI Smart Scan</h3>
               <p className="text-slate-500 font-medium leading-relaxed px-6">Hệ thống AI đang được nâng cấp để đọc hóa đơn chính xác nhất.</p>
            </div>
            
            {needsKeySelection ? (
                <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[48px] text-center space-y-4">
                    <AlertCircle size={48} className="text-red-600 mx-auto" />
                    <h4 className="font-black text-red-600 uppercase">Cần cấu hình API Key</h4>
                    <p className="text-sm text-red-500 font-bold px-4">Lỗi NOT_FOUND xảy ra do API Key chưa được cấp quyền từ Project trả phí của Google Cloud.</p>
                    <button 
                        onClick={handleKeySelection}
                        className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black uppercase tracking-tighter shadow-xl shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Key size={20} /> Chọn API Key Paid Project
                    </button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-[10px] font-black text-slate-400 underline uppercase mt-2">Xem tài liệu Billing</a>
                </div>
            ) : (
                <div className="relative group">
                   <input type="file" accept="image/*,.pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={isAnalyzing} />
                   <div className={`border-4 border-dashed rounded-[48px] py-16 px-8 flex flex-col items-center justify-center gap-6 transition-all ${isAnalyzing ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-800 border-slate-200 hover:border-blue-500'}`}>
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-blue-600" size={64} />
                            <div className="text-xs font-black text-blue-600 animate-pulse uppercase tracking-widest">Đang suy luận (Reasoning)...</div>
                        </div>
                      ) : (
                        <FileUp size={40} className="text-slate-400" />
                      )}
                      <div className="font-black text-2xl tracking-tight uppercase">{isAnalyzing ? 'ĐANG PHÂN TÍCH...' : 'CHỌN ẢNH HÓA ĐƠN'}</div>
                   </div>
                </div>
            )}

            {error && !needsKeySelection && <div className="p-5 bg-red-50 text-red-600 rounded-[32px] font-bold text-center border border-red-100">{error}</div>}
            
            <button onClick={() => setStep('CHOICE')} className="w-full py-4 text-slate-400 font-black uppercase text-sm hover:text-slate-900 transition-colors">Quay lại</button>
          </div>
        );

      case 'AI_REVIEW':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-12 duration-500 px-1 pb-10">
             <div className="text-center mb-6">
                <h3 className="text-2xl font-black uppercase tracking-tight">Xác nhận dữ liệu AI</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Vui lòng đối soát kĩ số lượng trước khi xác nhận</p>
             </div>
             <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                {analyzedItems.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-[36px] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                           <h4 className="font-black text-lg leading-tight uppercase group-hover:text-blue-600 transition-colors">{item.name}</h4>
                           <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">SKU: {item.sku || 'Auto'}</span>
                              {item.lot && <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg">LÔ: {item.lot}</span>}
                              {item.expiryDate && <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-lg">HẠN: {item.expiryDate}</span>}
                           </div>
                        </div>
                        <div className="text-3xl font-black text-blue-600">x{item.quantity}</div>
                     </div>
                  </div>
                ))}
             </div>
             <div className="grid grid-cols-1 gap-3">
                <button onClick={confirmAllAIItems} className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-blue-600/30 uppercase tracking-tighter active:scale-95 transition-all">Xác nhận nhập kho ngay</button>
                <button onClick={() => setStep('CHOICE')} className="w-full py-4 text-slate-400 font-black uppercase text-sm hover:text-red-500 transition-colors">Hủy & Làm lại</button>
             </div>
          </div>
        );

      case 'SCAN_QR':
        return (
          <div className="space-y-6 px-2 relative">
             <div className="flex flex-col items-center text-center gap-2 mb-4">
              <h3 className="text-2xl font-black uppercase">Đang quét mã</h3>
              <p className="text-slate-500 font-medium">Đặt mã vào khung để nhận diện</p>
            </div>
            <div className="aspect-square w-full max-w-sm mx-auto bg-black rounded-[48px] relative overflow-hidden border-8 border-slate-200 dark:border-slate-800 shadow-2xl">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 scanner-focus flex items-center justify-center">
                 <div className="w-64 h-64 border-2 border-white/40 rounded-[40px] relative">
                    <div className="laser" />
                 </div>
              </div>
            </div>
            <button onClick={() => setStep('METHOD')} className="w-full py-5 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-widest active:scale-95 transition-all">HỦY QUÉT</button>
          </div>
        );

      case 'DETAILS':
        return (
          <div className="space-y-8 animate-in slide-in-from-right duration-300 px-2 pb-10">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[48px] border-2 border-slate-100 flex items-center gap-6 shadow-xl relative">
               <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-lg"><Package size={40} /></div>
               <div className="flex-1">
                  <h4 className="font-black text-2xl tracking-tighter leading-tight uppercase">{selectedProduct?.name}</h4>
                  <p className="text-base text-slate-400 font-bold mt-1">Hiện tồn: {selectedProduct?.quantity}</p>
               </div>
            </div>
            <div className="space-y-5">
               <label className="block text-xs font-black uppercase text-slate-400 ml-4">Điều chỉnh số lượng {txType === 'IN' ? 'nhập' : 'xuất'}</label>
               <div className="flex items-center gap-5">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-20 h-20 rounded-[32px] bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-4xl font-black border border-slate-200 dark:border-slate-600 active:scale-90 transition-all">-</button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="flex-1 h-24 rounded-[40px] bg-white dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 text-center text-6xl font-black focus:border-blue-600 focus:ring-0 shadow-inner" />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-20 h-20 rounded-[32px] bg-blue-600 text-white flex items-center justify-center text-4xl font-black shadow-2xl active:scale-90 transition-all">+</button>
               </div>
            </div>
            <button onClick={handleFinalize} className="w-full py-7 bg-blue-600 text-white rounded-[40px] font-black text-3xl shadow-2xl flex items-center justify-center gap-4 uppercase tracking-tighter transition-all active:scale-95">XÁC NHẬN <ArrowRight size={32} /></button>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="flex flex-col items-center justify-center text-center gap-10 py-16 animate-in zoom-in px-2">
            <div className="w-40 h-40 bg-green-500 text-white rounded-[56px] flex items-center justify-center shadow-2xl animate-bounce shadow-green-500/30"><CheckCircle2 size={96} /></div>
            <h2 className="text-5xl font-black tracking-tighter uppercase">Xong rồi!</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest -mt-6">Số liệu kho đã được cập nhật</p>
            <button onClick={onComplete} className="w-full max-w-sm py-6 bg-slate-900 text-white rounded-[32px] font-black text-xl uppercase tracking-tighter shadow-xl hover:bg-slate-800 transition-all">VỀ DANH SÁCH HÀNG</button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col pb-20">
       <div className="flex-1">{renderStep()}</div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: any, label: string, desc: string, color: string, onClick: () => void, special?: boolean }> = ({ icon: Icon, label, desc, color, onClick, special }) => (
  <button onClick={onClick} className={`group flex items-center gap-6 p-7 rounded-[40px] shadow-sm hover:shadow-2xl active:scale-[0.96] transition-all text-left border-2 bg-white dark:bg-slate-800 ${special ? 'border-blue-400/30 ring-4 ring-blue-500/5' : 'border-slate-50 dark:border-slate-700'}`}>
    <div className={`${color} w-20 h-20 rounded-[28px] flex items-center justify-center text-white shadow-xl shrink-0 transition-transform group-hover:scale-110`}><Icon size={36} /></div>
    <div className="flex-1">
      <div className="flex items-center gap-2"><div className="font-black text-2xl tracking-tighter uppercase leading-none">{label}</div>{special && <Sparkles size={16} className="text-blue-500 animate-pulse" />}</div>
      <div className="text-sm opacity-50 font-bold mt-1 uppercase tracking-tight">{desc}</div>
    </div>
    <ChevronRight size={24} className="text-slate-300" />
  </button>
);
