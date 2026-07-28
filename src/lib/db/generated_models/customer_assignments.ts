import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { profiles, profilesId } from './profiles';
import type { salesmen, salesmenId } from './salesmen';

export interface customer_assignmentsAttributes {
  id: string;
  customer_id: string;
  salesman_id: string;
  assigned_by?: string;
  assigned_at: Date;
  last_activity_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type customer_assignmentsPk = "id";
export type customer_assignmentsId = customer_assignments[customer_assignmentsPk];
export type customer_assignmentsOptionalAttributes = "id" | "assigned_by" | "assigned_at" | "last_activity_at" | "created_at" | "updated_at";
export type customer_assignmentsCreationAttributes = Optional<customer_assignmentsAttributes, customer_assignmentsOptionalAttributes>;

export class customer_assignments extends Model<customer_assignmentsAttributes, customer_assignmentsCreationAttributes> implements customer_assignmentsAttributes {
  id!: string;
  customer_id!: string;
  salesman_id!: string;
  assigned_by?: string;
  assigned_at!: Date;
  last_activity_at?: Date;
  created_at!: Date;
  updated_at!: Date;

  // customer_assignments belongsTo profiles via customer_id
  customer!: profiles;
  getCustomer!: Sequelize.BelongsToGetAssociationMixin<profiles>;
  setCustomer!: Sequelize.BelongsToSetAssociationMixin<profiles, profilesId>;
  createCustomer!: Sequelize.BelongsToCreateAssociationMixin<profiles>;
  // customer_assignments belongsTo salesmen via salesman_id
  salesman!: salesmen;
  getSalesman!: Sequelize.BelongsToGetAssociationMixin<salesmen>;
  setSalesman!: Sequelize.BelongsToSetAssociationMixin<salesmen, salesmenId>;
  createSalesman!: Sequelize.BelongsToCreateAssociationMixin<salesmen>;

  static initModel(sequelize: Sequelize.Sequelize): typeof customer_assignments {
    return customer_assignments.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'profiles',
        key: 'id'
      },
      unique: "customer_assignments_customer_id_key"
    },
    salesman_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'salesmen',
        key: 'id'
      }
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    last_activity_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'customer_assignments',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "customer_assignments_customer_id_key",
        unique: true,
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "customer_assignments_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_assignments_salesman",
        fields: [
          { name: "salesman_id" },
        ]
      },
    ]
  });
  }
}
