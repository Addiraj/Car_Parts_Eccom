import type { Sequelize } from "sequelize";
import { addresses as _addresses } from "./addresses";
import type { addressesAttributes, addressesCreationAttributes } from "./addresses";
import { admin_notification_reads as _admin_notification_reads } from "./admin_notification_reads";
import type { admin_notification_readsAttributes, admin_notification_readsCreationAttributes } from "./admin_notification_reads";
import { admin_notifications as _admin_notifications } from "./admin_notifications";
import type { admin_notificationsAttributes, admin_notificationsCreationAttributes } from "./admin_notifications";
import { ai_chat_events as _ai_chat_events } from "./ai_chat_events";
import type { ai_chat_eventsAttributes, ai_chat_eventsCreationAttributes } from "./ai_chat_events";
import { ai_chat_messages as _ai_chat_messages } from "./ai_chat_messages";
import type { ai_chat_messagesAttributes, ai_chat_messagesCreationAttributes } from "./ai_chat_messages";
import { ai_chat_threads as _ai_chat_threads } from "./ai_chat_threads";
import type { ai_chat_threadsAttributes, ai_chat_threadsCreationAttributes } from "./ai_chat_threads";
import { ai_leads as _ai_leads } from "./ai_leads";
import type { ai_leadsAttributes, ai_leadsCreationAttributes } from "./ai_leads";
import { ai_prompt_revisions as _ai_prompt_revisions } from "./ai_prompt_revisions";
import type { ai_prompt_revisionsAttributes, ai_prompt_revisionsCreationAttributes } from "./ai_prompt_revisions";
import { ai_prompts as _ai_prompts } from "./ai_prompts";
import type { ai_promptsAttributes, ai_promptsCreationAttributes } from "./ai_prompts";
import { ai_vip_numbers as _ai_vip_numbers } from "./ai_vip_numbers";
import type { ai_vip_numbersAttributes, ai_vip_numbersCreationAttributes } from "./ai_vip_numbers";
import { alternative_parts as _alternative_parts } from "./alternative_parts";
import type { alternative_partsAttributes, alternative_partsCreationAttributes } from "./alternative_parts";
import { audit_logs as _audit_logs } from "./audit_logs";
import type { audit_logsAttributes, audit_logsCreationAttributes } from "./audit_logs";
import { avatar_providers as _avatar_providers } from "./avatar_providers";
import type { avatar_providersAttributes, avatar_providersCreationAttributes } from "./avatar_providers";
import { brands as _brands } from "./brands";
import type { brandsAttributes, brandsCreationAttributes } from "./brands";
import { cart_items as _cart_items } from "./cart_items";
import type { cart_itemsAttributes, cart_itemsCreationAttributes } from "./cart_items";
import { categories as _categories } from "./categories";
import type { categoriesAttributes, categoriesCreationAttributes } from "./categories";
import { cms_pages as _cms_pages } from "./cms_pages";
import type { cms_pagesAttributes, cms_pagesCreationAttributes } from "./cms_pages";
import { contacts as _contacts } from "./contacts";
import type { contactsAttributes, contactsCreationAttributes } from "./contacts";
import { coupons as _coupons } from "./coupons";
import type { couponsAttributes, couponsCreationAttributes } from "./coupons";
import { credit_billing_statements as _credit_billing_statements } from "./credit_billing_statements";
import type { credit_billing_statementsAttributes, credit_billing_statementsCreationAttributes } from "./credit_billing_statements";
import { credit_payments as _credit_payments } from "./credit_payments";
import type { credit_paymentsAttributes, credit_paymentsCreationAttributes } from "./credit_payments";
import { credit_transactions as _credit_transactions } from "./credit_transactions";
import type { credit_transactionsAttributes, credit_transactionsCreationAttributes } from "./credit_transactions";
import { credit_wallets as _credit_wallets } from "./credit_wallets";
import type { credit_walletsAttributes, credit_walletsCreationAttributes } from "./credit_wallets";
import { csv_imports as _csv_imports } from "./csv_imports";
import type { csv_importsAttributes, csv_importsCreationAttributes } from "./csv_imports";
import { customer_activities as _customer_activities } from "./customer_activities";
import type { customer_activitiesAttributes, customer_activitiesCreationAttributes } from "./customer_activities";
import { customer_assignments as _customer_assignments } from "./customer_assignments";
import type { customer_assignmentsAttributes, customer_assignmentsCreationAttributes } from "./customer_assignments";
import { customer_followups as _customer_followups } from "./customer_followups";
import type { customer_followupsAttributes, customer_followupsCreationAttributes } from "./customer_followups";
import { customer_notes as _customer_notes } from "./customer_notes";
import type { customer_notesAttributes, customer_notesCreationAttributes } from "./customer_notes";
import { diagram_hotspots as _diagram_hotspots } from "./diagram_hotspots";
import type { diagram_hotspotsAttributes, diagram_hotspotsCreationAttributes } from "./diagram_hotspots";
import { diagrams as _diagrams } from "./diagrams";
import type { diagramsAttributes, diagramsCreationAttributes } from "./diagrams";
import { engines as _engines } from "./engines";
import type { enginesAttributes, enginesCreationAttributes } from "./engines";
import { garages as _garages } from "./garages";
import type { garagesAttributes, garagesCreationAttributes } from "./garages";
import { hero_banners as _hero_banners } from "./hero_banners";
import type { hero_bannersAttributes, hero_bannersCreationAttributes } from "./hero_banners";
import { model_years as _model_years } from "./model_years";
import type { model_yearsAttributes, model_yearsCreationAttributes } from "./model_years";
import { models as _models } from "./models";
import type { modelsAttributes, modelsCreationAttributes } from "./models";
import { objects as _objects } from "./objects";
import type { objectsAttributes, objectsCreationAttributes } from "./objects";
import { order_events as _order_events } from "./order_events";
import type { order_eventsAttributes, order_eventsCreationAttributes } from "./order_events";
import { order_items as _order_items } from "./order_items";
import type { order_itemsAttributes, order_itemsCreationAttributes } from "./order_items";
import { orders as _orders } from "./orders";
import type { ordersAttributes, ordersCreationAttributes } from "./orders";
import { part_compatibility as _part_compatibility } from "./part_compatibility";
import type { part_compatibilityAttributes, part_compatibilityCreationAttributes } from "./part_compatibility";
import { parts as _parts } from "./parts";
import type { partsAttributes, partsCreationAttributes } from "./parts";
import { payment_settings as _payment_settings } from "./payment_settings";
import type { payment_settingsAttributes, payment_settingsCreationAttributes } from "./payment_settings";
import { profiles as _profiles } from "./profiles";
import type { profilesAttributes, profilesCreationAttributes } from "./profiles";
import { promo_sections as _promo_sections } from "./promo_sections";
import type { promo_sectionsAttributes, promo_sectionsCreationAttributes } from "./promo_sections";
import { quotation_events as _quotation_events } from "./quotation_events";
import type { quotation_eventsAttributes, quotation_eventsCreationAttributes } from "./quotation_events";
import { quotation_items as _quotation_items } from "./quotation_items";
import type { quotation_itemsAttributes, quotation_itemsCreationAttributes } from "./quotation_items";
import { quotations as _quotations } from "./quotations";
import type { quotationsAttributes, quotationsCreationAttributes } from "./quotations";
import { recently_viewed as _recently_viewed } from "./recently_viewed";
import type { recently_viewedAttributes, recently_viewedCreationAttributes } from "./recently_viewed";
import { salesmen as _salesmen } from "./salesmen";
import type { salesmenAttributes, salesmenCreationAttributes } from "./salesmen";
import { shipping_zones as _shipping_zones } from "./shipping_zones";
import type { shipping_zonesAttributes, shipping_zonesCreationAttributes } from "./shipping_zones";
import { site_settings as _site_settings } from "./site_settings";
import type { site_settingsAttributes, site_settingsCreationAttributes } from "./site_settings";
import { special_offer_brands as _special_offer_brands } from "./special_offer_brands";
import type { special_offer_brandsAttributes, special_offer_brandsCreationAttributes } from "./special_offer_brands";
import { special_offer_categories as _special_offer_categories } from "./special_offer_categories";
import type { special_offer_categoriesAttributes, special_offer_categoriesCreationAttributes } from "./special_offer_categories";
import { special_offer_products as _special_offer_products } from "./special_offer_products";
import type { special_offer_productsAttributes, special_offer_productsCreationAttributes } from "./special_offer_products";
import { special_offers as _special_offers } from "./special_offers";
import type { special_offersAttributes, special_offersCreationAttributes } from "./special_offers";
import { stock_levels as _stock_levels } from "./stock_levels";
import type { stock_levelsAttributes, stock_levelsCreationAttributes } from "./stock_levels";
import { stock_movements as _stock_movements } from "./stock_movements";
import type { stock_movementsAttributes, stock_movementsCreationAttributes } from "./stock_movements";
import { synonyms as _synonyms } from "./synonyms";
import type { synonymsAttributes, synonymsCreationAttributes } from "./synonyms";
import { testimonials as _testimonials } from "./testimonials";
import type { testimonialsAttributes, testimonialsCreationAttributes } from "./testimonials";
import { user_login_history as _user_login_history } from "./user_login_history";
import type { user_login_historyAttributes, user_login_historyCreationAttributes } from "./user_login_history";
import { user_roles as _user_roles } from "./user_roles";
import type { user_rolesAttributes, user_rolesCreationAttributes } from "./user_roles";
import { users as _users } from "./users";
import type { usersAttributes, usersCreationAttributes } from "./users";
import { vin_decode_cache as _vin_decode_cache } from "./vin_decode_cache";
import type { vin_decode_cacheAttributes, vin_decode_cacheCreationAttributes } from "./vin_decode_cache";
import { wa_analytics_events as _wa_analytics_events } from "./wa_analytics_events";
import type { wa_analytics_eventsAttributes, wa_analytics_eventsCreationAttributes } from "./wa_analytics_events";
import { wa_chat_logs as _wa_chat_logs } from "./wa_chat_logs";
import type { wa_chat_logsAttributes, wa_chat_logsCreationAttributes } from "./wa_chat_logs";
import { warehouses as _warehouses } from "./warehouses";
import type { warehousesAttributes, warehousesCreationAttributes } from "./warehouses";
import { wishlist_items as _wishlist_items } from "./wishlist_items";
import type { wishlist_itemsAttributes, wishlist_itemsCreationAttributes } from "./wishlist_items";

export {
  _addresses as addresses,
  _admin_notification_reads as admin_notification_reads,
  _admin_notifications as admin_notifications,
  _ai_chat_events as ai_chat_events,
  _ai_chat_messages as ai_chat_messages,
  _ai_chat_threads as ai_chat_threads,
  _ai_leads as ai_leads,
  _ai_prompt_revisions as ai_prompt_revisions,
  _ai_prompts as ai_prompts,
  _ai_vip_numbers as ai_vip_numbers,
  _alternative_parts as alternative_parts,
  _audit_logs as audit_logs,
  _avatar_providers as avatar_providers,
  _brands as brands,
  _cart_items as cart_items,
  _categories as categories,
  _cms_pages as cms_pages,
  _contacts as contacts,
  _coupons as coupons,
  _credit_billing_statements as credit_billing_statements,
  _credit_payments as credit_payments,
  _credit_transactions as credit_transactions,
  _credit_wallets as credit_wallets,
  _csv_imports as csv_imports,
  _customer_activities as customer_activities,
  _customer_assignments as customer_assignments,
  _customer_followups as customer_followups,
  _customer_notes as customer_notes,
  _diagram_hotspots as diagram_hotspots,
  _diagrams as diagrams,
  _engines as engines,
  _garages as garages,
  _hero_banners as hero_banners,
  _model_years as model_years,
  _models as models,
  _objects as objects,
  _order_events as order_events,
  _order_items as order_items,
  _orders as orders,
  _part_compatibility as part_compatibility,
  _parts as parts,
  _payment_settings as payment_settings,
  _profiles as profiles,
  _promo_sections as promo_sections,
  _quotation_events as quotation_events,
  _quotation_items as quotation_items,
  _quotations as quotations,
  _recently_viewed as recently_viewed,
  _salesmen as salesmen,
  _shipping_zones as shipping_zones,
  _site_settings as site_settings,
  _special_offer_brands as special_offer_brands,
  _special_offer_categories as special_offer_categories,
  _special_offer_products as special_offer_products,
  _special_offers as special_offers,
  _stock_levels as stock_levels,
  _stock_movements as stock_movements,
  _synonyms as synonyms,
  _testimonials as testimonials,
  _user_login_history as user_login_history,
  _user_roles as user_roles,
  _users as users,
  _vin_decode_cache as vin_decode_cache,
  _wa_analytics_events as wa_analytics_events,
  _wa_chat_logs as wa_chat_logs,
  _warehouses as warehouses,
  _wishlist_items as wishlist_items,
};

export type {
  addressesAttributes,
  addressesCreationAttributes,
  admin_notification_readsAttributes,
  admin_notification_readsCreationAttributes,
  admin_notificationsAttributes,
  admin_notificationsCreationAttributes,
  ai_chat_eventsAttributes,
  ai_chat_eventsCreationAttributes,
  ai_chat_messagesAttributes,
  ai_chat_messagesCreationAttributes,
  ai_chat_threadsAttributes,
  ai_chat_threadsCreationAttributes,
  ai_leadsAttributes,
  ai_leadsCreationAttributes,
  ai_prompt_revisionsAttributes,
  ai_prompt_revisionsCreationAttributes,
  ai_promptsAttributes,
  ai_promptsCreationAttributes,
  ai_vip_numbersAttributes,
  ai_vip_numbersCreationAttributes,
  alternative_partsAttributes,
  alternative_partsCreationAttributes,
  audit_logsAttributes,
  audit_logsCreationAttributes,
  avatar_providersAttributes,
  avatar_providersCreationAttributes,
  brandsAttributes,
  brandsCreationAttributes,
  cart_itemsAttributes,
  cart_itemsCreationAttributes,
  categoriesAttributes,
  categoriesCreationAttributes,
  cms_pagesAttributes,
  cms_pagesCreationAttributes,
  contactsAttributes,
  contactsCreationAttributes,
  couponsAttributes,
  couponsCreationAttributes,
  credit_billing_statementsAttributes,
  credit_billing_statementsCreationAttributes,
  credit_paymentsAttributes,
  credit_paymentsCreationAttributes,
  credit_transactionsAttributes,
  credit_transactionsCreationAttributes,
  credit_walletsAttributes,
  credit_walletsCreationAttributes,
  csv_importsAttributes,
  csv_importsCreationAttributes,
  customer_activitiesAttributes,
  customer_activitiesCreationAttributes,
  customer_assignmentsAttributes,
  customer_assignmentsCreationAttributes,
  customer_followupsAttributes,
  customer_followupsCreationAttributes,
  customer_notesAttributes,
  customer_notesCreationAttributes,
  diagram_hotspotsAttributes,
  diagram_hotspotsCreationAttributes,
  diagramsAttributes,
  diagramsCreationAttributes,
  enginesAttributes,
  enginesCreationAttributes,
  garagesAttributes,
  garagesCreationAttributes,
  hero_bannersAttributes,
  hero_bannersCreationAttributes,
  model_yearsAttributes,
  model_yearsCreationAttributes,
  modelsAttributes,
  modelsCreationAttributes,
  objectsAttributes,
  objectsCreationAttributes,
  order_eventsAttributes,
  order_eventsCreationAttributes,
  order_itemsAttributes,
  order_itemsCreationAttributes,
  ordersAttributes,
  ordersCreationAttributes,
  part_compatibilityAttributes,
  part_compatibilityCreationAttributes,
  partsAttributes,
  partsCreationAttributes,
  payment_settingsAttributes,
  payment_settingsCreationAttributes,
  profilesAttributes,
  profilesCreationAttributes,
  promo_sectionsAttributes,
  promo_sectionsCreationAttributes,
  quotation_eventsAttributes,
  quotation_eventsCreationAttributes,
  quotation_itemsAttributes,
  quotation_itemsCreationAttributes,
  quotationsAttributes,
  quotationsCreationAttributes,
  recently_viewedAttributes,
  recently_viewedCreationAttributes,
  salesmenAttributes,
  salesmenCreationAttributes,
  shipping_zonesAttributes,
  shipping_zonesCreationAttributes,
  site_settingsAttributes,
  site_settingsCreationAttributes,
  special_offer_brandsAttributes,
  special_offer_brandsCreationAttributes,
  special_offer_categoriesAttributes,
  special_offer_categoriesCreationAttributes,
  special_offer_productsAttributes,
  special_offer_productsCreationAttributes,
  special_offersAttributes,
  special_offersCreationAttributes,
  stock_levelsAttributes,
  stock_levelsCreationAttributes,
  stock_movementsAttributes,
  stock_movementsCreationAttributes,
  synonymsAttributes,
  synonymsCreationAttributes,
  testimonialsAttributes,
  testimonialsCreationAttributes,
  user_login_historyAttributes,
  user_login_historyCreationAttributes,
  user_rolesAttributes,
  user_rolesCreationAttributes,
  usersAttributes,
  usersCreationAttributes,
  vin_decode_cacheAttributes,
  vin_decode_cacheCreationAttributes,
  wa_analytics_eventsAttributes,
  wa_analytics_eventsCreationAttributes,
  wa_chat_logsAttributes,
  wa_chat_logsCreationAttributes,
  warehousesAttributes,
  warehousesCreationAttributes,
  wishlist_itemsAttributes,
  wishlist_itemsCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  const addresses = _addresses.initModel(sequelize);
  const admin_notification_reads = _admin_notification_reads.initModel(sequelize);
  const admin_notifications = _admin_notifications.initModel(sequelize);
  const ai_chat_events = _ai_chat_events.initModel(sequelize);
  const ai_chat_messages = _ai_chat_messages.initModel(sequelize);
  const ai_chat_threads = _ai_chat_threads.initModel(sequelize);
  const ai_leads = _ai_leads.initModel(sequelize);
  const ai_prompt_revisions = _ai_prompt_revisions.initModel(sequelize);
  const ai_prompts = _ai_prompts.initModel(sequelize);
  const ai_vip_numbers = _ai_vip_numbers.initModel(sequelize);
  const alternative_parts = _alternative_parts.initModel(sequelize);
  const audit_logs = _audit_logs.initModel(sequelize);
  const avatar_providers = _avatar_providers.initModel(sequelize);
  const brands = _brands.initModel(sequelize);
  const cart_items = _cart_items.initModel(sequelize);
  const categories = _categories.initModel(sequelize);
  const cms_pages = _cms_pages.initModel(sequelize);
  const contacts = _contacts.initModel(sequelize);
  const coupons = _coupons.initModel(sequelize);
  const credit_billing_statements = _credit_billing_statements.initModel(sequelize);
  const credit_payments = _credit_payments.initModel(sequelize);
  const credit_transactions = _credit_transactions.initModel(sequelize);
  const credit_wallets = _credit_wallets.initModel(sequelize);
  const csv_imports = _csv_imports.initModel(sequelize);
  const customer_activities = _customer_activities.initModel(sequelize);
  const customer_assignments = _customer_assignments.initModel(sequelize);
  const customer_followups = _customer_followups.initModel(sequelize);
  const customer_notes = _customer_notes.initModel(sequelize);
  const diagram_hotspots = _diagram_hotspots.initModel(sequelize);
  const diagrams = _diagrams.initModel(sequelize);
  const engines = _engines.initModel(sequelize);
  const garages = _garages.initModel(sequelize);
  const hero_banners = _hero_banners.initModel(sequelize);
  const model_years = _model_years.initModel(sequelize);
  const models = _models.initModel(sequelize);
  const objects = _objects.initModel(sequelize);
  const order_events = _order_events.initModel(sequelize);
  const order_items = _order_items.initModel(sequelize);
  const orders = _orders.initModel(sequelize);
  const part_compatibility = _part_compatibility.initModel(sequelize);
  const parts = _parts.initModel(sequelize);
  const payment_settings = _payment_settings.initModel(sequelize);
  const profiles = _profiles.initModel(sequelize);
  const promo_sections = _promo_sections.initModel(sequelize);
  const quotation_events = _quotation_events.initModel(sequelize);
  const quotation_items = _quotation_items.initModel(sequelize);
  const quotations = _quotations.initModel(sequelize);
  const recently_viewed = _recently_viewed.initModel(sequelize);
  const salesmen = _salesmen.initModel(sequelize);
  const shipping_zones = _shipping_zones.initModel(sequelize);
  const site_settings = _site_settings.initModel(sequelize);
  const special_offer_brands = _special_offer_brands.initModel(sequelize);
  const special_offer_categories = _special_offer_categories.initModel(sequelize);
  const special_offer_products = _special_offer_products.initModel(sequelize);
  const special_offers = _special_offers.initModel(sequelize);
  const stock_levels = _stock_levels.initModel(sequelize);
  const stock_movements = _stock_movements.initModel(sequelize);
  const synonyms = _synonyms.initModel(sequelize);
  const testimonials = _testimonials.initModel(sequelize);
  const user_login_history = _user_login_history.initModel(sequelize);
  const user_roles = _user_roles.initModel(sequelize);
  const users = _users.initModel(sequelize);
  const vin_decode_cache = _vin_decode_cache.initModel(sequelize);
  const wa_analytics_events = _wa_analytics_events.initModel(sequelize);
  const wa_chat_logs = _wa_chat_logs.initModel(sequelize);
  const warehouses = _warehouses.initModel(sequelize);
  const wishlist_items = _wishlist_items.initModel(sequelize);

  admin_notifications.belongsToMany(users, { as: 'admin_id_users', through: admin_notification_reads, foreignKey: "notification_id", otherKey: "admin_id" });
  users.belongsToMany(admin_notifications, { as: 'notification_id_admin_notifications', through: admin_notification_reads, foreignKey: "admin_id", otherKey: "notification_id" });
  admin_notification_reads.belongsTo(admin_notifications, { as: "notification", foreignKey: "notification_id"});
  admin_notifications.hasMany(admin_notification_reads, { as: "admin_notification_reads", foreignKey: "notification_id"});
  ai_chat_events.belongsTo(ai_chat_threads, { as: "thread", foreignKey: "thread_id"});
  ai_chat_threads.hasMany(ai_chat_events, { as: "ai_chat_events", foreignKey: "thread_id"});
  ai_chat_messages.belongsTo(ai_chat_threads, { as: "thread", foreignKey: "thread_id"});
  ai_chat_threads.hasMany(ai_chat_messages, { as: "ai_chat_messages", foreignKey: "thread_id"});
  ai_leads.belongsTo(ai_chat_threads, { as: "thread", foreignKey: "thread_id"});
  ai_chat_threads.hasMany(ai_leads, { as: "ai_leads", foreignKey: "thread_id"});
  ai_prompt_revisions.belongsTo(ai_prompts, { as: "prompt", foreignKey: "prompt_id"});
  ai_prompts.hasMany(ai_prompt_revisions, { as: "ai_prompt_revisions", foreignKey: "prompt_id"});
  garages.belongsTo(brands, { as: "brand", foreignKey: "brand_id"});
  brands.hasMany(garages, { as: "garages", foreignKey: "brand_id"});
  models.belongsTo(brands, { as: "brand", foreignKey: "brand_id"});
  brands.hasMany(models, { as: "models", foreignKey: "brand_id"});
  parts.belongsTo(brands, { as: "brand", foreignKey: "brand_id"});
  brands.hasMany(parts, { as: "parts", foreignKey: "brand_id"});
  special_offer_brands.belongsTo(brands, { as: "brand", foreignKey: "brand_id"});
  brands.hasMany(special_offer_brands, { as: "special_offer_brands", foreignKey: "brand_id"});
  categories.belongsTo(categories, { as: "parent", foreignKey: "parent_id"});
  categories.hasMany(categories, { as: "categories", foreignKey: "parent_id"});
  diagrams.belongsTo(categories, { as: "category", foreignKey: "category_id"});
  categories.hasMany(diagrams, { as: "diagrams", foreignKey: "category_id"});
  parts.belongsTo(categories, { as: "category", foreignKey: "category_id"});
  categories.hasMany(parts, { as: "parts", foreignKey: "category_id"});
  special_offer_categories.belongsTo(categories, { as: "category", foreignKey: "category_id"});
  categories.hasMany(special_offer_categories, { as: "special_offer_categories", foreignKey: "category_id"});
  credit_payments.belongsTo(credit_billing_statements, { as: "statement", foreignKey: "statement_id"});
  credit_billing_statements.hasMany(credit_payments, { as: "credit_payments", foreignKey: "statement_id"});
  credit_billing_statements.belongsTo(credit_wallets, { as: "wallet", foreignKey: "wallet_id"});
  credit_wallets.hasMany(credit_billing_statements, { as: "credit_billing_statements", foreignKey: "wallet_id"});
  credit_payments.belongsTo(credit_wallets, { as: "wallet", foreignKey: "wallet_id"});
  credit_wallets.hasMany(credit_payments, { as: "credit_payments", foreignKey: "wallet_id"});
  credit_transactions.belongsTo(credit_wallets, { as: "wallet", foreignKey: "wallet_id"});
  credit_wallets.hasMany(credit_transactions, { as: "credit_transactions", foreignKey: "wallet_id"});
  diagram_hotspots.belongsTo(diagrams, { as: "diagram", foreignKey: "diagram_id"});
  diagrams.hasMany(diagram_hotspots, { as: "diagram_hotspots", foreignKey: "diagram_id"});
  diagrams.belongsTo(engines, { as: "engine", foreignKey: "engine_id"});
  engines.hasMany(diagrams, { as: "diagrams", foreignKey: "engine_id"});
  garages.belongsTo(engines, { as: "engine", foreignKey: "engine_id"});
  engines.hasMany(garages, { as: "garages", foreignKey: "engine_id"});
  part_compatibility.belongsTo(engines, { as: "engine", foreignKey: "engine_id"});
  engines.hasMany(part_compatibility, { as: "part_compatibilities", foreignKey: "engine_id"});
  engines.belongsTo(model_years, { as: "model_year", foreignKey: "model_year_id"});
  model_years.hasMany(engines, { as: "engines", foreignKey: "model_year_id"});
  garages.belongsTo(model_years, { as: "model_year", foreignKey: "model_year_id"});
  model_years.hasMany(garages, { as: "garages", foreignKey: "model_year_id"});
  garages.belongsTo(models, { as: "model", foreignKey: "model_id"});
  models.hasMany(garages, { as: "garages", foreignKey: "model_id"});
  model_years.belongsTo(models, { as: "model", foreignKey: "model_id"});
  models.hasMany(model_years, { as: "model_years", foreignKey: "model_id"});
  credit_transactions.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(credit_transactions, { as: "credit_transactions", foreignKey: "order_id"});
  order_events.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(order_events, { as: "order_events", foreignKey: "order_id"});
  order_items.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(order_items, { as: "order_items", foreignKey: "order_id"});
  quotations.belongsTo(orders, { as: "converted_order", foreignKey: "converted_order_id"});
  orders.hasMany(quotations, { as: "quotations", foreignKey: "converted_order_id"});
  alternative_parts.belongsTo(parts, { as: "alternative_part", foreignKey: "alternative_part_id"});
  parts.hasMany(alternative_parts, { as: "alternative_parts", foreignKey: "alternative_part_id"});
  alternative_parts.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(alternative_parts, { as: "part_alternative_parts", foreignKey: "part_id"});
  cart_items.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(cart_items, { as: "cart_items", foreignKey: "part_id"});
  diagram_hotspots.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(diagram_hotspots, { as: "diagram_hotspots", foreignKey: "part_id"});
  part_compatibility.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(part_compatibility, { as: "part_compatibilities", foreignKey: "part_id"});
  quotation_items.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(quotation_items, { as: "quotation_items", foreignKey: "part_id"});
  special_offer_products.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(special_offer_products, { as: "special_offer_products", foreignKey: "part_id"});
  stock_levels.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(stock_levels, { as: "stock_levels", foreignKey: "part_id"});
  stock_movements.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(stock_movements, { as: "stock_movements", foreignKey: "part_id"});
  wishlist_items.belongsTo(parts, { as: "part", foreignKey: "part_id"});
  parts.hasMany(wishlist_items, { as: "wishlist_items", foreignKey: "part_id"});
  credit_billing_statements.belongsTo(profiles, { as: "user", foreignKey: "user_id"});
  profiles.hasMany(credit_billing_statements, { as: "credit_billing_statements", foreignKey: "user_id"});
  credit_payments.belongsTo(profiles, { as: "user", foreignKey: "user_id"});
  profiles.hasMany(credit_payments, { as: "credit_payments", foreignKey: "user_id"});
  credit_transactions.belongsTo(profiles, { as: "user", foreignKey: "user_id"});
  profiles.hasMany(credit_transactions, { as: "credit_transactions", foreignKey: "user_id"});
  credit_wallets.belongsTo(profiles, { as: "user", foreignKey: "user_id"});
  profiles.hasOne(credit_wallets, { as: "credit_wallet", foreignKey: "user_id"});
  customer_assignments.belongsTo(profiles, { as: "customer", foreignKey: "customer_id"});
  profiles.hasOne(customer_assignments, { as: "customer_assignment", foreignKey: "customer_id"});
  quotations.belongsTo(profiles, { as: "customer", foreignKey: "customer_id"});
  profiles.hasMany(quotations, { as: "quotations", foreignKey: "customer_id"});
  quotation_events.belongsTo(quotations, { as: "quotation", foreignKey: "quotation_id"});
  quotations.hasMany(quotation_events, { as: "quotation_events", foreignKey: "quotation_id"});
  quotation_items.belongsTo(quotations, { as: "quotation", foreignKey: "quotation_id"});
  quotations.hasMany(quotation_items, { as: "quotation_items", foreignKey: "quotation_id"});
  customer_assignments.belongsTo(salesmen, { as: "salesman", foreignKey: "salesman_id"});
  salesmen.hasMany(customer_assignments, { as: "customer_assignments", foreignKey: "salesman_id"});
  special_offer_brands.belongsTo(special_offers, { as: "offer", foreignKey: "offer_id"});
  special_offers.hasMany(special_offer_brands, { as: "special_offer_brands", foreignKey: "offer_id"});
  special_offer_categories.belongsTo(special_offers, { as: "offer", foreignKey: "offer_id"});
  special_offers.hasMany(special_offer_categories, { as: "special_offer_categories", foreignKey: "offer_id"});
  special_offer_products.belongsTo(special_offers, { as: "offer", foreignKey: "offer_id"});
  special_offers.hasMany(special_offer_products, { as: "special_offer_products", foreignKey: "offer_id"});
  admin_notification_reads.belongsTo(users, { as: "admin", foreignKey: "admin_id"});
  users.hasMany(admin_notification_reads, { as: "admin_notification_reads", foreignKey: "admin_id"});
  admin_notifications.belongsTo(users, { as: "salesman", foreignKey: "salesman_id"});
  users.hasMany(admin_notifications, { as: "admin_notifications", foreignKey: "salesman_id"});
  ai_chat_events.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(ai_chat_events, { as: "ai_chat_events", foreignKey: "user_id"});
  ai_chat_threads.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(ai_chat_threads, { as: "ai_chat_threads", foreignKey: "user_id"});
  ai_leads.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(ai_leads, { as: "ai_leads", foreignKey: "user_id"});
  ai_prompt_revisions.belongsTo(users, { as: "updated_by_user", foreignKey: "updated_by"});
  users.hasMany(ai_prompt_revisions, { as: "ai_prompt_revisions", foreignKey: "updated_by"});
  ai_prompts.belongsTo(users, { as: "updated_by_user", foreignKey: "updated_by"});
  users.hasMany(ai_prompts, { as: "ai_prompts", foreignKey: "updated_by"});
  ai_vip_numbers.belongsTo(users, { as: "created_by_user", foreignKey: "created_by"});
  users.hasMany(ai_vip_numbers, { as: "ai_vip_numbers", foreignKey: "created_by"});
  cart_items.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(cart_items, { as: "cart_items", foreignKey: "user_id"});
  contacts.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(contacts, { as: "contacts", foreignKey: "user_id"});
  csv_imports.belongsTo(users, { as: "created_by_user", foreignKey: "created_by"});
  users.hasMany(csv_imports, { as: "csv_imports", foreignKey: "created_by"});
  garages.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(garages, { as: "garages", foreignKey: "user_id"});
  order_events.belongsTo(users, { as: "created_by_user", foreignKey: "created_by"});
  users.hasMany(order_events, { as: "order_events", foreignKey: "created_by"});
  profiles.belongsTo(users, { as: "id_user", foreignKey: "id"});
  users.hasOne(profiles, { as: "profile", foreignKey: "id"});
  quotation_events.belongsTo(users, { as: "actor", foreignKey: "actor_id"});
  users.hasMany(quotation_events, { as: "quotation_events", foreignKey: "actor_id"});
  quotations.belongsTo(users, { as: "created_by_user", foreignKey: "created_by"});
  users.hasMany(quotations, { as: "quotations", foreignKey: "created_by"});
  salesmen.belongsTo(users, { as: "id_user", foreignKey: "id"});
  users.hasOne(salesmen, { as: "salesmen", foreignKey: "id"});
  special_offers.belongsTo(users, { as: "created_by_user", foreignKey: "created_by"});
  users.hasMany(special_offers, { as: "special_offers", foreignKey: "created_by"});
  stock_movements.belongsTo(users, { as: "created_by_user", foreignKey: "created_by"});
  users.hasMany(stock_movements, { as: "stock_movements", foreignKey: "created_by"});
  user_login_history.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_login_history, { as: "user_login_histories", foreignKey: "user_id"});
  user_roles.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_roles, { as: "user_roles", foreignKey: "user_id"});
  wishlist_items.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(wishlist_items, { as: "wishlist_items", foreignKey: "user_id"});
  stock_levels.belongsTo(warehouses, { as: "warehouse", foreignKey: "warehouse_id"});
  warehouses.hasMany(stock_levels, { as: "stock_levels", foreignKey: "warehouse_id"});
  stock_movements.belongsTo(warehouses, { as: "to_warehouse", foreignKey: "to_warehouse_id"});
  warehouses.hasMany(stock_movements, { as: "stock_movements", foreignKey: "to_warehouse_id"});
  stock_movements.belongsTo(warehouses, { as: "warehouse", foreignKey: "warehouse_id"});
  warehouses.hasMany(stock_movements, { as: "warehouse_stock_movements", foreignKey: "warehouse_id"});

  return {
    addresses: addresses,
    admin_notification_reads: admin_notification_reads,
    admin_notifications: admin_notifications,
    ai_chat_events: ai_chat_events,
    ai_chat_messages: ai_chat_messages,
    ai_chat_threads: ai_chat_threads,
    ai_leads: ai_leads,
    ai_prompt_revisions: ai_prompt_revisions,
    ai_prompts: ai_prompts,
    ai_vip_numbers: ai_vip_numbers,
    alternative_parts: alternative_parts,
    audit_logs: audit_logs,
    avatar_providers: avatar_providers,
    brands: brands,
    cart_items: cart_items,
    categories: categories,
    cms_pages: cms_pages,
    contacts: contacts,
    coupons: coupons,
    credit_billing_statements: credit_billing_statements,
    credit_payments: credit_payments,
    credit_transactions: credit_transactions,
    credit_wallets: credit_wallets,
    csv_imports: csv_imports,
    customer_activities: customer_activities,
    customer_assignments: customer_assignments,
    customer_followups: customer_followups,
    customer_notes: customer_notes,
    diagram_hotspots: diagram_hotspots,
    diagrams: diagrams,
    engines: engines,
    garages: garages,
    hero_banners: hero_banners,
    model_years: model_years,
    models: models,
    objects: objects,
    order_events: order_events,
    order_items: order_items,
    orders: orders,
    part_compatibility: part_compatibility,
    parts: parts,
    payment_settings: payment_settings,
    profiles: profiles,
    promo_sections: promo_sections,
    quotation_events: quotation_events,
    quotation_items: quotation_items,
    quotations: quotations,
    recently_viewed: recently_viewed,
    salesmen: salesmen,
    shipping_zones: shipping_zones,
    site_settings: site_settings,
    special_offer_brands: special_offer_brands,
    special_offer_categories: special_offer_categories,
    special_offer_products: special_offer_products,
    special_offers: special_offers,
    stock_levels: stock_levels,
    stock_movements: stock_movements,
    synonyms: synonyms,
    testimonials: testimonials,
    user_login_history: user_login_history,
    user_roles: user_roles,
    users: users,
    vin_decode_cache: vin_decode_cache,
    wa_analytics_events: wa_analytics_events,
    wa_chat_logs: wa_chat_logs,
    warehouses: warehouses,
    wishlist_items: wishlist_items,
  };
}
