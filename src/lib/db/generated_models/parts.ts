import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { alternative_parts, alternative_partsId } from './alternative_parts';
import type { brands, brandsId } from './brands';
import type { cart_items, cart_itemsId } from './cart_items';
import type { categories, categoriesId } from './categories';
import type { diagram_hotspots, diagram_hotspotsId } from './diagram_hotspots';
import type { part_compatibility, part_compatibilityId } from './part_compatibility';
import type { quotation_items, quotation_itemsId } from './quotation_items';
import type { special_offer_products, special_offer_productsId } from './special_offer_products';
import type { stock_levels, stock_levelsId } from './stock_levels';
import type { stock_movements, stock_movementsId } from './stock_movements';
import type { wishlist_items, wishlist_itemsId } from './wishlist_items';

export interface partsAttributes {
  id: string;
  part_number: string;
  oem_number?: string;
  name: string;
  description?: string;
  specs: object;
  price: number;
  currency: string;
  stock: number;
  brand_id?: string;
  manufacturer?: string;
  is_oem: boolean;
  category_id?: string;
  images: string[];
  search_vec?: any;
  created_at: Date;
  updated_at: Date;
  category_tag?: string;
  ind_price?: number;
  gar_price?: number;
  export_price?: number;
  low_stock_threshold: number;
}

export type partsPk = "id";
export type partsId = parts[partsPk];
export type partsOptionalAttributes = "id" | "oem_number" | "description" | "specs" | "price" | "currency" | "stock" | "brand_id" | "manufacturer" | "is_oem" | "category_id" | "images" | "search_vec" | "created_at" | "updated_at" | "category_tag" | "ind_price" | "gar_price" | "export_price" | "low_stock_threshold";
export type partsCreationAttributes = Optional<partsAttributes, partsOptionalAttributes>;

export class parts extends Model<partsAttributes, partsCreationAttributes> implements partsAttributes {
  id!: string;
  part_number!: string;
  oem_number?: string;
  name!: string;
  description?: string;
  specs!: object;
  price!: number;
  currency!: string;
  stock!: number;
  brand_id?: string;
  manufacturer?: string;
  is_oem!: boolean;
  category_id?: string;
  images!: string[];
  search_vec?: any;
  created_at!: Date;
  updated_at!: Date;
  category_tag?: string;
  ind_price?: number;
  gar_price?: number;
  export_price?: number;
  low_stock_threshold!: number;

  // parts belongsTo brands via brand_id
  brand!: brands;
  getBrand!: Sequelize.BelongsToGetAssociationMixin<brands>;
  setBrand!: Sequelize.BelongsToSetAssociationMixin<brands, brandsId>;
  createBrand!: Sequelize.BelongsToCreateAssociationMixin<brands>;
  // parts belongsTo categories via category_id
  category!: categories;
  getCategory!: Sequelize.BelongsToGetAssociationMixin<categories>;
  setCategory!: Sequelize.BelongsToSetAssociationMixin<categories, categoriesId>;
  createCategory!: Sequelize.BelongsToCreateAssociationMixin<categories>;
  // parts hasMany alternative_parts via alternative_part_id
  alternative_parts!: alternative_parts[];
  getAlternative_parts!: Sequelize.HasManyGetAssociationsMixin<alternative_parts>;
  setAlternative_parts!: Sequelize.HasManySetAssociationsMixin<alternative_parts, alternative_partsId>;
  addAlternative_part!: Sequelize.HasManyAddAssociationMixin<alternative_parts, alternative_partsId>;
  addAlternative_parts!: Sequelize.HasManyAddAssociationsMixin<alternative_parts, alternative_partsId>;
  createAlternative_part!: Sequelize.HasManyCreateAssociationMixin<alternative_parts>;
  removeAlternative_part!: Sequelize.HasManyRemoveAssociationMixin<alternative_parts, alternative_partsId>;
  removeAlternative_parts!: Sequelize.HasManyRemoveAssociationsMixin<alternative_parts, alternative_partsId>;
  hasAlternative_part!: Sequelize.HasManyHasAssociationMixin<alternative_parts, alternative_partsId>;
  hasAlternative_parts!: Sequelize.HasManyHasAssociationsMixin<alternative_parts, alternative_partsId>;
  countAlternative_parts!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany alternative_parts via part_id
  part_alternative_parts!: alternative_parts[];
  getPart_alternative_parts!: Sequelize.HasManyGetAssociationsMixin<alternative_parts>;
  setPart_alternative_parts!: Sequelize.HasManySetAssociationsMixin<alternative_parts, alternative_partsId>;
  addPart_alternative_part!: Sequelize.HasManyAddAssociationMixin<alternative_parts, alternative_partsId>;
  addPart_alternative_parts!: Sequelize.HasManyAddAssociationsMixin<alternative_parts, alternative_partsId>;
  createPart_alternative_part!: Sequelize.HasManyCreateAssociationMixin<alternative_parts>;
  removePart_alternative_part!: Sequelize.HasManyRemoveAssociationMixin<alternative_parts, alternative_partsId>;
  removePart_alternative_parts!: Sequelize.HasManyRemoveAssociationsMixin<alternative_parts, alternative_partsId>;
  hasPart_alternative_part!: Sequelize.HasManyHasAssociationMixin<alternative_parts, alternative_partsId>;
  hasPart_alternative_parts!: Sequelize.HasManyHasAssociationsMixin<alternative_parts, alternative_partsId>;
  countPart_alternative_parts!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany cart_items via part_id
  cart_items!: cart_items[];
  getCart_items!: Sequelize.HasManyGetAssociationsMixin<cart_items>;
  setCart_items!: Sequelize.HasManySetAssociationsMixin<cart_items, cart_itemsId>;
  addCart_item!: Sequelize.HasManyAddAssociationMixin<cart_items, cart_itemsId>;
  addCart_items!: Sequelize.HasManyAddAssociationsMixin<cart_items, cart_itemsId>;
  createCart_item!: Sequelize.HasManyCreateAssociationMixin<cart_items>;
  removeCart_item!: Sequelize.HasManyRemoveAssociationMixin<cart_items, cart_itemsId>;
  removeCart_items!: Sequelize.HasManyRemoveAssociationsMixin<cart_items, cart_itemsId>;
  hasCart_item!: Sequelize.HasManyHasAssociationMixin<cart_items, cart_itemsId>;
  hasCart_items!: Sequelize.HasManyHasAssociationsMixin<cart_items, cart_itemsId>;
  countCart_items!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany diagram_hotspots via part_id
  diagram_hotspots!: diagram_hotspots[];
  getDiagram_hotspots!: Sequelize.HasManyGetAssociationsMixin<diagram_hotspots>;
  setDiagram_hotspots!: Sequelize.HasManySetAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  addDiagram_hotspot!: Sequelize.HasManyAddAssociationMixin<diagram_hotspots, diagram_hotspotsId>;
  addDiagram_hotspots!: Sequelize.HasManyAddAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  createDiagram_hotspot!: Sequelize.HasManyCreateAssociationMixin<diagram_hotspots>;
  removeDiagram_hotspot!: Sequelize.HasManyRemoveAssociationMixin<diagram_hotspots, diagram_hotspotsId>;
  removeDiagram_hotspots!: Sequelize.HasManyRemoveAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  hasDiagram_hotspot!: Sequelize.HasManyHasAssociationMixin<diagram_hotspots, diagram_hotspotsId>;
  hasDiagram_hotspots!: Sequelize.HasManyHasAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  countDiagram_hotspots!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany part_compatibility via part_id
  part_compatibilities!: part_compatibility[];
  getPart_compatibilities!: Sequelize.HasManyGetAssociationsMixin<part_compatibility>;
  setPart_compatibilities!: Sequelize.HasManySetAssociationsMixin<part_compatibility, part_compatibilityId>;
  addPart_compatibility!: Sequelize.HasManyAddAssociationMixin<part_compatibility, part_compatibilityId>;
  addPart_compatibilities!: Sequelize.HasManyAddAssociationsMixin<part_compatibility, part_compatibilityId>;
  createPart_compatibility!: Sequelize.HasManyCreateAssociationMixin<part_compatibility>;
  removePart_compatibility!: Sequelize.HasManyRemoveAssociationMixin<part_compatibility, part_compatibilityId>;
  removePart_compatibilities!: Sequelize.HasManyRemoveAssociationsMixin<part_compatibility, part_compatibilityId>;
  hasPart_compatibility!: Sequelize.HasManyHasAssociationMixin<part_compatibility, part_compatibilityId>;
  hasPart_compatibilities!: Sequelize.HasManyHasAssociationsMixin<part_compatibility, part_compatibilityId>;
  countPart_compatibilities!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany quotation_items via part_id
  quotation_items!: quotation_items[];
  getQuotation_items!: Sequelize.HasManyGetAssociationsMixin<quotation_items>;
  setQuotation_items!: Sequelize.HasManySetAssociationsMixin<quotation_items, quotation_itemsId>;
  addQuotation_item!: Sequelize.HasManyAddAssociationMixin<quotation_items, quotation_itemsId>;
  addQuotation_items!: Sequelize.HasManyAddAssociationsMixin<quotation_items, quotation_itemsId>;
  createQuotation_item!: Sequelize.HasManyCreateAssociationMixin<quotation_items>;
  removeQuotation_item!: Sequelize.HasManyRemoveAssociationMixin<quotation_items, quotation_itemsId>;
  removeQuotation_items!: Sequelize.HasManyRemoveAssociationsMixin<quotation_items, quotation_itemsId>;
  hasQuotation_item!: Sequelize.HasManyHasAssociationMixin<quotation_items, quotation_itemsId>;
  hasQuotation_items!: Sequelize.HasManyHasAssociationsMixin<quotation_items, quotation_itemsId>;
  countQuotation_items!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany special_offer_products via part_id
  special_offer_products!: special_offer_products[];
  getSpecial_offer_products!: Sequelize.HasManyGetAssociationsMixin<special_offer_products>;
  setSpecial_offer_products!: Sequelize.HasManySetAssociationsMixin<special_offer_products, special_offer_productsId>;
  addSpecial_offer_product!: Sequelize.HasManyAddAssociationMixin<special_offer_products, special_offer_productsId>;
  addSpecial_offer_products!: Sequelize.HasManyAddAssociationsMixin<special_offer_products, special_offer_productsId>;
  createSpecial_offer_product!: Sequelize.HasManyCreateAssociationMixin<special_offer_products>;
  removeSpecial_offer_product!: Sequelize.HasManyRemoveAssociationMixin<special_offer_products, special_offer_productsId>;
  removeSpecial_offer_products!: Sequelize.HasManyRemoveAssociationsMixin<special_offer_products, special_offer_productsId>;
  hasSpecial_offer_product!: Sequelize.HasManyHasAssociationMixin<special_offer_products, special_offer_productsId>;
  hasSpecial_offer_products!: Sequelize.HasManyHasAssociationsMixin<special_offer_products, special_offer_productsId>;
  countSpecial_offer_products!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany stock_levels via part_id
  stock_levels!: stock_levels[];
  getStock_levels!: Sequelize.HasManyGetAssociationsMixin<stock_levels>;
  setStock_levels!: Sequelize.HasManySetAssociationsMixin<stock_levels, stock_levelsId>;
  addStock_level!: Sequelize.HasManyAddAssociationMixin<stock_levels, stock_levelsId>;
  addStock_levels!: Sequelize.HasManyAddAssociationsMixin<stock_levels, stock_levelsId>;
  createStock_level!: Sequelize.HasManyCreateAssociationMixin<stock_levels>;
  removeStock_level!: Sequelize.HasManyRemoveAssociationMixin<stock_levels, stock_levelsId>;
  removeStock_levels!: Sequelize.HasManyRemoveAssociationsMixin<stock_levels, stock_levelsId>;
  hasStock_level!: Sequelize.HasManyHasAssociationMixin<stock_levels, stock_levelsId>;
  hasStock_levels!: Sequelize.HasManyHasAssociationsMixin<stock_levels, stock_levelsId>;
  countStock_levels!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany stock_movements via part_id
  stock_movements!: stock_movements[];
  getStock_movements!: Sequelize.HasManyGetAssociationsMixin<stock_movements>;
  setStock_movements!: Sequelize.HasManySetAssociationsMixin<stock_movements, stock_movementsId>;
  addStock_movement!: Sequelize.HasManyAddAssociationMixin<stock_movements, stock_movementsId>;
  addStock_movements!: Sequelize.HasManyAddAssociationsMixin<stock_movements, stock_movementsId>;
  createStock_movement!: Sequelize.HasManyCreateAssociationMixin<stock_movements>;
  removeStock_movement!: Sequelize.HasManyRemoveAssociationMixin<stock_movements, stock_movementsId>;
  removeStock_movements!: Sequelize.HasManyRemoveAssociationsMixin<stock_movements, stock_movementsId>;
  hasStock_movement!: Sequelize.HasManyHasAssociationMixin<stock_movements, stock_movementsId>;
  hasStock_movements!: Sequelize.HasManyHasAssociationsMixin<stock_movements, stock_movementsId>;
  countStock_movements!: Sequelize.HasManyCountAssociationsMixin;
  // parts hasMany wishlist_items via part_id
  wishlist_items!: wishlist_items[];
  getWishlist_items!: Sequelize.HasManyGetAssociationsMixin<wishlist_items>;
  setWishlist_items!: Sequelize.HasManySetAssociationsMixin<wishlist_items, wishlist_itemsId>;
  addWishlist_item!: Sequelize.HasManyAddAssociationMixin<wishlist_items, wishlist_itemsId>;
  addWishlist_items!: Sequelize.HasManyAddAssociationsMixin<wishlist_items, wishlist_itemsId>;
  createWishlist_item!: Sequelize.HasManyCreateAssociationMixin<wishlist_items>;
  removeWishlist_item!: Sequelize.HasManyRemoveAssociationMixin<wishlist_items, wishlist_itemsId>;
  removeWishlist_items!: Sequelize.HasManyRemoveAssociationsMixin<wishlist_items, wishlist_itemsId>;
  hasWishlist_item!: Sequelize.HasManyHasAssociationMixin<wishlist_items, wishlist_itemsId>;
  hasWishlist_items!: Sequelize.HasManyHasAssociationsMixin<wishlist_items, wishlist_itemsId>;
  countWishlist_items!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof parts {
    return parts.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    part_number: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    oem_number: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    specs: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "AED"
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    brand_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'brands',
        key: 'id'
      }
    },
    manufacturer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_oem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: []
    },
    search_vec: {
      type: "TSVECTOR",
      allowNull: true
    },
    category_tag: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ind_price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    gar_price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    export_price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    }
  }, {
    sequelize,
    tableName: 'parts',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "parts_brand_id_idx",
        fields: [
          { name: "brand_id" },
        ]
      },
      {
        name: "parts_category_id_idx",
        fields: [
          { name: "category_id" },
        ]
      },
      {
        name: "parts_category_tag_idx",
        fields: [
          { name: "category_tag" },
        ]
      },
      {
        name: "parts_created_at_idx",
        fields: [
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "parts_name_trgm",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "parts_name_trgm_idx",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "parts_oem_number_trgm",
        fields: [
          { name: "oem_number" },
        ]
      },
      {
        name: "parts_oem_trgm_idx",
        fields: [
          { name: "oem_number" },
        ]
      },
      {
        name: "parts_part_number_trgm",
        fields: [
          { name: "part_number" },
        ]
      },
      {
        name: "parts_part_number_uq",
        unique: true,
        fields: [
          { name: "part_number" },
        ]
      },
      {
        name: "parts_partnum_trgm_idx",
        fields: [
          { name: "part_number" },
        ]
      },
      {
        name: "parts_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "parts_search_vec_idx",
        fields: [
          { name: "search_vec" },
        ]
      },
    ]
  });
  }
}
