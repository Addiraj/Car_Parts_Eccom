import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { orders, ordersId } from './orders';
import type { users, usersId } from './users';

export interface order_eventsAttributes {
  id: string;
  order_id: string;
  status: string;
  note?: string;
  created_at: Date;
  created_by?: string;
}

export type order_eventsPk = "id";
export type order_eventsId = order_events[order_eventsPk];
export type order_eventsOptionalAttributes = "id" | "note" | "created_at" | "created_by";
export type order_eventsCreationAttributes = Optional<order_eventsAttributes, order_eventsOptionalAttributes>;

export class order_events extends Model<order_eventsAttributes, order_eventsCreationAttributes> implements order_eventsAttributes {
  id!: string;
  order_id!: string;
  status!: string;
  note?: string;
  created_at!: Date;
  created_by?: string;

  // order_events belongsTo orders via order_id
  order!: orders;
  getOrder!: Sequelize.BelongsToGetAssociationMixin<orders>;
  setOrder!: Sequelize.BelongsToSetAssociationMixin<orders, ordersId>;
  createOrder!: Sequelize.BelongsToCreateAssociationMixin<orders>;
  // order_events belongsTo users via created_by
  created_by_user!: users;
  getCreated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setCreated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createCreated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof order_events {
    return order_events.init({
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
    status: {
      type: DataTypes.TEXT,
      allowNull: false
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
    }
  }, {
    sequelize,
    tableName: 'order_events',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "order_events_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
