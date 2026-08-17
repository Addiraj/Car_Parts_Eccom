import { createFileRoute } from "@tanstack/react-router";
import { models } from "@/lib/db/index.server";
import { generateQuotationPdf } from "@/lib/pdf.server";

export const Route = createFileRoute("/api/public/quotations/$token/pdf")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;
        if (!token || token.length < 16) return new Response("Not found", { status: 404 });

        const quote: any = await models.quotations.findOne({
          where: { share_token: token }
        });
        
        if (!quote) return new Response("Quotation not found", { status: 404 });

        const items: any[] = await models.quotation_items.findAll({
          where: { quotation_id: quote.id },
          order: [["created_at", "ASC"]]
        });

        try {
          const pdfBuffer = await generateQuotationPdf(quote, items);
          return new Response(pdfBuffer, {
            status: 200,
            headers: { 
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="quotation-${quote.quotation_number}.pdf"`
            },
          });
        } catch (error) {
          console.error("PDF Generation Error:", error);
          return new Response("Error generating PDF", { status: 500 });
        }
      },
    },
  },
});
