import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { parts, partsId } from './parts';
import type { users, usersId } from './users';

export interface cart_itemsAttributes {
  id: string;
  user_id: string;
  part_id: string;
  quantity: number;
  added_at: Date;
}

export type cart_itemsPk = "id";
export type cart_itemsId = cart_items[cart_itemsPk];
export type cart_itemsOptionalAttributes = "id" | "quantity" | "added_at";
export type cart_itemsCreationAttributes = Optional<cart_itemsAttributes, cart_itemsOptionalAttributes>;

export class cart_items extends Model<cart_itemsAttributes, cart_itemsCreationAttributes> implements cart_itemsAttributes {
  id!: string;
  user_id!: string;
  part_id!: string;
  quantity!: number;
  added_at!: Date;

  // cart_items belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;
  // cart_items belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof cart_items {
    return cart_items.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      unique: "cart_items_user_id_part_id_key"
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      },
      unique: "cart_items_user_id_part_id_key"
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    added_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'cart_items',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "cart_items_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "cart_items_user_id_idx",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "cart_items_user_id_part_id_key",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "part_id" },
        ]
      },
    ]
  });
  }
}
