import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { users, usersId } from './users';

export interface user_rolesAttributes {
  id: string;
  user_id: string;
  role: "admin" | "customer" | "super_admin" | "salesman";
  created_at: Date;
}

export type user_rolesPk = "id";
export type user_rolesId = user_roles[user_rolesPk];
export type user_rolesOptionalAttributes = "id" | "role" | "created_at";
export type user_rolesCreationAttributes = Optional<user_rolesAttributes, user_rolesOptionalAttributes>;

export class user_roles extends Model<user_rolesAttributes, user_rolesCreationAttributes> implements user_rolesAttributes {
  id!: string;
  user_id!: string;
  role!: "admin" | "customer" | "super_admin" | "salesman";
  created_at!: Date;

  // user_roles belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof user_roles {
    return user_roles.init({
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
      unique: "user_roles_user_id_role_key"
    },
    role: {
      type: DataTypes.ENUM("admin","customer","super_admin","salesman"),
      allowNull: false,
      defaultValue: "customer",
      unique: "user_roles_user_id_role_key"
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'user_roles',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "user_roles_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "user_roles_user_id_role_key",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "role" },
        ]
      },
    ]
  });
  }
}
