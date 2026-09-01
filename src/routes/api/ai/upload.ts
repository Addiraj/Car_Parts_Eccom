import { createFileRoute } from "@tanstack/react-router";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";

export const Route = createFileRoute("/api/ai/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        let userId: string | undefined;
        try {
          const secret = process.env.JWT_SECRET;
          if (secret) {
            const decoded = jwt.verify(token, secret) as any;
            userId = decoded?.sub || decoded?.id;
          }
        } catch (e) {
          // Ignore
        }

        if (!userId) return new Response("Unauthorized", { status: 401 });

        const form = await request.formData();
        const file = form.get("file");
        if (!file || !(file instanceof Blob)) return new Response("file required", { status: 400 });
        if (file.size > 25 * 1024 * 1024) return new Response("File too large", { status: 413 });

        const ext = (file.type.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
        const shortUser = (userId || "user").replace(/[^a-z0-9]/gi, "").slice(0, 8);
        const filename = `${Date.now()}_${shortUser}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        
        await fs.mkdir(uploadDir, { recursive: true });
        
        const filePath = path.join(uploadDir, filename);
        const buf = new Uint8Array(await file.arrayBuffer());
        await fs.writeFile(filePath, buf);

        const publicUrl = `/uploads/${filename}`;

        return Response.json({ path: publicUrl, url: publicUrl, contentType: file.type, size: file.size });
      },
    },
  },
});
