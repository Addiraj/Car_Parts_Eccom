import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { brands, brandsId } from './brands';
import type { garages, garagesId } from './garages';
import type { model_years, model_yearsId } from './model_years';

export interface modelsAttributes {
  id: string;
  brand_id: string;
  slug: string;
  name: string;
  image_url?: string;
  created_at: Date;
}

export type modelsPk = "id";
export type modelsId = models[modelsPk];
export type modelsOptionalAttributes = "id" | "image_url" | "created_at";
export type modelsCreationAttributes = Optional<modelsAttributes, modelsOptionalAttributes>;

export class models extends Model<modelsAttributes, modelsCreationAttributes> implements modelsAttributes {
  id!: string;
  brand_id!: string;
  slug!: string;
  name!: string;
  image_url?: string;
  created_at!: Date;

  // models belongsTo brands via brand_id
  brand!: brands;
  getBrand!: Sequelize.BelongsToGetAssociationMixin<brands>;
  setBrand!: Sequelize.BelongsToSetAssociationMixin<brands, brandsId>;
  createBrand!: Sequelize.BelongsToCreateAssociationMixin<brands>;
  // models hasMany garages via model_id
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
  // models hasMany model_years via model_id
  model_years!: model_years[];
  getModel_years!: Sequelize.HasManyGetAssociationsMixin<model_years>;
  setModel_years!: Sequelize.HasManySetAssociationsMixin<model_years, model_yearsId>;
  addModel_year!: Sequelize.HasManyAddAssociationMixin<model_years, model_yearsId>;
  addModel_years!: Sequelize.HasManyAddAssociationsMixin<model_years, model_yearsId>;
  createModel_year!: Sequelize.HasManyCreateAssociationMixin<model_years>;
  removeModel_year!: Sequelize.HasManyRemoveAssociationMixin<model_years, model_yearsId>;
  removeModel_years!: Sequelize.HasManyRemoveAssociationsMixin<model_years, model_yearsId>;
  hasModel_year!: Sequelize.HasManyHasAssociationMixin<model_years, model_yearsId>;
  hasModel_years!: Sequelize.HasManyHasAssociationsMixin<model_years, model_yearsId>;
  countModel_years!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof models {
    return models.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    brand_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'brands',
        key: 'id'
      },
      unique: "models_brand_id_slug_key"
    },
    slug: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "models_brand_id_slug_key"
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'models',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "models_brand_id_idx",
        fields: [
          { name: "brand_id" },
        ]
      },
      {
        name: "models_brand_id_slug_key",
        unique: true,
        fields: [
          { name: "brand_id" },
          { name: "slug" },
        ]
      },
      {
        name: "models_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
