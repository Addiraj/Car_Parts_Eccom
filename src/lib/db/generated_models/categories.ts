import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { diagrams, diagramsId } from './diagrams';
import type { parts, partsId } from './parts';
import type { special_offer_categories, special_offer_categoriesId } from './special_offer_categories';

export interface categoriesAttributes {
  id: string;
  parent_id?: string;
  slug: string;
  name: string;
  icon?: string;
  display_order: number;
}

export type categoriesPk = "id";
export type categoriesId = categories[categoriesPk];
export type categoriesOptionalAttributes = "id" | "parent_id" | "icon" | "display_order";
export type categoriesCreationAttributes = Optional<categoriesAttributes, categoriesOptionalAttributes>;

export class categories extends Model<categoriesAttributes, categoriesCreationAttributes> implements categoriesAttributes {
  id!: string;
  parent_id?: string;
  slug!: string;
  name!: string;
  icon?: string;
  display_order!: number;

  // categories belongsTo categories via parent_id
  parent!: categories;
  getParent!: Sequelize.BelongsToGetAssociationMixin<categories>;
  setParent!: Sequelize.BelongsToSetAssociationMixin<categories, categoriesId>;
  createParent!: Sequelize.BelongsToCreateAssociationMixin<categories>;
  // categories hasMany diagrams via category_id
  diagrams!: diagrams[];
  getDiagrams!: Sequelize.HasManyGetAssociationsMixin<diagrams>;
  setDiagrams!: Sequelize.HasManySetAssociationsMixin<diagrams, diagramsId>;
  addDiagram!: Sequelize.HasManyAddAssociationMixin<diagrams, diagramsId>;
  addDiagrams!: Sequelize.HasManyAddAssociationsMixin<diagrams, diagramsId>;
  createDiagram!: Sequelize.HasManyCreateAssociationMixin<diagrams>;
  removeDiagram!: Sequelize.HasManyRemoveAssociationMixin<diagrams, diagramsId>;
  removeDiagrams!: Sequelize.HasManyRemoveAssociationsMixin<diagrams, diagramsId>;
  hasDiagram!: Sequelize.HasManyHasAssociationMixin<diagrams, diagramsId>;
  hasDiagrams!: Sequelize.HasManyHasAssociationsMixin<diagrams, diagramsId>;
  countDiagrams!: Sequelize.HasManyCountAssociationsMixin;
  // categories hasMany parts via category_id
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
  // categories hasMany special_offer_categories via category_id
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

  static initModel(sequelize: Sequelize.Sequelize): typeof categories {
    return categories.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      unique: "categories_parent_id_slug_key"
    },
    slug: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "categories_parent_id_slug_key"
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    icon: {
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
    tableName: 'categories',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "categories_parent_id_idx",
        fields: [
          { name: "parent_id" },
        ]
      },
      {
        name: "categories_parent_id_slug_key",
        unique: true,
        fields: [
          { name: "parent_id" },
          { name: "slug" },
        ]
      },
      {
        name: "categories_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
