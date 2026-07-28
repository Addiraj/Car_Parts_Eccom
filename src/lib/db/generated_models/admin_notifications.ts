import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { admin_notification_reads, admin_notification_readsId } from './admin_notification_reads';
import type { users, usersId } from './users';

export interface admin_notificationsAttributes {
  id: string;
  type: string;
  title: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  metadata: object;
  created_at: Date;
  salesman_id?: string;
}

export type admin_notificationsPk = "id";
export type admin_notificationsId = admin_notifications[admin_notificationsPk];
export type admin_notificationsOptionalAttributes = "id" | "body" | "entity_type" | "entity_id" | "metadata" | "created_at" | "salesman_id";
export type admin_notificationsCreationAttributes = Optional<admin_notificationsAttributes, admin_notificationsOptionalAttributes>;

export class admin_notifications extends Model<admin_notificationsAttributes, admin_notificationsCreationAttributes> implements admin_notificationsAttributes {
  id!: string;
  type!: string;
  title!: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  metadata!: object;
  created_at!: Date;
  salesman_id?: string;

  // admin_notifications hasMany admin_notification_reads via notification_id
  admin_notification_reads!: admin_notification_reads[];
  getAdmin_notification_reads!: Sequelize.HasManyGetAssociationsMixin<admin_notification_reads>;
  setAdmin_notification_reads!: Sequelize.HasManySetAssociationsMixin<admin_notification_reads, admin_notification_readsId>;
  addAdmin_notification_read!: Sequelize.HasManyAddAssociationMixin<admin_notification_reads, admin_notification_readsId>;
  addAdmin_notification_reads!: Sequelize.HasManyAddAssociationsMixin<admin_notification_reads, admin_notification_readsId>;
  createAdmin_notification_read!: Sequelize.HasManyCreateAssociationMixin<admin_notification_reads>;
  removeAdmin_notification_read!: Sequelize.HasManyRemoveAssociationMixin<admin_notification_reads, admin_notification_readsId>;
  removeAdmin_notification_reads!: Sequelize.HasManyRemoveAssociationsMixin<admin_notification_reads, admin_notification_readsId>;
  hasAdmin_notification_read!: Sequelize.HasManyHasAssociationMixin<admin_notification_reads, admin_notification_readsId>;
  hasAdmin_notification_reads!: Sequelize.HasManyHasAssociationsMixin<admin_notification_reads, admin_notification_readsId>;
  countAdmin_notification_reads!: Sequelize.HasManyCountAssociationsMixin;
  // admin_notifications belongsToMany users via notification_id and admin_id
  admin_id_users!: users[];
  getAdmin_id_users!: Sequelize.BelongsToManyGetAssociationsMixin<users>;
  setAdmin_id_users!: Sequelize.BelongsToManySetAssociationsMixin<users, usersId>;
  addAdmin_id_user!: Sequelize.BelongsToManyAddAssociationMixin<users, usersId>;
  addAdmin_id_users!: Sequelize.BelongsToManyAddAssociationsMixin<users, usersId>;
  createAdmin_id_user!: Sequelize.BelongsToManyCreateAssociationMixin<users>;
  removeAdmin_id_user!: Sequelize.BelongsToManyRemoveAssociationMixin<users, usersId>;
  removeAdmin_id_users!: Sequelize.BelongsToManyRemoveAssociationsMixin<users, usersId>;
  hasAdmin_id_user!: Sequelize.BelongsToManyHasAssociationMixin<users, usersId>;
  hasAdmin_id_users!: Sequelize.BelongsToManyHasAssociationsMixin<users, usersId>;
  countAdmin_id_users!: Sequelize.BelongsToManyCountAssociationsMixin;
  // admin_notifications belongsTo users via salesman_id
  salesman!: users;
  getSalesman!: Sequelize.BelongsToGetAssociationMixin<users>;
  setSalesman!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createSalesman!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof admin_notifications {
    return admin_notifications.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    entity_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    entity_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    salesman_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'admin_notifications',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "admin_notifications_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "admin_notifications_salesman_id_idx",
        fields: [
          { name: "salesman_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
