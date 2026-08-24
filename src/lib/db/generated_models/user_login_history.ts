import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { users, usersId } from './users';

export interface user_login_historyAttributes {
  id: string;
  user_id: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  location?: string;
  method?: string;
  login_time: Date;
  logout_time?: Date;
}

export type user_login_historyPk = "id";
export type user_login_historyId = user_login_history[user_login_historyPk];
export type user_login_historyOptionalAttributes = "id" | "session_id" | "ip_address" | "user_agent" | "device_type" | "browser" | "os" | "location" | "method" | "login_time" | "logout_time";
export type user_login_historyCreationAttributes = Optional<user_login_historyAttributes, user_login_historyOptionalAttributes>;

export class user_login_history extends Model<user_login_historyAttributes, user_login_historyCreationAttributes> implements user_login_historyAttributes {
  id!: string;
  user_id!: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  location?: string;
  method?: string;
  login_time!: Date;
  logout_time?: Date;

  // user_login_history belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof user_login_history {
    return user_login_history.init({
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
      }
    },
    session_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    device_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    browser: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    os: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    login_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    logout_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    method: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'user_login_history',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "user_login_history_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "user_login_history_user_session_uniq",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "session_id" },
        ]
      },
      {
        name: "user_login_history_user_time_idx",
        fields: [
          { name: "user_id" },
          { name: "login_time", order: "DESC" },
        ]
      },
    ]
  });
  }
}
