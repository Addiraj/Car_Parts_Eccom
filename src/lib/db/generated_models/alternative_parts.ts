import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { parts, partsId } from './parts';

export interface alternative_partsAttributes {
  id: string;
  part_id: string;
  alternative_part_id: string;
}

export type alternative_partsPk = "id";
export type alternative_partsId = alternative_parts[alternative_partsPk];
export type alternative_partsOptionalAttributes = "id";
export type alternative_partsCreationAttributes = Optional<alternative_partsAttributes, alternative_partsOptionalAttributes>;

export class alternative_parts extends Model<alternative_partsAttributes, alternative_partsCreationAttributes> implements alternative_partsAttributes {
  id!: string;
  part_id!: string;
  alternative_part_id!: string;

  // alternative_parts belongsTo parts via alternative_part_id
  alternative_part!: parts;
  getAlternative_part!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setAlternative_part!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createAlternative_part!: Sequelize.BelongsToCreateAssociationMixin<parts>;
  // alternative_parts belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;

  static initModel(sequelize: Sequelize.Sequelize): typeof alternative_parts {
    return alternative_parts.init({
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
      unique: "alternative_parts_part_id_alternative_part_id_key"
    },
    alternative_part_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      },
      unique: "alternative_parts_part_id_alternative_part_id_key"
    }
  }, {
    sequelize,
    tableName: 'alternative_parts',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "alternative_parts_part_id_alternative_part_id_key",
        unique: true,
        fields: [
          { name: "part_id" },
          { name: "alternative_part_id" },
        ]
      },
      {
        name: "alternative_parts_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
