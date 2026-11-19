import React, { useState } from 'react';
import { 
  ArrowDown, 
  ArrowUpRight, 
  Plus, 
  Bell, 
  ArrowLeft, 
  Calendar, 
  Delete,
  CheckCircle2,
  Wallet, 
  ReceiptText, 
  CreditCard,
  Sliders,
  Search,
  Sparkles,
  Check
} from 'lucide-react';
import { Transaction, CurrencyCode } from '../types';

interface PhoneShowcaseProps {
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'idempotencyKey' | 'syncStatus' | 'createdAt'> & { id?: string }) => void;
  onOpenFullLedger: () => void;
  onOpenAnalytics: () => void;
  currentCurrency?: CurrencyCode;
}

export const PhoneShowcase: React.FC<PhoneShowcaseProps> = ({
  onAddTransaction,
  onOpenFullLedger,
  onOpenAnalytics,
  currentCurrency = 'USD',
}) => {
  // Transfer Keypad & Mascot State
  const [transferAmount, setTransferAmount] = useState<string>('160.00');
  const [selectedContact, setSelectedContact] = useState<string>('Fiona');
  const [transferSent, setTransferSent] = useState<boolean>(false);
  const [activeScreenTab, setActiveScreenTab] = useState<'all' | 'wallet' | 'timeline' | 'mascot'>('all');
  const [selectedMascot, setSelectedMascot] = useState<string>('jack');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>('09');
  const [budgetSliderValue, setBudgetSliderValue] = useState<number>(1500);

  const contacts = [
    { name: 'Aron', color: '#3B82F6', initial: 'A' },
    { name: 'Fiona', color: '#EC4899', initial: 'F' },
    { name: 'Diana', color: '#F59E0B', initial: 'D' },
    { name: 'Ethan', color: '#10B981', initial: 'E' },
    { name: 'Bella', color: '#8B5CF6', initial: 'B' },
  ];

  const mascots = [
    { id: 'maya', name: 'Maya Curl', color: '#F59E0B', accent: '#FEF3C7', hair: 'curls' },
    { id: 'jack', name: 'Jack The Beard', color: '#704BEA', accent: '#EDE9FE', hair: 'beard' },
    { id: 'kai', name: 'Kai Punk', color: '#3B82F6', accent: '#DBEAFE', hair: 'punk' },
  ];

  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      if (transferAmount.length > 0) {
        setTransferAmount((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      }
      return;
    }
    if (val === '.') {
      if (!transferAmount.includes('.')) {
        setTransferAmount((prev) => prev + '.');
      }
      return;
    }
    if (transferAmount === '0' || transferAmount === '160.00') {
      setTransferAmount(val);
    } else {
      setTransferAmount((prev) => prev + val);
    }
  };

  const handleSendMoney = () => {
    const num = parseFloat(transferAmount) || 160;
    onAddTransaction({
      type: 'EXPENSE',
      categoryId: 'cat-exp-9',
      amount: num,
      currency: currentCurrency,
      description: `Payment to ${selectedContact} (Treats showcase)`,
      transactionDate: new Date().toISOString(),
      tags: ['showcase', 'payment'],
      notes: `Sent to ${selectedContact} via the Treats quick-transfer demo`,
    });
    setTransferSent(true);
    setTimeout(() => {
      setTransferSent(false);
      setTransferAmount('160.00');
    }, 2400);
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Interactive Switcher Bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EDE7DE] dark:border-[#262234]">
        <div>
          <div className="text-[11px] font-bold text-[#704BEA] dark:text-[#B8B0FF] tracking-widest uppercase mb-1">
            Treats Design Tribute · Live Trio View
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#181522] dark:text-white tracking-tight">
            Treats Fintech Mobile Showcase
          </h2>
          <p className="text-xs text-[#726B82] dark:text-[#A7A0B8] mt-0.5">
            Warm cream canvas, organic silhouettes, Joy Budget slider, and schedule timeline
          </p>
        </div>

        {/* View selector buttons */}
        <div className="flex items-center gap-1 p-1 bg-[#F4EFE6] dark:bg-[#1A1726] rounded-2xl text-xs font-semibold border border-[#E5DDD0] dark:border-[#2E283F]">
          <button
            onClick={() => setActiveScreenTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all btn-tactile cursor-pointer ${
              activeScreenTab === 'all'
                ? 'bg-white dark:bg-[#2D283E] text-[#181522] dark:text-white shadow-xs font-bold'
                : 'text-[#6D657C] dark:text-[#A7A0B8] hover:text-[#181522]'
            }`}
          >
            All 3 Phones
          </button>
          <button
            onClick={() => setActiveScreenTab('wallet')}
            className={`px-3 py-1.5 rounded-xl transition-all btn-tactile cursor-pointer ${
              activeScreenTab === 'wallet'
                ? 'bg-[#704BEA] text-white shadow-xs font-bold'
                : 'text-[#6D657C] dark:text-[#A7A0B8] hover:text-[#181522]'
            }`}
          >
            1. Joy Budget
          </button>
          <button
            onClick={() => setActiveScreenTab('timeline')}
            className={`px-3 py-1.5 rounded-xl transition-all btn-tactile cursor-pointer ${
              activeScreenTab === 'timeline'
                ? 'bg-[#704BEA] text-white shadow-xs font-bold'
                : 'text-[#6D657C] dark:text-[#A7A0B8] hover:text-[#181522]'
            }`}
          >
            2. Calendar Timeline
          </button>
          <button
            onClick={() => setActiveScreenTab('mascot')}
            className={`px-3 py-1.5 rounded-xl transition-all btn-tactile cursor-pointer ${
              activeScreenTab === 'mascot'
                ? 'bg-[#704BEA] text-white shadow-xs font-bold'
                : 'text-[#6D657C] dark:text-[#A7A0B8] hover:text-[#181522]'
            }`}
          >
            3. Choose Fighter
          </button>
        </div>
      </section>

      {/* Tri-Device Grid Presentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center py-4">
        
        {/* ========================================================================= */}
        {/* PHONE 1: TREATS HOME & JOY BUDGET (LEFT PHONE) */}
        {/* ========================================================================= */}
        {(activeScreenTab === 'all' || activeScreenTab === 'wallet') && (
          <div className="w-[350px] sm:w-[365px] bg-[#EDE7DE] dark:bg-[#201D2B] rounded-[52px] p-3 shadow-2xl border-4 border-[#DDD5C7] dark:border-[#2C273B] flex flex-col relative select-none">
            
            {/* Screen Inner Frame: Warm Cream Canvas (#FBF8F2) */}
            <div className="w-full bg-[#FBF8F2] rounded-[42px] overflow-hidden flex flex-col min-h-[720px] text-[#181522] relative border border-[#E8E1D5] shadow-inner">
              
              {/* Status Bar */}
              <div className="flex items-center justify-between px-7 pt-3.5 text-xs font-bold text-[#181522]">
                <span className="font-mono">5:13</span>
                {/* Dynamic Island Pill */}
                <div className="w-24 h-5 bg-[#181522] rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2A2638] mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span>●●●●</span>
                  <span>76</span>
                </div>
              </div>

              {/* Treats Header: Hello Rob + Action Circles */}
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#666075]">
                  Hello, <strong className="text-[#181522]">Rob</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-full bg-[#EFE9DE] text-[#181522] flex items-center justify-center btn-tactile cursor-pointer" aria-label="Search">
                    <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-[#EFE9DE] text-[#181522] flex items-center justify-center btn-tactile cursor-pointer" aria-label="Notifications">
                    <Bell className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-xs bg-[#181522] flex items-center justify-center text-xs font-bold text-white">
                    🧔‍♂️
                  </div>
                </div>
              </div>

              {/* Treats Headline: Make today yours. */}
              <div className="px-6 pt-1 pb-3">
                <h3 className="text-2xl font-light text-[#181522] tracking-tight">
                  Make today <strong className="font-black text-[#181522]">yours.</strong>
                </h3>
              </div>

              {/* Treats 'SET YOUR RULES' Dial Card */}
              <div className="px-6 py-1">
                <div 
                  onClick={onOpenAnalytics}
                  className="p-3.5 rounded-3xl bg-[#F4EFE6] border border-[#E5DDD0] flex items-center justify-between btn-tactile cursor-pointer hover:bg-[#EFE8DD]"
                >
                  <div className="flex items-center gap-3">
                    {/* Dial ring with number 67 */}
                    <div className="relative w-11 h-11 rounded-2xl bg-white border-2 border-[#6B8A6E]/50 flex items-center justify-center font-mono font-black text-sm text-[#181522] shadow-xs">
                      <span>67</span>
                      <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#6B8A6E] -translate-y-0.5 translate-x-0.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#181522]">
                        SET YOUR RULES
                      </div>
                      <div className="text-[10px] text-[#726B82]">
                        Turn the dial to make changes.
                      </div>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#726B82] shadow-2xs">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Treats Signature Royal Purple 'JOY BUDGET' Card */}
              <div className="px-6 py-2">
                <div className="bg-gradient-to-br from-[#704BEA] via-[#7B56EE] to-[#8A66F5] text-white rounded-[32px] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between border border-[#9A7DFF]/40">
                  
                  {/* Header: Title & Circular White Button with ↗ */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-widest uppercase text-white/90">
                      JOY BUDGET
                    </span>
                    <button 
                      onClick={onOpenFullLedger}
                      className="w-9 h-9 rounded-full bg-white text-[#181522] shadow-md flex items-center justify-center btn-tactile cursor-pointer hover:bg-white/95"
                      title="View Ledger"
                    >
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Slider with Floating Pill Indicator */}
                  <div className="my-5 relative">
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-white via-[#FFC430] to-white rounded-full transition-all duration-300"
                        style={{ width: `${((budgetSliderValue - 500) / (3000 - 500)) * 100}%` }}
                      />
                    </div>
                    
                    {/* Floating Dark Pill Bubble directly on top of track */}
                    <div 
                      className="absolute -top-3.5 -translate-x-1/2 bg-[#100E17] text-white font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap"
                      style={{ left: `${Math.min(85, Math.max(15, ((budgetSliderValue - 500) / (3000 - 500)) * 100))}%` }}
                    >
                      ${budgetSliderValue.toLocaleString()}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-white/80 mt-2">
                      <span>$500</span>
                      <span>$3,000</span>
                    </div>
                  </div>

                  {/* Range Slider for Interactive Demo */}
                  <input
                    type="range"
                    min="500"
                    max="3000"
                    step="50"
                    value={budgetSliderValue}
                    onChange={(e) => setBudgetSliderValue(Number(e.target.value))}
                    className="w-full opacity-0 absolute inset-0 cursor-pointer"
                    aria-label="Adjust Joy Budget"
                  />
                </div>
              </div>

              {/* Treats 'TREAT CHECK' Saffron Sunset Banner */}
              <div className="px-6 py-2">
                <div className="bg-gradient-to-r from-[#FF941A] via-[#FFAF1A] to-[#FFC430] text-[#100E17] rounded-[28px] p-4 shadow-md flex flex-col justify-between border border-[#FF941A]/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-[#100E17]">
                      TREAT CHECK
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={onOpenFullLedger}
                        className="w-7 h-7 rounded-full bg-white text-[#100E17] flex items-center justify-center btn-tactile cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <button 
                        onClick={onOpenFullLedger}
                        className="w-7 h-7 rounded-full bg-white text-[#100E17] flex items-center justify-center btn-tactile cursor-pointer shadow-2xs"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Pill button: Find me a perfect treat */}
                  <button 
                    onClick={onOpenFullLedger}
                    className="w-full py-2.5 px-3 bg-[#FBF8F2] text-[#181522] rounded-2xl flex items-center justify-between text-xs font-bold btn-tactile shadow-xs"
                  >
                    <span>Find me a perfect treat</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#FF941A]" />
                  </button>
                </div>
              </div>

              {/* Floating Dark Capsule Dock at Bottom */}
              <div className="mt-auto pb-4 pt-2">
                <div className="w-48 h-12 bg-[#100E17] rounded-full mx-auto p-1.5 flex items-center justify-between shadow-xl border border-white/10">
                  {/* Home Active Pill */}
                  <div className="w-12 h-9 rounded-full bg-white text-[#100E17] flex items-center justify-center shadow-sm">
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="w-12 h-9 rounded-full text-white/60 flex items-center justify-center">
                    <ReceiptText className="w-4 h-4" />
                  </div>
                  <div className="w-12 h-9 rounded-full text-white/60 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>

                {/* Home Indicator Bar */}
                <div className="w-32 h-1 bg-[#181522]/30 rounded-full mx-auto mt-3" />
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHONE 2: TREATS SCHEDULE & TIMELINE (MIDDLE PHONE) */}
        {/* ========================================================================= */}
        {(activeScreenTab === 'all' || activeScreenTab === 'timeline') && (
          <div className="w-[350px] sm:w-[365px] bg-[#EDE7DE] dark:bg-[#201D2B] rounded-[52px] p-3 shadow-2xl border-4 border-[#DDD5C7] dark:border-[#2C273B] flex flex-col relative select-none">
            
            {/* Screen Inner Frame: Royal Purple Top flowing into Warm Cream (#FBF8F2) */}
            <div className="w-full bg-[#704BEA] rounded-[42px] overflow-hidden flex flex-col min-h-[720px] text-white relative border border-[#603CD4] shadow-inner">
              
              {/* Status Bar */}
              <div className="flex items-center justify-between px-7 pt-3.5 text-xs font-bold text-white">
                <span className="font-mono">5:13</span>
                {/* Dynamic Island */}
                <div className="w-24 h-5 bg-[#100E17] rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2A2638] mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span>●●●●</span>
                  <span>76</span>
                </div>
              </div>

              {/* Top Navigation: Back + Pill Dropdown + Sliders */}
              <div className="px-6 pt-3 pb-2 flex items-center justify-between">
                <button 
                  onClick={() => setActiveScreenTab('wallet')}
                  className="p-1 text-white/80 hover:text-white"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* My Calendars Pill Dropdown */}
                <div className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center gap-2 text-xs font-bold shadow-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>My Calendars</span>
                  <span className="text-[10px] opacity-70">▾</span>
                </div>

                <button className="p-1 text-white/80 hover:text-white" aria-label="Settings">
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              {/* Month Title */}
              <div className="text-center pt-2 pb-3">
                <div className="text-sm font-black tracking-widest uppercase text-white/95 font-mono">
                  SEPTEMBER 2026
                </div>
              </div>

              {/* Date Selector Row */}
              <div className="px-6 pb-4 flex items-center justify-between gap-1.5">
                {[
                  { day: 'Mon', num: '08' },
                  { day: 'Tue', num: '09', active: true },
                  { day: 'Wed', num: '10' },
                  { day: 'Thu', num: '11' },
                ].map((item) => {
                  const isSelected = selectedCalendarDay === item.num;
                  return (
                    <button
                      key={item.num}
                      onClick={() => setSelectedCalendarDay(item.num)}
                      className={`flex-1 py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all btn-tactile cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#181522] shadow-md scale-105'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">{item.day}</span>
                      <span className="text-sm font-mono font-black">{item.num}</span>
                      {isSelected && (
                        <div className="w-4 h-1 rounded-full bg-[#704BEA] mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lower Section: Warm Cream Canvas with Vertical Schedule Timeline */}
              <div className="flex-1 bg-[#FBF8F2] text-[#181522] rounded-t-[36px] p-6 flex flex-col justify-between shadow-2xl relative">
                
                {/* Sage Green Pill Banner: Have fun with Friends */}
                <div className="py-2 px-3.5 rounded-full bg-[#6B8A6E] text-white flex items-center justify-between shadow-sm -mt-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-400 border border-white text-[10px] flex items-center justify-center">👨</div>
                      <div className="w-5 h-5 rounded-full bg-blue-400 border border-white text-[10px] flex items-center justify-center">👱</div>
                    </div>
                    <span className="text-xs font-bold">Have fun with Friends</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>

                {/* Vertical Schedule Timeline Items */}
                <div className="space-y-4">
                  {/* 10 AM */}
                  <div className="flex items-start gap-3">
                    <span className="w-12 text-[11px] font-mono font-bold text-[#878096] pt-0.5">10 AM</span>
                    <div className="w-1 h-12 rounded-full bg-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[#181522]">Shopping & coffee</div>
                      <div className="text-[10px] text-[#726B82]">Find a new favorite outfit</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#878096] mt-0.5">
                        <span>👥 with Josh and Rom</span>
                        <span className="font-mono font-bold text-rose-500">-$42.50</span>
                      </div>
                    </div>
                  </div>

                  {/* 1 PM */}
                  <div className="flex items-start gap-3">
                    <span className="w-12 text-[11px] font-mono font-bold text-[#878096] pt-0.5">1 PM</span>
                    <div className="w-1 h-12 rounded-full bg-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[#181522]">Little joys for home</div>
                      <div className="text-[10px] text-[#726B82]">Pick out candles and cozy details</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#878096] mt-0.5">
                        <span>👥 with Dave and Megan</span>
                        <span className="font-mono font-bold text-rose-500">-$65.00</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 PM */}
                  <div className="flex items-start gap-3">
                    <span className="w-12 text-[11px] font-mono font-bold text-[#878096] pt-0.5">4 PM</span>
                    <div className="w-1 h-10 rounded-full bg-[#704BEA] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[#181522]">Friday flower shopping</div>
                      <div className="text-[10px] text-[#726B82]">Choose a bouquet for the weekend</div>
                    </div>
                  </div>
                </div>

                {/* Floating Capsule Dock at Bottom */}
                <div className="mt-auto pt-4">
                  <div className="w-48 h-12 bg-[#100E17] rounded-full mx-auto p-1.5 flex items-center justify-between shadow-xl border border-white/10">
                    <div className="w-12 h-9 rounded-full text-white/60 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    {/* Active Calendar Pill */}
                    <div className="w-12 h-9 rounded-full bg-white text-[#100E17] flex items-center justify-center shadow-sm">
                      <ReceiptText className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="w-12 h-9 rounded-full text-white/60 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="w-32 h-1 bg-[#181522]/30 rounded-full mx-auto mt-3" />
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHONE 3: TREATS MASCOT / CHOOSE YOUR FIGHTER & KEYPAD (RIGHT PHONE) */}
        {/* ========================================================================= */}
        {(activeScreenTab === 'all' || activeScreenTab === 'mascot') && (
          <div className="w-[350px] sm:w-[365px] bg-[#EDE7DE] dark:bg-[#201D2B] rounded-[52px] p-3 shadow-2xl border-4 border-[#DDD5C7] dark:border-[#2C273B] flex flex-col relative select-none">
            
            {/* Screen Inner Frame: Warm Cream Canvas (#FBF8F2) */}
            <div className="w-full bg-[#FBF8F2] rounded-[42px] overflow-hidden flex flex-col min-h-[720px] text-[#181522] relative border border-[#E8E1D5] shadow-inner">
              
              {/* Status Bar */}
              <div className="flex items-center justify-between px-7 pt-3.5 text-xs font-bold text-[#181522]">
                <span className="font-mono">5:13</span>
                {/* Dynamic Island */}
                <div className="w-24 h-5 bg-[#181522] rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2A2638] mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span>●●●●</span>
                  <span>76</span>
                </div>
              </div>

              {/* Blue Checkmark Circle Top Badge */}
              <div className="pt-2 pb-1 flex justify-center">
                <div className="w-7 h-7 rounded-full bg-cyan-400 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* Mascot / Fighter Carousel Row */}
              <div className="px-6 py-2 flex items-center justify-center gap-4">
                {mascots.map((m) => {
                  const isSelected = selectedMascot === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMascot(m.id)}
                      className={`flex flex-col items-center gap-1.5 transition-all btn-tactile cursor-pointer ${
                        isSelected ? 'scale-110 z-10' : 'opacity-60 hover:opacity-90 scale-90'
                      }`}
                    >
                      <div 
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-sm border-2 ${
                          isSelected ? 'border-[#704BEA] ring-4 ring-[#704BEA]/20' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: m.accent }}
                      >
                        {m.id === 'maya' && '👩🏽‍🦱'}
                        {m.id === 'jack' && '🧔‍♂️'}
                        {m.id === 'kai' && '🧑🏻‍🎤'}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#181522] font-mono">
                        {m.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Editorial Title: CHOOSE YOUR DESTINY / CHOOSE YOUR FIGHTER */}
              <div className="px-6 pt-3 pb-2 text-center">
                <div className="text-xs font-bold tracking-widest uppercase text-[#878096] font-mono">
                  CHOOSE YOUR DESTINY
                </div>
                <div className="text-base font-black tracking-tight uppercase text-[#181522]">
                  CHOOSE YOUR FIGHTER
                </div>
                <p className="text-[11px] text-[#726B82] mt-1 px-4 leading-relaxed">
                  Choose mascot. It will guide you through budget envelopes and celebrate your savings goals.
                </p>
              </div>

              {/* Interactive Keypad Section for Transferring Money */}
              <div className="px-6 py-2 flex-1 flex flex-col justify-between">
                
                {/* Transfer Recipient Row & Amount Input */}
                <div className="p-3 rounded-2xl bg-white border border-[#E5DDD0] shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#726B82]">Quick Transfer</span>
                    <span className="font-mono font-bold text-base text-[#704BEA]">${transferAmount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    {contacts.map((c) => {
                      const isSelected = selectedContact === c.name;
                      return (
                        <button
                          key={c.name}
                          onClick={() => setSelectedContact(c.name)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform ${
                            isSelected ? 'ring-2 ring-[#704BEA] scale-110' : 'opacity-70'
                          }`}
                          style={{ backgroundColor: c.color }}
                        >
                          {c.initial}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tactile Keypad */}
                <div className="grid grid-cols-3 gap-1.5 my-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key)}
                      className="h-10 bg-white text-[#181522] text-sm font-mono font-bold rounded-xl flex items-center justify-center shadow-2xs btn-tactile cursor-pointer hover:bg-[#F4EFE6]"
                    >
                      {key === 'backspace' ? <Delete className="w-4 h-4 text-[#726B82]" /> : key}
                    </button>
                  ))}
                </div>

                {/* Treats Signature Soft Purple Pill CTA Button: "Set it up" */}
                <button
                  onClick={handleSendMoney}
                  disabled={transferSent}
                  className="w-full py-3 bg-[#704BEA] hover:bg-[#5E38DB] text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 btn-tactile cursor-pointer"
                >
                  {transferSent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Transferred to {selectedContact}!</span>
                    </>
                  ) : (
                    <>
                      <span>Set it up</span>
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* Home Indicator Bar */}
                <div className="w-32 h-1 bg-[#181522]/30 rounded-full mx-auto mt-3" />
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
