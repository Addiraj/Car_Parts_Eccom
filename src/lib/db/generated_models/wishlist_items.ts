import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { parts, partsId } from './parts';
import type { users, usersId } from './users';

export interface wishlist_itemsAttributes {
  id: string;
  user_id: string;
  part_id: string;
  added_at: Date;
}

export type wishlist_itemsPk = "id";
export type wishlist_itemsId = wishlist_items[wishlist_itemsPk];
export type wishlist_itemsOptionalAttributes = "id" | "added_at";
export type wishlist_itemsCreationAttributes = Optional<wishlist_itemsAttributes, wishlist_itemsOptionalAttributes>;

export class wishlist_items extends Model<wishlist_itemsAttributes, wishlist_itemsCreationAttributes> implements wishlist_itemsAttributes {
  id!: string;
  user_id!: string;
  part_id!: string;
  added_at!: Date;

  // wishlist_items belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;
  // wishlist_items belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof wishlist_items {
    return wishlist_items.init({
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
      unique: "wishlist_items_user_id_part_id_key"
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'parts',
        key: 'id'
      },
      unique: "wishlist_items_user_id_part_id_key"
    },
    added_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'wishlist_items',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "wishlist_items_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "wishlist_items_user_id_idx",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "wishlist_items_user_id_part_id_key",
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
