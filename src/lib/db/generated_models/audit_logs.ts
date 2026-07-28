import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface audit_logsAttributes {
  id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  before?: object;
  after?: object;
  ip?: string;
  user_agent?: string;
  created_at: Date;
  customer_id?: string;
}

export type audit_logsPk = "id";
export type audit_logsId = audit_logs[audit_logsPk];
export type audit_logsOptionalAttributes = "id" | "actor_id" | "actor_email" | "entity_type" | "entity_id" | "before" | "after" | "ip" | "user_agent" | "created_at" | "customer_id";
export type audit_logsCreationAttributes = Optional<audit_logsAttributes, audit_logsOptionalAttributes>;

export class audit_logs extends Model<audit_logsAttributes, audit_logsCreationAttributes> implements audit_logsAttributes {
  id!: string;
  actor_id?: string;
  actor_email?: string;
  action!: string;
  entity_type?: string;
  entity_id?: string;
  before?: object;
  after?: object;
  ip?: string;
  user_agent?: string;
  created_at!: Date;
  customer_id?: string;


  static initModel(sequelize: Sequelize.Sequelize): typeof audit_logs {
    return audit_logs.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actor_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    actor_email: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    entity_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    before: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    after: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'audit_logs',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "audit_logs_actor_idx",
        fields: [
          { name: "actor_id" },
        ]
      },
      {
        name: "audit_logs_created_idx",
        fields: [
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "audit_logs_entity_idx",
        fields: [
          { name: "entity_type" },
          { name: "entity_id" },
        ]
      },
      {
        name: "audit_logs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_audit_logs_created",
        fields: [
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "idx_audit_logs_customer",
        fields: [
          { name: "customer_id" },
        ]
      },
    ]
  });
  }
}
