import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { categories, categoriesId } from './categories';
import type { diagram_hotspots, diagram_hotspotsId } from './diagram_hotspots';
import type { engines, enginesId } from './engines';

export interface diagramsAttributes {
  id: string;
  category_id: string;
  engine_id?: string;
  title: string;
  image_url: string;
  width: number;
  height: number;
  created_at: Date;
}

export type diagramsPk = "id";
export type diagramsId = diagrams[diagramsPk];
export type diagramsOptionalAttributes = "id" | "engine_id" | "width" | "height" | "created_at";
export type diagramsCreationAttributes = Optional<diagramsAttributes, diagramsOptionalAttributes>;

export class diagrams extends Model<diagramsAttributes, diagramsCreationAttributes> implements diagramsAttributes {
  id!: string;
  category_id!: string;
  engine_id?: string;
  title!: string;
  image_url!: string;
  width!: number;
  height!: number;
  created_at!: Date;

  // diagrams belongsTo categories via category_id
  category!: categories;
  getCategory!: Sequelize.BelongsToGetAssociationMixin<categories>;
  setCategory!: Sequelize.BelongsToSetAssociationMixin<categories, categoriesId>;
  createCategory!: Sequelize.BelongsToCreateAssociationMixin<categories>;
  // diagrams hasMany diagram_hotspots via diagram_id
  diagram_hotspots!: diagram_hotspots[];
  getDiagram_hotspots!: Sequelize.HasManyGetAssociationsMixin<diagram_hotspots>;
  setDiagram_hotspots!: Sequelize.HasManySetAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  addDiagram_hotspot!: Sequelize.HasManyAddAssociationMixin<diagram_hotspots, diagram_hotspotsId>;
  addDiagram_hotspots!: Sequelize.HasManyAddAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  createDiagram_hotspot!: Sequelize.HasManyCreateAssociationMixin<diagram_hotspots>;
  removeDiagram_hotspot!: Sequelize.HasManyRemoveAssociationMixin<diagram_hotspots, diagram_hotspotsId>;
  removeDiagram_hotspots!: Sequelize.HasManyRemoveAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  hasDiagram_hotspot!: Sequelize.HasManyHasAssociationMixin<diagram_hotspots, diagram_hotspotsId>;
  hasDiagram_hotspots!: Sequelize.HasManyHasAssociationsMixin<diagram_hotspots, diagram_hotspotsId>;
  countDiagram_hotspots!: Sequelize.HasManyCountAssociationsMixin;
  // diagrams belongsTo engines via engine_id
  engine!: engines;
  getEngine!: Sequelize.BelongsToGetAssociationMixin<engines>;
  setEngine!: Sequelize.BelongsToSetAssociationMixin<engines, enginesId>;
  createEngine!: Sequelize.BelongsToCreateAssociationMixin<engines>;

  static initModel(sequelize: Sequelize.Sequelize): typeof diagrams {
    return diagrams.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categories',
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
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1200
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 800
    }
  }, {
    sequelize,
    tableName: 'diagrams',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "diagrams_category_id_idx",
        fields: [
          { name: "category_id" },
        ]
      },
      {
        name: "diagrams_engine_id_idx",
        fields: [
          { name: "engine_id" },
        ]
      },
      {
        name: "diagrams_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
