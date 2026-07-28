import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { brands, brandsId } from './brands';
import type { engines, enginesId } from './engines';
import type { model_years, model_yearsId } from './model_years';
import type { models, modelsId } from './models';
import type { users, usersId } from './users';

export interface garagesAttributes {
  id: string;
  user_id: string;
  nickname?: string;
  vin?: string;
  brand_id?: string;
  model_id?: string;
  model_year_id?: string;
  engine_id?: string;
  brand_name?: string;
  model_name?: string;
  year?: number;
  engine_name?: string;
  is_default: boolean;
  created_at: Date;
  reference_tag?: string;
}

export type garagesPk = "id";
export type garagesId = garages[garagesPk];
export type garagesOptionalAttributes = "id" | "nickname" | "vin" | "brand_id" | "model_id" | "model_year_id" | "engine_id" | "brand_name" | "model_name" | "year" | "engine_name" | "created_at" | "reference_tag";
export type garagesCreationAttributes = Optional<garagesAttributes, garagesOptionalAttributes>;

export class garages extends Model<garagesAttributes, garagesCreationAttributes> implements garagesAttributes {
  id!: string;
  user_id!: string;
  nickname?: string;
  vin?: string;
  brand_id?: string;
  model_id?: string;
  model_year_id?: string;
  engine_id?: string;
  brand_name?: string;
  model_name?: string;
  year?: number;
  engine_name?: string;
  is_default!: boolean;
  created_at!: Date;
  reference_tag?: string;

  // garages belongsTo brands via brand_id
  brand!: brands;
  getBrand!: Sequelize.BelongsToGetAssociationMixin<brands>;
  setBrand!: Sequelize.BelongsToSetAssociationMixin<brands, brandsId>;
  createBrand!: Sequelize.BelongsToCreateAssociationMixin<brands>;
  // garages belongsTo engines via engine_id
  engine!: engines;
  getEngine!: Sequelize.BelongsToGetAssociationMixin<engines>;
  setEngine!: Sequelize.BelongsToSetAssociationMixin<engines, enginesId>;
  createEngine!: Sequelize.BelongsToCreateAssociationMixin<engines>;
  // garages belongsTo model_years via model_year_id
  model_year!: model_years;
  getModel_year!: Sequelize.BelongsToGetAssociationMixin<model_years>;
  setModel_year!: Sequelize.BelongsToSetAssociationMixin<model_years, model_yearsId>;
  createModel_year!: Sequelize.BelongsToCreateAssociationMixin<model_years>;
  // garages belongsTo models via model_id
  model!: models;
  getModel!: Sequelize.BelongsToGetAssociationMixin<models>;
  setModel!: Sequelize.BelongsToSetAssociationMixin<models, modelsId>;
  createModel!: Sequelize.BelongsToCreateAssociationMixin<models>;
  // garages belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof garages {
    return garages.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    nickname: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vin: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    brand_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'brands',
        key: 'id'
      }
    },
    model_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'models',
        key: 'id'
      }
    },
    model_year_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'model_years',
        key: 'id'
      }
    },
    engine_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'engines',
        key: 'id'
      }
    },
    brand_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    model_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    engine_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    reference_tag: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'garages',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "garages_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "garages_user_id_idx",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
  }
}
