import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { admin_notifications, admin_notificationsId } from './admin_notifications';
import type { users, usersId } from './users';

export interface admin_notification_readsAttributes {
  notification_id: string;
  admin_id: string;
  read_at: Date;
}

export type admin_notification_readsPk = "notification_id" | "admin_id";
export type admin_notification_readsId = admin_notification_reads[admin_notification_readsPk];
export type admin_notification_readsOptionalAttributes = "read_at";
export type admin_notification_readsCreationAttributes = Optional<admin_notification_readsAttributes, admin_notification_readsOptionalAttributes>;

export class admin_notification_reads extends Model<admin_notification_readsAttributes, admin_notification_readsCreationAttributes> implements admin_notification_readsAttributes {
  notification_id!: string;
  admin_id!: string;
  read_at!: Date;

  // admin_notification_reads belongsTo admin_notifications via notification_id
  notification!: admin_notifications;
  getNotification!: Sequelize.BelongsToGetAssociationMixin<admin_notifications>;
  setNotification!: Sequelize.BelongsToSetAssociationMixin<admin_notifications, admin_notificationsId>;
  createNotification!: Sequelize.BelongsToCreateAssociationMixin<admin_notifications>;
  // admin_notification_reads belongsTo users via admin_id
  admin!: users;
  getAdmin!: Sequelize.BelongsToGetAssociationMixin<users>;
  setAdmin!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createAdmin!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof admin_notification_reads {
    return admin_notification_reads.init({
    notification_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'admin_notifications',
        key: 'id'
      }
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'admin_notification_reads',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "admin_notification_reads_pkey",
        unique: true,
        fields: [
          { name: "notification_id" },
          { name: "admin_id" },
        ]
      },
    ]
  });
  }
}
