import { createFileRoute } from "@tanstack/react-router";
import { models } from "@/lib/db/index.server";
import { generateOrderInvoicePdf } from "@/lib/pdf.server";

export const Route = createFileRoute("/api/public/orders/$id/pdf")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!id || id.length < 16) return new Response("Not found", { status: 404 });

        const order: any = await models.orders.findOne({
          where: { id }
        });
        
        if (!order) return new Response("Order not found", { status: 404 });

        const items: any[] = await models.order_items.findAll({
          where: { order_id: order.id }
        });

        try {
          const pdfBuffer = await generateOrderInvoicePdf(order, items);
          return new Response(pdfBuffer, {
            status: 200,
            headers: { 
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="invoice-${order.order_number}.pdf"`
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
