import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface usersAttributes {
  id: string;
  email?: string;
  raw_user_meta_data?: object;
  password_hash?: string;
  last_active_at?: Date;
}

export type usersPk = "id";
export type usersId = users[usersPk];
export type usersOptionalAttributes = "id" | "email" | "raw_user_meta_data" | "password_hash" | "last_active_at";
export type usersCreationAttributes = Optional<usersAttributes, usersOptionalAttributes>;

export class users extends Model<usersAttributes, usersCreationAttributes> implements usersAttributes {
  id!: string;
  email?: string;
  raw_user_meta_data?: object;
  password_hash?: string;
  last_active_at?: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof users {
    return users.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    raw_user_meta_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    last_active_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'users',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "users_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
