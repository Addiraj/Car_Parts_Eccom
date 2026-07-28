import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { diagrams, diagramsId } from './diagrams';
import type { garages, garagesId } from './garages';
import type { model_years, model_yearsId } from './model_years';
import type { part_compatibility, part_compatibilityId } from './part_compatibility';

export interface enginesAttributes {
  id: string;
  model_year_id: string;
  code: string;
  name: string;
  fuel_type?: string;
  displacement?: string;
}

export type enginesPk = "id";
export type enginesId = engines[enginesPk];
export type enginesOptionalAttributes = "id" | "fuel_type" | "displacement";
export type enginesCreationAttributes = Optional<enginesAttributes, enginesOptionalAttributes>;

export class engines extends Model<enginesAttributes, enginesCreationAttributes> implements enginesAttributes {
  id!: string;
  model_year_id!: string;
  code!: string;
  name!: string;
  fuel_type?: string;
  displacement?: string;

  // engines hasMany diagrams via engine_id
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
  // engines hasMany garages via engine_id
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
  // engines hasMany part_compatibility via engine_id
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
  // engines belongsTo model_years via model_year_id
  model_year!: model_years;
  getModel_year!: Sequelize.BelongsToGetAssociationMixin<model_years>;
  setModel_year!: Sequelize.BelongsToSetAssociationMixin<model_years, model_yearsId>;
  createModel_year!: Sequelize.BelongsToCreateAssociationMixin<model_years>;

  static initModel(sequelize: Sequelize.Sequelize): typeof engines {
    return engines.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    model_year_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'model_years',
        key: 'id'
      },
      unique: "engines_model_year_id_code_key"
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "engines_model_year_id_code_key"
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    fuel_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    displacement: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'engines',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "engines_model_year_id_code_key",
        unique: true,
        fields: [
          { name: "model_year_id" },
          { name: "code" },
        ]
      },
      {
        name: "engines_model_year_id_idx",
        fields: [
          { name: "model_year_id" },
        ]
      },
      {
        name: "engines_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
