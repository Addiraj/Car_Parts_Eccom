import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Heart, ChevronRight } from "lucide-react";
import { formatAED } from "@/lib/format";
import { useIsStaff } from "@/hooks/use-is-staff";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PartCardProps = { 
  part: any;
  isWishlisted?: boolean;
  onToggleWishlist?: (partId?: string) => void;
  hideWishlistButton?: boolean;
  supersededParts?: any[];
  onAddToCart?: (partId?: string) => void;
  href?: string;
};

export function PartCard({ part: p, isWishlisted, onToggleWishlist, hideWishlistButton, supersededParts, onAddToCart, href }: PartCardProps) {
  const isStaff = useIsStaff();
  const [popupOpen, setPopupOpen] = useState(false);
  
  const stock = Number(p.stock ?? 0);
  const inStock = stock > 0;
  
  const visibleSuperseded = supersededParts?.filter(sp => isStaff || Number(sp.alternative_part?.stock ?? 0) > 0) || [];
  
  return (
    <div 
      className={`flex flex-col border rounded-md bg-white overflow-hidden shadow-sm h-full hover:border-primary hover:shadow-md transition-all relative ${href ? 'cursor-pointer' : ''}`}
      onClick={() => { if (href) router.navigate({ to: href as any }) }}
    >
      <div className="flex flex-1">
        {/* Left side: Brand */}
        <div className="w-[30%] bg-slate-50/50 flex items-center justify-center p-4 border-r">
          <span className="font-black text-2xl text-center break-words text-slate-800" style={{ wordBreak: 'break-word' }}>
            {p.manufacturer || "GLOBAL"}
          </span>
        </div>
        
        {/* Right side: Details */}
        <div className="w-[70%] p-4 flex flex-col justify-between bg-white relative">
          {!hideWishlistButton && (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWishlist?.(p.id); }}
              className="absolute top-3 right-3 text-slate-400 hover:text-primary transition-colors z-10"
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-primary text-primary' : ''}`} />
            </button>
          )}

          <div>
            <div className="flex justify-between items-start mb-1 gap-2 pr-6">
              <h3 className="font-bold text-[13px] uppercase leading-tight line-clamp-2 text-slate-800">{p.name}</h3>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[11px] text-slate-500 font-mono uppercase tracking-wide">
                Ref OE No: {p.part_number} · {p.manufacturer || "GLOBAL"}
              </div>
              {inStock ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase whitespace-nowrap shrink-0">
                  {stock} IN STOCK
                </span>
              ) : isStaff ? (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase whitespace-nowrap shrink-0">
                  OUT OF STOCK
                </span>
              ) : null}
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
            
            {p.category_tag && (
              <div className="text-[10px] bg-blue-50/50 border border-blue-100 rounded p-1.5 mb-3 text-blue-700 font-semibold overflow-hidden text-ellipsis whitespace-nowrap" title={`SUPERSEDED / ALTERNATE : ${p.category_tag} (BVVIMP)`}>
                SUPERSEDED / ALTERNATE : {p.category_tag} (BVVIMP)
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-auto border-t pt-3">
            {inStock ? (
              <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart?.(p.id); }} variant="default" size="sm" className="flex-1 h-9 text-[12px] font-semibold">
                <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Add to cart
              </Button>
            ) : (
              <Button onClick={(e) => { e.preventDefault(); }} variant="outline" size="sm" className="flex-1 h-9 text-[12px] text-slate-400 font-semibold bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:text-slate-400 cursor-not-allowed">
                <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Out of stock
              </Button>
            )}
            
            <Button onClick={(e) => e.preventDefault()} variant="outline" size="sm" className="h-9 w-9 p-0 text-emerald-500 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            </Button>
          </div>
        </div>
      </div>
      
      {visibleSuperseded.length > 0 && (
        <div className="border-t p-2 bg-slate-50">
          <Button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPopupOpen(true); }}
            variant="ghost" 
            className="w-full h-8 text-[11px] text-primary font-semibold hover:bg-primary/10 flex justify-between px-3"
          >
            <span>{visibleSuperseded.length} Superseded / Alternate Numbers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Superseded / Alternate Numbers for Ref OE No: {p.part_number}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {visibleSuperseded.map((sp: any) => (
              sp.alternative_part && (
                <div key={sp.id} className="h-full">
                  <PartCard 
                    part={sp.alternative_part} 
                    hideWishlistButton={true} 
                  />
                </div>
              )
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
