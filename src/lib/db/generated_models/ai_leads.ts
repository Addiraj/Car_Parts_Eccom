import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ai_chat_threads, ai_chat_threadsId } from './ai_chat_threads';
import type { users, usersId } from './users';

export interface ai_leadsAttributes {
  id: string;
  thread_id?: string;
  user_id?: string;
  name?: string;
  phone?: string;
  email?: string;
  vehicle: object;
  reason?: string;
  status: string;
  assigned_salesman_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type ai_leadsPk = "id";
export type ai_leadsId = ai_leads[ai_leadsPk];
export type ai_leadsOptionalAttributes = "id" | "thread_id" | "user_id" | "name" | "phone" | "email" | "vehicle" | "reason" | "status" | "assigned_salesman_id" | "notes" | "created_at" | "updated_at";
export type ai_leadsCreationAttributes = Optional<ai_leadsAttributes, ai_leadsOptionalAttributes>;

export class ai_leads extends Model<ai_leadsAttributes, ai_leadsCreationAttributes> implements ai_leadsAttributes {
  id!: string;
  thread_id?: string;
  user_id?: string;
  name?: string;
  phone?: string;
  email?: string;
  vehicle!: object;
  reason?: string;
  status!: string;
  assigned_salesman_id?: string;
  notes?: string;
  created_at!: Date;
  updated_at!: Date;

  // ai_leads belongsTo ai_chat_threads via thread_id
  thread!: ai_chat_threads;
  getThread!: Sequelize.BelongsToGetAssociationMixin<ai_chat_threads>;
  setThread!: Sequelize.BelongsToSetAssociationMixin<ai_chat_threads, ai_chat_threadsId>;
  createThread!: Sequelize.BelongsToCreateAssociationMixin<ai_chat_threads>;
  // ai_leads belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ai_leads {
    return ai_leads.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    thread_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ai_chat_threads',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vehicle: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "new"
    },
    assigned_salesman_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ai_leads',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "ai_leads_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ai_leads_salesman_idx",
        fields: [
          { name: "assigned_salesman_id" },
        ]
      },
      {
        name: "ai_leads_status_idx",
        fields: [
          { name: "status" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
