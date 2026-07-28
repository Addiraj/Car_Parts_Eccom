import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { brands, brandsId } from './brands';
import type { special_offers, special_offersId } from './special_offers';

export interface special_offer_brandsAttributes {
  id: string;
  offer_id: string;
  brand_id: string;
}

export type special_offer_brandsPk = "id";
export type special_offer_brandsId = special_offer_brands[special_offer_brandsPk];
export type special_offer_brandsOptionalAttributes = "id";
export type special_offer_brandsCreationAttributes = Optional<special_offer_brandsAttributes, special_offer_brandsOptionalAttributes>;

export class special_offer_brands extends Model<special_offer_brandsAttributes, special_offer_brandsCreationAttributes> implements special_offer_brandsAttributes {
  id!: string;
  offer_id!: string;
  brand_id!: string;

  // special_offer_brands belongsTo brands via brand_id
  brand!: brands;
  getBrand!: Sequelize.BelongsToGetAssociationMixin<brands>;
  setBrand!: Sequelize.BelongsToSetAssociationMixin<brands, brandsId>;
  createBrand!: Sequelize.BelongsToCreateAssociationMixin<brands>;
  // special_offer_brands belongsTo special_offers via offer_id
  offer!: special_offers;
  getOffer!: Sequelize.BelongsToGetAssociationMixin<special_offers>;
  setOffer!: Sequelize.BelongsToSetAssociationMixin<special_offers, special_offersId>;
  createOffer!: Sequelize.BelongsToCreateAssociationMixin<special_offers>;

  static initModel(sequelize: Sequelize.Sequelize): typeof special_offer_brands {
    return special_offer_brands.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    offer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'special_offers',
        key: 'id'
      },
      unique: "special_offer_brands_offer_id_brand_id_key"
    },
    brand_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'brands',
        key: 'id'
      },
      unique: "special_offer_brands_offer_id_brand_id_key"
    }
  }, {
    sequelize,
    tableName: 'special_offer_brands',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "sob_brand_idx",
        fields: [
          { name: "brand_id" },
        ]
      },
      {
        name: "sob_offer_idx",
        fields: [
          { name: "offer_id" },
        ]
      },
      {
        name: "special_offer_brands_offer_id_brand_id_key",
        unique: true,
        fields: [
          { name: "offer_id" },
          { name: "brand_id" },
        ]
      },
      {
        name: "special_offer_brands_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
