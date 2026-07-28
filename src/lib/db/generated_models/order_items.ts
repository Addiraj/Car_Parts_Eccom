import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { orders, ordersId } from './orders';

export interface order_itemsAttributes {
  id: string;
  order_id: string;
  part_id?: string;
  part_number: string;
  name: string;
  manufacturer?: string;
  image_url?: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  customer_type?: "IND" | "GAR" | "EXP";
  price_tier?: string;
}

export type order_itemsPk = "id";
export type order_itemsId = order_items[order_itemsPk];
export type order_itemsOptionalAttributes = "id" | "part_id" | "manufacturer" | "image_url" | "customer_type" | "price_tier";
export type order_itemsCreationAttributes = Optional<order_itemsAttributes, order_itemsOptionalAttributes>;

export class order_items extends Model<order_itemsAttributes, order_itemsCreationAttributes> implements order_itemsAttributes {
  id!: string;
  order_id!: string;
  part_id?: string;
  part_number!: string;
  name!: string;
  manufacturer?: string;
  image_url?: string;
  unit_price!: number;
  quantity!: number;
  line_total!: number;
  customer_type?: "IND" | "GAR" | "EXP";
  price_tier?: string;

  // order_items belongsTo orders via order_id
  order!: orders;
  getOrder!: Sequelize.BelongsToGetAssociationMixin<orders>;
  setOrder!: Sequelize.BelongsToSetAssociationMixin<orders, ordersId>;
  createOrder!: Sequelize.BelongsToCreateAssociationMixin<orders>;

  static initModel(sequelize: Sequelize.Sequelize): typeof order_items {
    return order_items.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    part_number: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    manufacturer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unit_price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    line_total: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    customer_type: {
      type: DataTypes.ENUM("IND","GAR","EXP"),
      allowNull: true
    },
    price_tier: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'order_items',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "idx_order_items_order",
        fields: [
          { name: "order_id" },
        ]
      },
      {
        name: "order_items_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
