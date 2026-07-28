import { MessageCircle } from "lucide-react";

export const WHATSAPP_NUMBER = "+971 547516365";
export const WHATSAPP_NUMBER_RAW = "971547516365";

export function getWhatsAppUrl(text?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER_RAW}`;
  if (text) return `${base}?text=${encodeURIComponent(text)}`;
  return base;
}

export function WhatsAppFloat() {
  return (
    <a
      href={getWhatsAppUrl("Hi, I have an enquiry about a part.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40"
    >
      <MessageCircle className="h-7 w-7 fill-white" />
    </a>
  );
}
