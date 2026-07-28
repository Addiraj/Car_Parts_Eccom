import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { stock_levels, stock_levelsId } from './stock_levels';
import type { stock_movements, stock_movementsId } from './stock_movements';

export interface warehousesAttributes {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type warehousesPk = "id";
export type warehousesId = warehouses[warehousesPk];
export type warehousesOptionalAttributes = "id" | "address" | "city" | "country" | "is_active" | "created_at" | "updated_at";
export type warehousesCreationAttributes = Optional<warehousesAttributes, warehousesOptionalAttributes>;

export class warehouses extends Model<warehousesAttributes, warehousesCreationAttributes> implements warehousesAttributes {
  id!: string;
  code!: string;
  name!: string;
  address?: string;
  city?: string;
  country?: string;
  is_default!: boolean;
  is_active!: boolean;
  created_at!: Date;
  updated_at!: Date;

  // warehouses hasMany stock_levels via warehouse_id
  stock_levels!: stock_levels[];
  getStock_levels!: Sequelize.HasManyGetAssociationsMixin<stock_levels>;
  setStock_levels!: Sequelize.HasManySetAssociationsMixin<stock_levels, stock_levelsId>;
  addStock_level!: Sequelize.HasManyAddAssociationMixin<stock_levels, stock_levelsId>;
  addStock_levels!: Sequelize.HasManyAddAssociationsMixin<stock_levels, stock_levelsId>;
  createStock_level!: Sequelize.HasManyCreateAssociationMixin<stock_levels>;
  removeStock_level!: Sequelize.HasManyRemoveAssociationMixin<stock_levels, stock_levelsId>;
  removeStock_levels!: Sequelize.HasManyRemoveAssociationsMixin<stock_levels, stock_levelsId>;
  hasStock_level!: Sequelize.HasManyHasAssociationMixin<stock_levels, stock_levelsId>;
  hasStock_levels!: Sequelize.HasManyHasAssociationsMixin<stock_levels, stock_levelsId>;
  countStock_levels!: Sequelize.HasManyCountAssociationsMixin;
  // warehouses hasMany stock_movements via to_warehouse_id
  stock_movements!: stock_movements[];
  getStock_movements!: Sequelize.HasManyGetAssociationsMixin<stock_movements>;
  setStock_movements!: Sequelize.HasManySetAssociationsMixin<stock_movements, stock_movementsId>;
  addStock_movement!: Sequelize.HasManyAddAssociationMixin<stock_movements, stock_movementsId>;
  addStock_movements!: Sequelize.HasManyAddAssociationsMixin<stock_movements, stock_movementsId>;
  createStock_movement!: Sequelize.HasManyCreateAssociationMixin<stock_movements>;
  removeStock_movement!: Sequelize.HasManyRemoveAssociationMixin<stock_movements, stock_movementsId>;
  removeStock_movements!: Sequelize.HasManyRemoveAssociationsMixin<stock_movements, stock_movementsId>;
  hasStock_movement!: Sequelize.HasManyHasAssociationMixin<stock_movements, stock_movementsId>;
  hasStock_movements!: Sequelize.HasManyHasAssociationsMixin<stock_movements, stock_movementsId>;
  countStock_movements!: Sequelize.HasManyCountAssociationsMixin;
  // warehouses hasMany stock_movements via warehouse_id
  warehouse_stock_movements!: stock_movements[];
  getWarehouse_stock_movements!: Sequelize.HasManyGetAssociationsMixin<stock_movements>;
  setWarehouse_stock_movements!: Sequelize.HasManySetAssociationsMixin<stock_movements, stock_movementsId>;
  addWarehouse_stock_movement!: Sequelize.HasManyAddAssociationMixin<stock_movements, stock_movementsId>;
  addWarehouse_stock_movements!: Sequelize.HasManyAddAssociationsMixin<stock_movements, stock_movementsId>;
  createWarehouse_stock_movement!: Sequelize.HasManyCreateAssociationMixin<stock_movements>;
  removeWarehouse_stock_movement!: Sequelize.HasManyRemoveAssociationMixin<stock_movements, stock_movementsId>;
  removeWarehouse_stock_movements!: Sequelize.HasManyRemoveAssociationsMixin<stock_movements, stock_movementsId>;
  hasWarehouse_stock_movement!: Sequelize.HasManyHasAssociationMixin<stock_movements, stock_movementsId>;
  hasWarehouse_stock_movements!: Sequelize.HasManyHasAssociationsMixin<stock_movements, stock_movementsId>;
  countWarehouse_stock_movements!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof warehouses {
    return warehouses.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "warehouses_code_key"
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    country: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'warehouses',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "warehouses_code_key",
        unique: true,
        fields: [
          { name: "code" },
        ]
      },
      {
        name: "warehouses_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
