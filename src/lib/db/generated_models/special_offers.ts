import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { special_offer_brands, special_offer_brandsId } from './special_offer_brands';
import type { special_offer_categories, special_offer_categoriesId } from './special_offer_categories';
import type { special_offer_products, special_offer_productsId } from './special_offer_products';
import type { users, usersId } from './users';

export interface special_offersAttributes {
  id: string;
  offer_name: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_date: Date;
  end_date: Date;
  status: "active" | "scheduled" | "expired" | "disabled";
  max_discount_amount?: number;
  min_order_value?: number;
  allow_stacking: boolean;
  eligible_customer_types: string[];
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export type special_offersPk = "id";
export type special_offersId = special_offers[special_offersPk];
export type special_offersOptionalAttributes = "id" | "description" | "status" | "max_discount_amount" | "min_order_value" | "eligible_customer_types" | "created_by" | "created_at" | "updated_at";
export type special_offersCreationAttributes = Optional<special_offersAttributes, special_offersOptionalAttributes>;

export class special_offers extends Model<special_offersAttributes, special_offersCreationAttributes> implements special_offersAttributes {
  id!: string;
  offer_name!: string;
  description?: string;
  discount_type!: "percentage" | "fixed";
  discount_value!: number;
  start_date!: Date;
  end_date!: Date;
  status!: "active" | "scheduled" | "expired" | "disabled";
  max_discount_amount?: number;
  min_order_value?: number;
  allow_stacking!: boolean;
  eligible_customer_types!: string[];
  created_by?: string;
  created_at!: Date;
  updated_at!: Date;

  // special_offers hasMany special_offer_brands via offer_id
  special_offer_brands!: special_offer_brands[];
  getSpecial_offer_brands!: Sequelize.HasManyGetAssociationsMixin<special_offer_brands>;
  setSpecial_offer_brands!: Sequelize.HasManySetAssociationsMixin<special_offer_brands, special_offer_brandsId>;
  addSpecial_offer_brand!: Sequelize.HasManyAddAssociationMixin<special_offer_brands, special_offer_brandsId>;
  addSpecial_offer_brands!: Sequelize.HasManyAddAssociationsMixin<special_offer_brands, special_offer_brandsId>;
  createSpecial_offer_brand!: Sequelize.HasManyCreateAssociationMixin<special_offer_brands>;
  removeSpecial_offer_brand!: Sequelize.HasManyRemoveAssociationMixin<special_offer_brands, special_offer_brandsId>;
  removeSpecial_offer_brands!: Sequelize.HasManyRemoveAssociationsMixin<special_offer_brands, special_offer_brandsId>;
  hasSpecial_offer_brand!: Sequelize.HasManyHasAssociationMixin<special_offer_brands, special_offer_brandsId>;
  hasSpecial_offer_brands!: Sequelize.HasManyHasAssociationsMixin<special_offer_brands, special_offer_brandsId>;
  countSpecial_offer_brands!: Sequelize.HasManyCountAssociationsMixin;
  // special_offers hasMany special_offer_categories via offer_id
  special_offer_categories!: special_offer_categories[];
  getSpecial_offer_categories!: Sequelize.HasManyGetAssociationsMixin<special_offer_categories>;
  setSpecial_offer_categories!: Sequelize.HasManySetAssociationsMixin<special_offer_categories, special_offer_categoriesId>;
  addSpecial_offer_category!: Sequelize.HasManyAddAssociationMixin<special_offer_categories, special_offer_categoriesId>;
  addSpecial_offer_categories!: Sequelize.HasManyAddAssociationsMixin<special_offer_categories, special_offer_categoriesId>;
  createSpecial_offer_category!: Sequelize.HasManyCreateAssociationMixin<special_offer_categories>;
  removeSpecial_offer_category!: Sequelize.HasManyRemoveAssociationMixin<special_offer_categories, special_offer_categoriesId>;
  removeSpecial_offer_categories!: Sequelize.HasManyRemoveAssociationsMixin<special_offer_categories, special_offer_categoriesId>;
  hasSpecial_offer_category!: Sequelize.HasManyHasAssociationMixin<special_offer_categories, special_offer_categoriesId>;
  hasSpecial_offer_categories!: Sequelize.HasManyHasAssociationsMixin<special_offer_categories, special_offer_categoriesId>;
  countSpecial_offer_categories!: Sequelize.HasManyCountAssociationsMixin;
  // special_offers hasMany special_offer_products via offer_id
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
  // special_offers belongsTo users via created_by
  created_by_user!: users;
  getCreated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setCreated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createCreated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof special_offers {
    return special_offers.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    offer_name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discount_type: {
      type: DataTypes.ENUM("percentage","fixed"),
      allowNull: false
    },
    discount_value: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("active","scheduled","expired","disabled"),
      allowNull: false,
      defaultValue: "scheduled"
    },
    max_discount_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    min_order_value: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    allow_stacking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    eligible_customer_types: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: ["ARRAY[IND"]
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'special_offers',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "special_offers_dates_idx",
        fields: [
          { name: "start_date" },
          { name: "end_date" },
        ]
      },
      {
        name: "special_offers_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "special_offers_status_idx",
        fields: [
          { name: "status" },
        ]
      },
    ]
  });
  }
}
