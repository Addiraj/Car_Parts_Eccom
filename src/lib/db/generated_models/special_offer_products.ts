import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { parts, partsId } from './parts';
import type { special_offers, special_offersId } from './special_offers';

export interface special_offer_productsAttributes {
  id: string;
  offer_id: string;
  part_id: string;
}

export type special_offer_productsPk = "id";
export type special_offer_productsId = special_offer_products[special_offer_productsPk];
export type special_offer_productsOptionalAttributes = "id";
export type special_offer_productsCreationAttributes = Optional<special_offer_productsAttributes, special_offer_productsOptionalAttributes>;

export class special_offer_products extends Model<special_offer_productsAttributes, special_offer_productsCreationAttributes> implements special_offer_productsAttributes {
  id!: string;
  offer_id!: string;
  part_id!: string;

  // special_offer_products belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;
  // special_offer_products belongsTo special_offers via offer_id
  offer!: special_offers;
  getOffer!: Sequelize.BelongsToGetAssociationMixin<special_offers>;
  setOffer!: Sequelize.BelongsToSetAssociationMixin<special_offers, special_offersId>;
  createOffer!: Sequelize.BelongsToCreateAssociationMixin<special_offers>;

  static initModel(sequelize: Sequelize.Sequelize): typeof special_offer_products {
    return special_offer_products.init({
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
      unique: "special_offer_products_offer_id_part_id_key"
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      },
      unique: "special_offer_products_offer_id_part_id_key"
    }
  }, {
    sequelize,
    tableName: 'special_offer_products',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "sop_offer_idx",
        fields: [
          { name: "offer_id" },
        ]
      },
      {
        name: "sop_part_idx",
        fields: [
          { name: "part_id" },
        ]
      },
      {
        name: "special_offer_products_offer_id_part_id_key",
        unique: true,
        fields: [
          { name: "offer_id" },
          { name: "part_id" },
        ]
      },
      {
        name: "special_offer_products_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
