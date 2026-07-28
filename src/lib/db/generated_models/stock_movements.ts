import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { parts, partsId } from './parts';
import type { users, usersId } from './users';
import type { warehouses, warehousesId } from './warehouses';

export interface stock_movementsAttributes {
  id: string;
  part_id: string;
  warehouse_id?: string;
  to_warehouse_id?: string;
  movement_type: "IN" | "OUT" | "ADJUST" | "TRANSFER" | "SALE" | "RETURN";
  quantity: number;
  reference?: string;
  note?: string;
  created_by?: string;
  created_at: Date;
}

export type stock_movementsPk = "id";
export type stock_movementsId = stock_movements[stock_movementsPk];
export type stock_movementsOptionalAttributes = "id" | "warehouse_id" | "to_warehouse_id" | "reference" | "note" | "created_by" | "created_at";
export type stock_movementsCreationAttributes = Optional<stock_movementsAttributes, stock_movementsOptionalAttributes>;

export class stock_movements extends Model<stock_movementsAttributes, stock_movementsCreationAttributes> implements stock_movementsAttributes {
  id!: string;
  part_id!: string;
  warehouse_id?: string;
  to_warehouse_id?: string;
  movement_type!: "IN" | "OUT" | "ADJUST" | "TRANSFER" | "SALE" | "RETURN";
  quantity!: number;
  reference?: string;
  note?: string;
  created_by?: string;
  created_at!: Date;

  // stock_movements belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;
  // stock_movements belongsTo users via created_by
  created_by_user!: users;
  getCreated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setCreated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createCreated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;
  // stock_movements belongsTo warehouses via to_warehouse_id
  to_warehouse!: warehouses;
  getTo_warehouse!: Sequelize.BelongsToGetAssociationMixin<warehouses>;
  setTo_warehouse!: Sequelize.BelongsToSetAssociationMixin<warehouses, warehousesId>;
  createTo_warehouse!: Sequelize.BelongsToCreateAssociationMixin<warehouses>;
  // stock_movements belongsTo warehouses via warehouse_id
  warehouse!: warehouses;
  getWarehouse!: Sequelize.BelongsToGetAssociationMixin<warehouses>;
  setWarehouse!: Sequelize.BelongsToSetAssociationMixin<warehouses, warehousesId>;
  createWarehouse!: Sequelize.BelongsToCreateAssociationMixin<warehouses>;

  static initModel(sequelize: Sequelize.Sequelize): typeof stock_movements {
    return stock_movements.init({
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
      }
    },
    warehouse_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'warehouses',
        key: 'id'
      }
    },
    to_warehouse_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'warehouses',
        key: 'id'
      }
    },
    movement_type: {
      type: DataTypes.ENUM("IN","OUT","ADJUST","TRANSFER","SALE","RETURN"),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reference: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'stock_movements',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "idx_stock_movements_part",
        fields: [
          { name: "part_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "idx_stock_movements_wh",
        fields: [
          { name: "warehouse_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "stock_movements_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
