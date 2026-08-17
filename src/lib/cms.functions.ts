import { createServerFn } from "@tanstack/react-start";
import { models } from "@/lib/db/index.server";
import { Op } from "@/lib/db/op.server";

export const listActiveBanners = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const now = new Date();
    const rows = await models.hero_banners.findAll({
      where: {
        is_active: true,
        [Op.and]: [
          { [Op.or]: [{ starts_at: null }, { starts_at: { [Op.lte]: now } }] },
          { [Op.or]: [{ ends_at: null }, { ends_at: { [Op.gte]: now } }] },
        ]
      },
      order: [["display_order", "ASC"], ["created_at", "DESC"]],
      limit: 10
    });
    return rows.map((r: any) => r.get({ plain: true }));
  } catch (e) {
    console.error("Error fetching active banners:", e);
    return [];
  }
});

export const listActivePromos = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await models.promo_sections.findAll({
      where: { is_active: true },
      order: [["slot", "ASC"], ["display_order", "ASC"]]
    });
    return rows.map((r: any) => r.get({ plain: true }));
  } catch (e) {
    console.error("Error fetching active promos:", e);
    return [];
  }
});

export const listActiveTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await models.testimonials.findAll({
      where: { is_active: true },
      order: [["display_order", "ASC"], ["created_at", "DESC"]],
      limit: 12
    });
    return rows.map((r: any) => r.get({ plain: true }));
  } catch (e) {
    console.error("Error fetching active testimonials:", e);
    return [];
  }
});

export const getFooterSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const row = await models.site_settings.findByPk("footer");
    return (row?.data as any) ?? null;
  } catch (e) {
    console.error("Error fetching footer settings:", e);
    return null;
  }
});
