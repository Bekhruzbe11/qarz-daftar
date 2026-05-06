/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Search, 
  History, 
  ChevronRight,
  TrendingUp,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Debt, DebtType, Transaction, DebtStatus } from './types.ts';
import { formatCurrency, formatDate, generateId, cn, parseAmount } from './lib/utils.ts';

type View = 'dashboard' | 'add' | 'detail' | 'trash';

export default function App() {
  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('qarz_daftari_debts');
    return saved ? JSON.parse(saved) : [];
  });

  const [archive, setArchive] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('qarz_daftari_archive');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [myMoney, setMyMoney] = useState<number>(() => {
    const saved = localStorage.getItem('qarz_daftari_my_money');
    return saved ? Number(saved) : 0;
  });
  
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const [view, setView] = useState<View>('dashboard');
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DebtType | 'all'>('all');

  // Persistence
  useEffect(() => {
    localStorage.setItem('qarz_daftari_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('qarz_daftari_archive', JSON.stringify(archive));
  }, [archive]);

  useEffect(() => {
    localStorage.setItem('qarz_daftari_my_money', myMoney.toString());
  }, [myMoney]);

  // Derived state
  const stats = useMemo(() => {
    const totalGiven = debts
      .filter(d => d.type === 'given')
      .reduce((acc, d) => {
        const paid = d.transactions.reduce((sum, t) => sum + (t.type === 'payment' ? t.amount : 0), 0);
        return acc + (d.amount - paid);
      }, 0);

    const totalTaken = debts
      .filter(d => d.type === 'taken')
      .reduce((acc, d) => {
        const paid = d.transactions.reduce((sum, t) => sum + (t.type === 'payment' ? t.amount : 0), 0);
        return acc + (d.amount - paid);
      }, 0);

    return { totalGiven, totalTaken, balance: (myMoney + totalGiven) - totalTaken };
  }, [debts, myMoney]);

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const matchesSearch = d.personName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || d.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [debts, searchQuery, filterType]);

  const selectedDebt = debts.find(d => d.id === selectedDebtId);

  // Actions
  const addDebt = (formData: Omit<Debt, 'id' | 'transactions' | 'status'>) => {
    const newDebt: Debt = {
      ...formData,
      id: generateId(),
      transactions: [],
      status: 'pending'
    };
    setDebts([newDebt, ...debts]);

    // Balansni yangilash: pul berilsa kamayadi, olinsa ko'payadi
    if (formData.type === 'given') {
      setMyMoney(prev => prev - formData.amount);
    } else {
      setMyMoney(prev => prev + formData.amount);
    }

    setView('dashboard');
  };

  const archiveDebt = (debt: Debt, reason: 'paid' | 'deleted') => {
    const archivedDebt: Debt = {
      ...debt,
      archivedAt: new Date().toISOString(),
      archiveReason: reason
    };
    setArchive([archivedDebt, ...archive]);
    setDebts(prev => prev.filter(d => d.id !== debt.id));
  };

  const deleteFromArchive = (id: string) => {
    setArchive(prev => prev.filter(d => d.id !== id));
  };

  const restoreFromArchive = (debt: Debt) => {
    const { archivedAt, archiveReason, ...originalDebt } = debt;
    setDebts([originalDebt as Debt, ...debts]);
    setArchive(prev => prev.filter(d => d.id !== debt.id));
  };

  const addPayment = (debtId: string, amount: number) => {
    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      
      const newTransaction: Transaction = {
        id: generateId(),
        amount,
        date: new Date().toISOString(),
        type: 'payment'
      };
      
      const updatedTransactions = [...d.transactions, newTransaction];
      const totalPaid = updatedTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      let newStatus: DebtStatus = 'partially_paid';
      if (totalPaid >= d.amount) newStatus = 'paid';
      
      return { ...d, transactions: updatedTransactions, status: newStatus };
    }));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setView('dashboard')}>
            <div className="bg-indigo-600 p-2 rounded-xl shadow-sm shadow-indigo-100">
              <Wallet className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">Qarz daftari <span className="text-gray-400 font-medium text-xs md:text-sm block sm:inline">(Farrux Shoristamov)</span></h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {view === 'dashboard' && (
              <button 
                onClick={() => setView('trash')}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-xl transition-all relative"
                title="Savat (Arxiv)"
              >
                <Trash2 size={24} />
                {archive.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            )}

            {view === 'dashboard' && (
              <button 
                onClick={() => setView('add')}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Yangi qarz</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:px-8 pb-32">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {installPrompt && (
                  <div className="sm:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-indigo-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-xl">
                        <Download size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Ilovani o'rnatish</p>
                        <p className="text-[10px] text-indigo-100">Tezkor kirish uchun asosiy ekranga qo'shing</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleInstall}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors active:scale-95"
                    >
                      O'rnatish
                    </button>
                  </div>
                )}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 mb-1">Berilgan (Haqqim)</p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalGiven)}</h3>
                    <div className="bg-green-50 p-2 rounded-full">
                      <ArrowUpRight className="text-green-600 w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 mb-1">Olganman (Qarzim)</p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-rose-600">{formatCurrency(stats.totalTaken)}</h3>
                    <div className="bg-rose-50 p-2 rounded-full">
                      <ArrowDownLeft className="text-rose-600 w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => {
                    setBalanceInput(myMoney.toString());
                    setIsBalanceModalOpen(true);
                  }}
                  className="bg-indigo-600 p-6 rounded-3xl shadow-lg md:col-span-1 cursor-pointer hover:bg-indigo-700 transition-colors active:scale-95 group"
                >
                  <p className="text-sm font-medium text-indigo-100 mb-1">Balansim</p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">{formatCurrency(myMoney)}</h3>
                    <TrendingUp className="text-indigo-200 w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Balance Update Modal */}
              <AnimatePresence>
                {isBalanceModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl"
                    >
                      <h3 className="text-xl font-bold mb-4">Balansni tahrirlash</h3>
                      <p className="text-sm text-gray-500 mb-6 font-medium">Hozirda yoningizda qancha naqd pul borligini kiriting:</p>
                      
                      <input 
                        type="text"
                        autoFocus
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        placeholder="Masalan: 1 mln"
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 text-lg font-bold"
                      />

                      <div className="flex gap-3">
                        <button 
                          onClick={() => setIsBalanceModalOpen(false)}
                          className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                        >
                          Yo'q
                        </button>
                        <button 
                          onClick={() => {
                            const amount = parseAmount(balanceInput);
                            setMyMoney(amount);
                            setIsBalanceModalOpen(false);
                          }}
                          className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-colors"
                        >
                          Saqlash
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text"
                      placeholder="Ism yoki izoh bilan qidirish..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex p-1 bg-gray-200 rounded-full w-fit">
                      {(['all', 'given', 'taken'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                            filterType === type 
                              ? "bg-white text-indigo-600 shadow-sm" 
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          {type === 'all' ? 'Hammasi' : type === 'given' ? 'Berilgan' : 'Olingan'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                  {filteredDebts.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {filteredDebts.map((debt) => (
                        <div 
                          key={debt.id} 
                          onClick={() => {
                            setSelectedDebtId(debt.id);
                            setView('detail');
                          }}
                          className="p-4 md:p-5 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between group active:bg-gray-100"
                        >
                          <div className="flex items-center gap-3 md:gap-4 grow min-w-0">
                            <div className={cn(
                              "w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-base md:text-lg",
                              debt.type === 'given' ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {debt.personName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-gray-900 truncate">{debt.personName}</h4>
                              <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 mt-0.5">
                                <span className={cn(
                                  "px-1.5 md:px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[8px] md:text-[9px]",
                                  debt.type === 'given' ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                                )}>
                                  {debt.type === 'given' ? 'Haq' : 'Qarz'}
                                </span>
                                <span className="hidden xs:inline">•</span>
                                <span className="hidden xs:inline">{formatDate(debt.date)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 md:gap-4 text-right shrink-0">
                            <div>
                              <p className={cn(
                                "font-bold text-base md:text-lg whitespace-nowrap",
                                debt.status === 'paid' ? "text-gray-400 line-through" : "text-gray-900"
                              )}>
                                {formatCurrency(debt.amount)}
                              </p>
                              {debt.status === 'partially_paid' && (
                                <p className="text-[9px] md:text-[10px] text-orange-500 font-bold uppercase tracking-tight text-right">Qisman</p>
                              )}
                              {debt.status === 'paid' && (
                                <p className="text-[9px] md:text-[10px] text-green-500 font-bold uppercase tracking-tight text-right">Yopilgan</p>
                              )}
                            </div>
                            <ChevronRight className="text-gray-300 group-hover:text-indigo-400 transition-colors hidden xs:block" size={20} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                        <History className="text-gray-300 w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Hozircha hech narsa topilmadi</p>
                        <p className="text-sm text-gray-400">Yangi qarz qoʻshish uchun yuqoridagi tugmani bosing</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Yangi qarz</h2>
                  <button onClick={() => setView('dashboard')} className="text-gray-400 hover:text-gray-600 transition-colors">
                    Bekor qilish
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  const amountRaw = data.get('amount') as string;
                  const amount = parseAmount(amountRaw);
                  
                  addDebt({
                    personName: data.get('personName') as string,
                    amount: amount,
                    type: data.get('type') as DebtType,
                    date: data.get('date') as string,
                    description: data.get('description') as string,
                    dueDate: data.get('dueDate') as string || undefined,
                  });
                }} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 px-1">Ism sharifi</label>
                    <input 
                      name="personName"
                      required
                      placeholder="Kimga yoki kimdan?"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 px-1">Miqdori (Soʻm)</label>
                      <input 
                        name="amount"
                        type="text"
                        required
                        placeholder="0"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 px-1">Turi</label>
                      <select 
                        name="type"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                      >
                        <option value="given">Berganman</option>
                        <option value="taken">Olganman</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 px-1">Sana</label>
                      <input 
                        name="date"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 px-1">Muddat (ixtiyoriy)</label>
                      <input 
                        name="dueDate"
                        type="date"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 px-1">Izoh</label>
                    <textarea 
                      name="description"
                      rows={3}
                      placeholder="Qoʻshimcha ma'lumotlar..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-[0.98]"
                  >
                    Saqlash
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedDebt && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-md relative overflow-hidden">
                <div className={cn(
                  "absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-bold text-sm tracking-widest uppercase",
                  selectedDebt.type === 'given' ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                )}>
                  {selectedDebt.type === 'given' ? 'Haq' : 'Qarz'}
                </div>
                
                <button 
                  onClick={() => setView('dashboard')}
                  className="mb-6 text-sm text-gray-500 font-medium hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className="rotate-180" size={16} />
                  Ortga
                </button>

                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 mb-1">{selectedDebt.personName}</h2>
                    <p className="text-gray-500">{formatDate(selectedDebt.date)}dan</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-3xl font-black text-gray-900">{formatCurrency(selectedDebt.amount)}</h3>
                    {selectedDebt.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold uppercase text-[10px] mt-1">
                        <CheckCircle2 size={12} /> Yopilgan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-orange-500 font-bold uppercase text-[10px] mt-1">
                        <Clock size={12} /> Amalda
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Izoh</p>
                    <p className="text-gray-700">{selectedDebt.description || 'Kiritilmagan'}</p>
                  </div>
                  {selectedDebt.dueDate && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Muddati</p>
                      <p className={cn(
                        "font-medium",
                        new Date(selectedDebt.dueDate) < new Date() && selectedDebt.status !== 'paid'
                          ? "text-rose-600" 
                          : "text-gray-700"
                      )}>
                        {formatDate(selectedDebt.dueDate)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => {
                      // Hamyonni yangilash
                      if (selectedDebt.type === 'given') {
                        // Kimdir menga qaytardi -> naqd ko'paydi
                        setMyMoney(prev => prev + selectedDebt.amount);
                      } else {
                        // Men kimdirga qaytardim -> naqd kamaydi
                        setMyMoney(prev => prev - selectedDebt.amount);
                      }

                      archiveDebt(selectedDebt, 'paid');
                      setSelectedDebtId(null);
                      setView('dashboard');
                    }}
                    className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-colors shadow-md shadow-green-100 active:scale-95"
                  >
                    {selectedDebt.type === 'given' ? "To'landi" : "To'ladim"}
                  </button>
                  <button 
                    onClick={() => {
                      // Hamyonni yangilash
                      if (selectedDebt.type === 'given') {
                        setMyMoney(prev => prev + selectedDebt.amount);
                      } else {
                        setMyMoney(prev => prev - selectedDebt.amount);
                      }

                      archiveDebt(selectedDebt, 'deleted');
                      setSelectedDebtId(null);
                      setView('dashboard');
                    }}
                    className="px-6 bg-gray-50 text-gray-400 py-3 rounded-2xl font-bold hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 active:scale-95"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-md">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <History className="text-indigo-600" size={20} />
                  Tarix
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Plus size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Boshlangʻich qarz</p>
                        <p className="text-[10px] text-gray-400 uppercase">{formatDate(selectedDebt.date)}</p>
                      </div>
                    </div>
                    <p className="font-bold">{formatCurrency(selectedDebt.amount)}</p>
                  </div>

                  {selectedDebt.transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                          <CheckCircle2 size={14} className="text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Toʻlov</p>
                          <p className="text-[10px] text-gray-400 uppercase">{formatDate(t.date)}</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-600">-{formatCurrency(t.amount)}</p>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-4">
                    <p className="font-bold text-gray-900 uppercase text-xs tracking-widest">Qolgan</p>
                    <p className={cn(
                      "text-xl font-black",
                      selectedDebt.status === 'paid' ? "text-green-600" : "text-indigo-600"
                    )}>
                      {formatCurrency(
                        selectedDebt.amount - selectedDebt.transactions.reduce((s, t) => s + t.amount, 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'trash' && (
            <motion.div
              key="trash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('dashboard')}
                  className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  <ChevronRight className="rotate-180" size={16} />
                  Dashboardga qaytish
                </button>
                <h2 className="text-xl font-black text-gray-900">Savat (Arxiv)</h2>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {archive.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {archive.map((debt) => (
                      <div key={debt.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm opacity-60",
                            debt.type === 'given' ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {debt.personName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{debt.personName}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider text-[8px]",
                                debt.archiveReason === 'paid' ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                              )}>
                                {debt.archiveReason === 'paid' ? 'Toʻlangan' : 'Oʻchirilgan'}
                              </span>
                              <span>•</span>
                              <span>{formatCurrency(debt.amount)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => restoreFromArchive(debt)}
                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Tiklash"
                          >
                            <History size={18} />
                          </button>
                          <button 
                            onClick={() => deleteFromArchive(debt.id)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Butunlay oʻchirish"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                      <Trash2 size={32} />
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Savat bo'sh</p>
                      <p className="text-xs text-gray-400">Yopilgan yoki o'chirilgan qarzlar shu yerda ko'rinadi</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {view === 'dashboard' && (
        <div className="fixed bottom-6 right-6 md:hidden">
          <button 
            onClick={() => setView('add')}
            className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-200 active:scale-90 transition-transform"
          >
            <Plus size={32} />
          </button>
        </div>
      )}
    </div>
  );
}
