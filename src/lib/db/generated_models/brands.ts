import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { garages, garagesId } from './garages';
import type { models, modelsId } from './models';
import type { parts, partsId } from './parts';
import type { special_offer_brands, special_offer_brandsId } from './special_offer_brands';

export interface brandsAttributes {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  country?: string;
  display_order: number;
  created_at: Date;
}

export type brandsPk = "id";
export type brandsId = brands[brandsPk];
export type brandsOptionalAttributes = "id" | "logo_url" | "country" | "display_order" | "created_at";
export type brandsCreationAttributes = Optional<brandsAttributes, brandsOptionalAttributes>;

export class brands extends Model<brandsAttributes, brandsCreationAttributes> implements brandsAttributes {
  id!: string;
  slug!: string;
  name!: string;
  logo_url?: string;
  country?: string;
  display_order!: number;
  created_at!: Date;

  // brands hasMany garages via brand_id
  garages!: garages[];
  getGarages!: Sequelize.HasManyGetAssociationsMixin<garages>;
  setGarages!: Sequelize.HasManySetAssociationsMixin<garages, garagesId>;
  addGarage!: Sequelize.HasManyAddAssociationMixin<garages, garagesId>;
  addGarages!: Sequelize.HasManyAddAssociationsMixin<garages, garagesId>;
  createGarage!: Sequelize.HasManyCreateAssociationMixin<garages>;
  removeGarage!: Sequelize.HasManyRemoveAssociationMixin<garages, garagesId>;
  removeGarages!: Sequelize.HasManyRemoveAssociationsMixin<garages, garagesId>;
  hasGarage!: Sequelize.HasManyHasAssociationMixin<garages, garagesId>;
  hasGarages!: Sequelize.HasManyHasAssociationsMixin<garages, garagesId>;
  countGarages!: Sequelize.HasManyCountAssociationsMixin;
  // brands hasMany models via brand_id
  models!: models[];
  getModels!: Sequelize.HasManyGetAssociationsMixin<models>;
  setModels!: Sequelize.HasManySetAssociationsMixin<models, modelsId>;
  addModel!: Sequelize.HasManyAddAssociationMixin<models, modelsId>;
  addModels!: Sequelize.HasManyAddAssociationsMixin<models, modelsId>;
  createModel!: Sequelize.HasManyCreateAssociationMixin<models>;
  removeModel!: Sequelize.HasManyRemoveAssociationMixin<models, modelsId>;
  removeModels!: Sequelize.HasManyRemoveAssociationsMixin<models, modelsId>;
  hasModel!: Sequelize.HasManyHasAssociationMixin<models, modelsId>;
  hasModels!: Sequelize.HasManyHasAssociationsMixin<models, modelsId>;
  countModels!: Sequelize.HasManyCountAssociationsMixin;
  // brands hasMany parts via brand_id
  parts!: parts[];
  getParts!: Sequelize.HasManyGetAssociationsMixin<parts>;
  setParts!: Sequelize.HasManySetAssociationsMixin<parts, partsId>;
  addPart!: Sequelize.HasManyAddAssociationMixin<parts, partsId>;
  addParts!: Sequelize.HasManyAddAssociationsMixin<parts, partsId>;
  createPart!: Sequelize.HasManyCreateAssociationMixin<parts>;
  removePart!: Sequelize.HasManyRemoveAssociationMixin<parts, partsId>;
  removeParts!: Sequelize.HasManyRemoveAssociationsMixin<parts, partsId>;
  hasPart!: Sequelize.HasManyHasAssociationMixin<parts, partsId>;
  hasParts!: Sequelize.HasManyHasAssociationsMixin<parts, partsId>;
  countParts!: Sequelize.HasManyCountAssociationsMixin;
  // brands hasMany special_offer_brands via brand_id
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

  static initModel(sequelize: Sequelize.Sequelize): typeof brands {
    return brands.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    slug: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "brands_slug_key"
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    logo_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    country: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'brands',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "brands_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "brands_slug_key",
        unique: true,
        fields: [
          { name: "slug" },
        ]
      },
    ]
  });
  }
}
