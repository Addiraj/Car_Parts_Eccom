import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { parts, partsId } from './parts';
import type { warehouses, warehousesId } from './warehouses';

export interface stock_levelsAttributes {
  id: string;
  part_id: string;
  warehouse_id: string;
  quantity: number;
  reorder_point: number;
  bin_location?: string;
  created_at: Date;
  updated_at: Date;
}

export type stock_levelsPk = "id";
export type stock_levelsId = stock_levels[stock_levelsPk];
export type stock_levelsOptionalAttributes = "id" | "quantity" | "reorder_point" | "bin_location" | "created_at" | "updated_at";
export type stock_levelsCreationAttributes = Optional<stock_levelsAttributes, stock_levelsOptionalAttributes>;

export class stock_levels extends Model<stock_levelsAttributes, stock_levelsCreationAttributes> implements stock_levelsAttributes {
  id!: string;
  part_id!: string;
  warehouse_id!: string;
  quantity!: number;
  reorder_point!: number;
  bin_location?: string;
  created_at!: Date;
  updated_at!: Date;

  // stock_levels belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;
  // stock_levels belongsTo warehouses via warehouse_id
  warehouse!: warehouses;
  getWarehouse!: Sequelize.BelongsToGetAssociationMixin<warehouses>;
  setWarehouse!: Sequelize.BelongsToSetAssociationMixin<warehouses, warehousesId>;
  createWarehouse!: Sequelize.BelongsToCreateAssociationMixin<warehouses>;

  static initModel(sequelize: Sequelize.Sequelize): typeof stock_levels {
    return stock_levels.init({
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
      unique: "stock_levels_part_id_warehouse_id_key"
    },
    warehouse_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'warehouses',
        key: 'id'
      },
      unique: "stock_levels_part_id_warehouse_id_key"
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    reorder_point: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    bin_location: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'stock_levels',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "idx_stock_levels_part",
        fields: [
          { name: "part_id" },
        ]
      },
      {
        name: "idx_stock_levels_warehouse",
        fields: [
          { name: "warehouse_id" },
        ]
      },
      {
        name: "stock_levels_part_id_warehouse_id_key",
        unique: true,
        fields: [
          { name: "part_id" },
          { name: "warehouse_id" },
        ]
      },
      {
        name: "stock_levels_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
