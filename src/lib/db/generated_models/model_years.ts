import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { engines, enginesId } from './engines';
import type { garages, garagesId } from './garages';
import type { models, modelsId } from './models';

export interface model_yearsAttributes {
  id: string;
  model_id: string;
  year: number;
}

export type model_yearsPk = "id";
export type model_yearsId = model_years[model_yearsPk];
export type model_yearsOptionalAttributes = "id";
export type model_yearsCreationAttributes = Optional<model_yearsAttributes, model_yearsOptionalAttributes>;

export class model_years extends Model<model_yearsAttributes, model_yearsCreationAttributes> implements model_yearsAttributes {
  id!: string;
  model_id!: string;
  year!: number;

  // model_years hasMany engines via model_year_id
  engines!: engines[];
  getEngines!: Sequelize.HasManyGetAssociationsMixin<engines>;
  setEngines!: Sequelize.HasManySetAssociationsMixin<engines, enginesId>;
  addEngine!: Sequelize.HasManyAddAssociationMixin<engines, enginesId>;
  addEngines!: Sequelize.HasManyAddAssociationsMixin<engines, enginesId>;
  createEngine!: Sequelize.HasManyCreateAssociationMixin<engines>;
  removeEngine!: Sequelize.HasManyRemoveAssociationMixin<engines, enginesId>;
  removeEngines!: Sequelize.HasManyRemoveAssociationsMixin<engines, enginesId>;
  hasEngine!: Sequelize.HasManyHasAssociationMixin<engines, enginesId>;
  hasEngines!: Sequelize.HasManyHasAssociationsMixin<engines, enginesId>;
  countEngines!: Sequelize.HasManyCountAssociationsMixin;
  // model_years hasMany garages via model_year_id
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
  // model_years belongsTo models via model_id
  model!: models;
  getModel!: Sequelize.BelongsToGetAssociationMixin<models>;
  setModel!: Sequelize.BelongsToSetAssociationMixin<models, modelsId>;
  createModel!: Sequelize.BelongsToCreateAssociationMixin<models>;

  static initModel(sequelize: Sequelize.Sequelize): typeof model_years {
    return model_years.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    model_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'models',
        key: 'id'
      },
      unique: "model_years_model_id_year_key"
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "model_years_model_id_year_key"
    }
  }, {
    sequelize,
    tableName: 'model_years',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "model_years_model_id_idx",
        fields: [
          { name: "model_id" },
        ]
      },
      {
        name: "model_years_model_id_year_key",
        unique: true,
        fields: [
          { name: "model_id" },
          { name: "year" },
        ]
      },
      {
        name: "model_years_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
