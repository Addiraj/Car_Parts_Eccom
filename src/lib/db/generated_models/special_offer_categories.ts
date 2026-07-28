import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { categories, categoriesId } from './categories';
import type { special_offers, special_offersId } from './special_offers';

export interface special_offer_categoriesAttributes {
  id: string;
  offer_id: string;
  category_id: string;
}

export type special_offer_categoriesPk = "id";
export type special_offer_categoriesId = special_offer_categories[special_offer_categoriesPk];
export type special_offer_categoriesOptionalAttributes = "id";
export type special_offer_categoriesCreationAttributes = Optional<special_offer_categoriesAttributes, special_offer_categoriesOptionalAttributes>;

export class special_offer_categories extends Model<special_offer_categoriesAttributes, special_offer_categoriesCreationAttributes> implements special_offer_categoriesAttributes {
  id!: string;
  offer_id!: string;
  category_id!: string;

  // special_offer_categories belongsTo categories via category_id
  category!: categories;
  getCategory!: Sequelize.BelongsToGetAssociationMixin<categories>;
  setCategory!: Sequelize.BelongsToSetAssociationMixin<categories, categoriesId>;
  createCategory!: Sequelize.BelongsToCreateAssociationMixin<categories>;
  // special_offer_categories belongsTo special_offers via offer_id
  offer!: special_offers;
  getOffer!: Sequelize.BelongsToGetAssociationMixin<special_offers>;
  setOffer!: Sequelize.BelongsToSetAssociationMixin<special_offers, special_offersId>;
  createOffer!: Sequelize.BelongsToCreateAssociationMixin<special_offers>;

  static initModel(sequelize: Sequelize.Sequelize): typeof special_offer_categories {
    return special_offer_categories.init({
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
      unique: "special_offer_categories_offer_id_category_id_key"
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      },
      unique: "special_offer_categories_offer_id_category_id_key"
    }
  }, {
    sequelize,
    tableName: 'special_offer_categories',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "soc_category_idx",
        fields: [
          { name: "category_id" },
        ]
      },
      {
        name: "soc_offer_idx",
        fields: [
          { name: "offer_id" },
        ]
      },
      {
        name: "special_offer_categories_offer_id_category_id_key",
        unique: true,
        fields: [
          { name: "offer_id" },
          { name: "category_id" },
        ]
      },
      {
        name: "special_offer_categories_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
