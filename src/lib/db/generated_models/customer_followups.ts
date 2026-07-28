import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface customer_followupsAttributes {
  id: string;
  customer_id: string;
  assigned_to: string;
  title: string;
  description?: string;
  due_at: Date;
  status: "pending" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  completed_at?: Date;
  completed_by?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type customer_followupsPk = "id";
export type customer_followupsId = customer_followups[customer_followupsPk];
export type customer_followupsOptionalAttributes = "id" | "description" | "status" | "priority" | "completed_at" | "completed_by" | "created_at" | "updated_at";
export type customer_followupsCreationAttributes = Optional<customer_followupsAttributes, customer_followupsOptionalAttributes>;

export class customer_followups extends Model<customer_followupsAttributes, customer_followupsCreationAttributes> implements customer_followupsAttributes {
  id!: string;
  customer_id!: string;
  assigned_to!: string;
  title!: string;
  description?: string;
  due_at!: Date;
  status!: "pending" | "completed" | "cancelled";
  priority!: "low" | "medium" | "high";
  completed_at?: Date;
  completed_by?: string;
  created_by!: string;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof customer_followups {
    return customer_followups.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: false
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    due_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("pending","completed","cancelled"),
      allowNull: false,
      defaultValue: "pending"
    },
    priority: {
      type: DataTypes.ENUM("low","medium","high"),
      allowNull: false,
      defaultValue: "medium"
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'customer_followups',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "customer_followups_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_followups_assigned",
        fields: [
          { name: "assigned_to" },
          { name: "status" },
          { name: "due_at" },
        ]
      },
      {
        name: "idx_followups_customer",
        fields: [
          { name: "customer_id" },
          { name: "due_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
