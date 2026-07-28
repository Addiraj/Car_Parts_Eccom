import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { diagrams, diagramsId } from './diagrams';
import type { parts, partsId } from './parts';

export interface diagram_hotspotsAttributes {
  id: string;
  diagram_id: string;
  part_id: string;
  callout_number: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type diagram_hotspotsPk = "id";
export type diagram_hotspotsId = diagram_hotspots[diagram_hotspotsPk];
export type diagram_hotspotsOptionalAttributes = "id" | "w" | "h";
export type diagram_hotspotsCreationAttributes = Optional<diagram_hotspotsAttributes, diagram_hotspotsOptionalAttributes>;

export class diagram_hotspots extends Model<diagram_hotspotsAttributes, diagram_hotspotsCreationAttributes> implements diagram_hotspotsAttributes {
  id!: string;
  diagram_id!: string;
  part_id!: string;
  callout_number!: number;
  x!: number;
  y!: number;
  w!: number;
  h!: number;

  // diagram_hotspots belongsTo diagrams via diagram_id
  diagram!: diagrams;
  getDiagram!: Sequelize.BelongsToGetAssociationMixin<diagrams>;
  setDiagram!: Sequelize.BelongsToSetAssociationMixin<diagrams, diagramsId>;
  createDiagram!: Sequelize.BelongsToCreateAssociationMixin<diagrams>;
  // diagram_hotspots belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;

  static initModel(sequelize: Sequelize.Sequelize): typeof diagram_hotspots {
    return diagram_hotspots.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    diagram_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'diagrams',
        key: 'id'
      },
      unique: "diagram_hotspots_diagram_id_callout_number_key"
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      }
    },
    callout_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "diagram_hotspots_diagram_id_callout_number_key"
    },
    x: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    y: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    w: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.04
    },
    h: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.04
    }
  }, {
    sequelize,
    tableName: 'diagram_hotspots',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "diagram_hotspots_diagram_id_callout_number_key",
        unique: true,
        fields: [
          { name: "diagram_id" },
          { name: "callout_number" },
        ]
      },
      {
        name: "diagram_hotspots_diagram_id_idx",
        fields: [
          { name: "diagram_id" },
        ]
      },
      {
        name: "diagram_hotspots_part_id_idx",
        fields: [
          { name: "part_id" },
        ]
      },
      {
        name: "diagram_hotspots_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
