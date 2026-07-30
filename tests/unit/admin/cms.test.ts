import { describe, it, expect, beforeEach } from "vitest";
import {
  cmsClearAvatar,
  cmsDeleteBanner,
  cmsDeletePage,
  cmsDeletePromo,
  cmsDeleteTestimonial,
  cmsGetAvatar,
  cmsGetFooter,
  cmsGetPage,
  cmsListBanners,
  cmsListPages,
  cmsListPromos,
  cmsListTestimonials,
  cmsUpdateFooter,
  cmsUploadAvatar,
  cmsUpsertBanner,
  cmsUpsertPage,
  cmsUpsertPromo,
  cmsUpsertTestimonial,
  getActiveAvatarUrl
} from "@/lib/admin.cms.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";

const ID = "11111111-1111-1111-1111-111155555555";
const tiny = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const big = "data:image/png;base64," + "A".repeat(7 * 1024 * 1024);
const BRAND_ID = "11111111-1111-1111-1111-111155555555";
const PART_ID = "11111111-1111-1111-1111-111155555555";
const PART_ID_2 = "22222222-2222-2222-2222-222255555555";
const WH_ID = "22222222-2222-2222-2222-222255555555";
const WH_ID_2 = "33333333-3333-3333-3333-333355555555";
const SM_ID = "55555555-5555-5555-5555-555555555555";
const CUST_ID = "33333333-3333-3333-3333-333355555555";
const NOTIF_ID = "44444444-4444-4444-4444-444455555555";
const oldDate = new Date(Date.now() - 30 * 86400000).toISOString();
const range = { from: "2020-01-01", to: "2030-12-31" };
const baseData = { part_id: PART_ID, warehouse_id: WH_ID, movement_type: "IN", quantity: 10 };

beforeEach(() => {
  setTestContext({ isAdmin: true, userId: "admin-1" });
});

describe("cmsAvatar", () => {
  it("clears avatar", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: { data: { path: "avatar-1.png" } }, error: null });
    sup.setResponse("upsert:site_settings", { data: null, error: null });
    const res: any = await invoke(cmsClearAvatar, { data: {} });
    const row: any = res;
    expect(res.ok).toBe(true);
    expect(sup.calls.some((c) => c.op.includes("storage.remove"))).toBe(true);
  });

  it("gets null when no path stored", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: { data: {} }, error: null });
    const res: any = await invoke(cmsGetAvatar, { data: {} });
    const row: any = res;
    expect(res.path).toBeNull();
  });

  it("rejects payload over 5MB", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(cmsUploadAvatar, { data: { fileBase64: big, contentType: "image/png", filename: "big.png" }, }), ).rejects.toThrow(/too large/i);
  });

  it("returns url when path stored", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: { data: { path: "avatar-1.png" } }, error: null });
    const res: any = await invoke(cmsGetAvatar, { data: {} });
    const row: any = res;
    expect(res.path).toBe("avatar-1.png");
    expect(res.url).toContain("signed.example");
  });

  it("throws when upload fails", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("storage.upload:avatar-images", { data: null, error: { message: "upload-fail" } });
    sup.setResponse("delete:parts", { error: "error" });
    sup.setResponse("delete:brands", { error: "error" });
    sup.setResponse("delete:warehouses", { error: "error" });
    sup.setResponse("select:parts", { error: "error" });
    sup.setResponse("select:orders", { error: "error" });
    sup.setResponse("upload:avatars", { error: "error" });
    sup.setResponse("auth:create", { error: "error" });
    sup.setResponse("auth:update", { error: "error" });
    sup.setResponse("insert:salesmen", { error: "error" });
    sup.setResponse("update:salesmen", { error: "error" });
    await expect( invoke(cmsUploadAvatar, { data: { fileBase64: tiny, contentType: "image/jpeg", filename: "a.jpg" }, }), ).rejects.toThrow(/upload-fail/);
  });

  it("uploads and stores path", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: null, error: null });
    const res: any = await invoke(cmsUploadAvatar, { data: { fileBase64: tiny, contentType: "image/png", filename: "a.png" }, });
    const row: any = res;
    expect(res.path).toMatch(/^avatar-\d+\.png$/);
    expect(sup.calls.some((c) => c.op.includes("storage.upload"))).toBe(true);
  });

});

describe("cmsDeleteBanner", () => {
  it("deletes", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:hero_banners", { data: null, error: null });
    const res: any = await invoke(cmsDeleteBanner, { data: { id: ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

  it("throws on error", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:hero_banners", { data: null, error: { message: "boom" } });
    sup.setResponse("delete:parts", { error: "boom" });
    sup.setResponse("delete:brands", { error: "boom" });
    sup.setResponse("delete:warehouses", { error: "boom" });
    sup.setResponse("select:parts", { error: "boom" });
    sup.setResponse("select:orders", { error: "boom" });
    sup.setResponse("upload:avatars", { error: "boom" });
    sup.setResponse("auth:create", { error: "boom" });
    sup.setResponse("auth:update", { error: "boom" });
    sup.setResponse("insert:salesmen", { error: "boom" });
    sup.setResponse("update:salesmen", { error: "boom" });
    await expect(invoke(cmsDeleteBanner, { data: { id: ID } })).rejects.toThrow(/boom/);
  });

});

describe("cmsFooter", () => {
  it("gets empty when no row", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: null, error: null });
    const res: any = await invoke(cmsGetFooter, { data: {} });
    const row: any = res;
    expect(res).toEqual({});
  });

  it("returns stored data", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: { data: { copyright: "©" } }, error: null });
    const res: any = await invoke(cmsGetFooter, { data: {} });
    const row: any = res;
    expect(res.copyright).toBe("©");
  });

  it("updates footer", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: { id: "footer" }, error: null });
    const res: any = await invoke(cmsUpdateFooter, { data: { data: { copyright: "©" } } });
    const row: any = res;
    expect(res.id).toBe("footer");
  });

});

describe("cmsListBanners", () => {
  it("rejects when not super_admin", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("rpc:has_role", { data: false, error: null });
    await expect(invoke(cmsListBanners)).rejects.toThrow(/super admin/);
  });

  it("returns rows", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:hero_banners", { data: [{ id: ID }], error: null });
    const res: any = await invoke(cmsListBanners, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

});

describe("cmsListPromos + upsert + delete", () => {
  it("deletes promo", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:promo_sections", { data: null, error: null });
    const res: any = await invoke(cmsDeletePromo, { data: { id: ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

  it("lists promos", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:promo_sections", { data: [{ id: ID }], error: null });
    const res: any = await invoke(cmsListPromos, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

  it("upserts promo", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:promo_sections", { data: { id: ID }, error: null });
    const res: any = await invoke(cmsUpsertPromo, { data: { slot: "home", title: "Deal" }, });
    const row: any = res;
    expect(res.id).toBe(ID);
  });

});

describe("cmsPages", () => {
  it("deletes page", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:cms_pages", { data: null, error: null });
    const res: any = await invoke(cmsDeletePage, { data: { id: ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

  it("gets one", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:cms_pages", { data: { id: ID, slug: "about" }, error: null });
    const res: any = await invoke(cmsGetPage, { data: { id: ID } });
    const row: any = res;
    expect(res.slug).toBe("about");
  });

  it("lists", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:cms_pages", { data: [{ id: ID }], error: null });
    const res: any = await invoke(cmsListPages, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

  it("upserts published page (sets published_at)", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:cms_pages", { data: { id: ID }, error: null });
    const res: any = await invoke(cmsUpsertPage, { data: { slug: "about", title: "About", is_published: true }, });
    const row: any = res;
    expect(res.id).toBe(ID);
  });

  it("validates slug format", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(cmsUpsertPage, { data: { slug: "Bad Slug", title: "T" } }), ).rejects.toThrow();
  });

});

describe("cmsTestimonials CRUD", () => {
  it("deletes", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("delete:testimonials", { data: null, error: null });
    const res: any = await invoke(cmsDeleteTestimonial, { data: { id: ID } });
    const row: any = res;
    expect(res.ok).toBe(true);
  });

  it("lists", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:testimonials", { data: [{ id: ID }], error: null });
    const res: any = await invoke(cmsListTestimonials, { data: {} });
    const row: any = res;
    expect(res).toHaveLength(1);
  });

  it("upserts", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:testimonials", { data: { id: ID }, error: null });
    const res: any = await invoke(cmsUpsertTestimonial, { data: { author_name: "A", quote: "Great" }, });
    const row: any = res;
    expect(res.id).toBe(ID);
  });

  it("validates rating range", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(cmsUpsertTestimonial, { data: { author_name: "A", quote: "Q", rating: 10 } }), ).rejects.toThrow();
  });

});

describe("cmsUpsertBanner", () => {
  it("upserts", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:hero_banners", { data: { id: ID }, error: null });
    const res: any = await invoke(cmsUpsertBanner, { data: { title: "Hero", image_url: "/h.jpg" }, });
    const row: any = res;
    expect(res.id).toBe(ID);
  });

  it("validates required title", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    await expect( invoke(cmsUpsertBanner, { data: { title: "", image_url: "/x.jpg" } }), ).rejects.toThrow();
  });

});

describe("getActiveAvatarUrl (public)", () => {
  it("returns null when no path", async () => {
    const sup = getSupabase();
    sup.setResponse("rpc:has_role", { data: true, error: null });
    sup.setResponse("select:site_settings", { data: { data: {} }, error: null });
    const res: any = await invoke(getActiveAvatarUrl, { data: {} });
    const row: any = res;
    expect(res.url).toBeNull();
  });

});
