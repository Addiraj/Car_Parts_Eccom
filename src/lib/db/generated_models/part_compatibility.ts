import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { engines, enginesId } from './engines';
import type { parts, partsId } from './parts';

export interface part_compatibilityAttributes {
  id: string;
  part_id: string;
  engine_id: string;
}

export type part_compatibilityPk = "id";
export type part_compatibilityId = part_compatibility[part_compatibilityPk];
export type part_compatibilityOptionalAttributes = "id";
export type part_compatibilityCreationAttributes = Optional<part_compatibilityAttributes, part_compatibilityOptionalAttributes>;

export class part_compatibility extends Model<part_compatibilityAttributes, part_compatibilityCreationAttributes> implements part_compatibilityAttributes {
  id!: string;
  part_id!: string;
  engine_id!: string;

  // part_compatibility belongsTo engines via engine_id
  engine!: engines;
  getEngine!: Sequelize.BelongsToGetAssociationMixin<engines>;
  setEngine!: Sequelize.BelongsToSetAssociationMixin<engines, enginesId>;
  createEngine!: Sequelize.BelongsToCreateAssociationMixin<engines>;
  // part_compatibility belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;

  static initModel(sequelize: Sequelize.Sequelize): typeof part_compatibility {
    return part_compatibility.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      },
      unique: "part_compatibility_part_id_engine_id_key"
    },
    engine_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'engines',
        key: 'id'
      },
      unique: "part_compatibility_part_id_engine_id_key"
    }
  }, {
    sequelize,
    tableName: 'part_compatibility',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "part_compatibility_engine_id_idx",
        fields: [
          { name: "engine_id" },
        ]
      },
      {
        name: "part_compatibility_part_id_engine_id_key",
        unique: true,
        fields: [
          { name: "part_id" },
          { name: "engine_id" },
        ]
      },
      {
        name: "part_compatibility_part_id_idx",
        fields: [
          { name: "part_id" },
        ]
      },
      {
        name: "part_compatibility_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
