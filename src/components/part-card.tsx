import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { formatAED } from "@/lib/format";
import { useIsStaff } from "@/hooks/use-is-staff";
import { Button } from "@/components/ui/button";

export function PartCard({ part: p }: { part: any }) {
  const isStaff = useIsStaff();
  
  return (
    <div className="flex border rounded-md bg-white overflow-hidden shadow-sm h-full hover:border-primary hover:shadow-md transition-all">
      {/* Left side: Brand */}
      <div className="w-[30%] bg-slate-50/50 flex items-center justify-center p-4 border-r">
        <span className="font-black text-2xl text-center break-words text-slate-800" style={{ wordBreak: 'break-word' }}>
          {p.manufacturer || "GLOBAL"}
        </span>
      </div>
      
      {/* Right side: Details */}
      <div className="w-[70%] p-4 flex flex-col justify-between bg-white">
        <div>
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="font-bold text-[13px] uppercase leading-tight line-clamp-2 text-slate-800">{p.name}</h3>
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase whitespace-nowrap shrink-0">
              Out of stock
            </span>
          </div>
          
          <div className="text-[11px] text-slate-500 font-mono mb-2 uppercase tracking-wide">
            {p.part_number} · {p.manufacturer || "GLOBAL"}
          </div>
          
          {isStaff && (
            <div className="text-[10px] text-slate-400 font-bold mb-1.5 tracking-wider">
              ALL TIERS
            </div>
          )}
          
          {isStaff ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4">
              <div className="flex items-center text-[10px] rounded bg-slate-50/80 overflow-hidden">
                <span className="bg-blue-50/80 text-blue-600 font-bold px-2 py-1 w-12 text-center border-r border-blue-100/50">RATE</span>
                <span className="text-blue-600 font-bold px-2.5">{formatAED(Number(p.price))}</span>
              </div>
              <div className="flex items-center text-[10px] rounded bg-slate-50/80 overflow-hidden">
                <span className="bg-slate-100/80 text-slate-500 font-bold px-2 py-1 w-12 text-center border-r border-slate-200/50">IND</span>
                <span className="font-bold px-2.5 text-slate-700">{formatAED(Number(p.ind_price ?? p.price))}</span>
              </div>
              <div className="flex items-center text-[10px] rounded bg-slate-50/80 overflow-hidden">
                <span className="bg-slate-100/80 text-slate-500 font-bold px-2 py-1 w-12 text-center border-r border-slate-200/50">GAR</span>
                <span className="font-bold px-2.5 text-slate-700">{formatAED(Number(p.gar_price ?? p.price))}</span>
              </div>
              <div className="flex items-center text-[10px] rounded bg-slate-50/80 overflow-hidden">
                <span className="bg-slate-100/80 text-slate-500 font-bold px-2 py-1 w-12 text-center border-r border-slate-200/50">EXP</span>
                <span className="font-bold px-2.5 text-slate-700">{formatAED(Number(p.export_price ?? p.price))}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center text-[10px] rounded bg-slate-50/80 overflow-hidden mb-4 w-fit">
              <span className="bg-blue-50/80 text-blue-600 font-bold px-2 py-1 border-r border-blue-100/50">YOUR PRICE</span>
              <span className="text-blue-600 font-bold px-3">{formatAED(Number(p.price))}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-auto border-t pt-3">
          <Button variant="outline" size="sm" className="flex-1 h-9 text-[12px] text-slate-400 font-semibold bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:text-slate-400 cursor-not-allowed">
            <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Out of stock
          </Button>
          <Button onClick={(e) => e.preventDefault()} variant="outline" size="sm" className="h-9 w-9 p-0 text-emerald-500 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
