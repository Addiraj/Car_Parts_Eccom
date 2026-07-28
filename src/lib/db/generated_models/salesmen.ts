import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { customer_assignments, customer_assignmentsId } from './customer_assignments';
import type { users, usersId } from './users';

export interface salesmenAttributes {
  id: string;
  employee_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  territory?: string;
  status: "active" | "inactive";
  joining_date?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export type salesmenPk = "id";
export type salesmenId = salesmen[salesmenPk];
export type salesmenOptionalAttributes = "employee_id" | "phone" | "photo_url" | "territory" | "status" | "joining_date" | "created_by" | "created_at" | "updated_at";
export type salesmenCreationAttributes = Optional<salesmenAttributes, salesmenOptionalAttributes>;

export class salesmen extends Model<salesmenAttributes, salesmenCreationAttributes> implements salesmenAttributes {
  id!: string;
  employee_id?: string;
  full_name!: string;
  email!: string;
  phone?: string;
  photo_url?: string;
  territory?: string;
  status!: "active" | "inactive";
  joining_date?: string;
  created_by?: string;
  created_at!: Date;
  updated_at!: Date;

  // salesmen hasMany customer_assignments via salesman_id
  customer_assignments!: customer_assignments[];
  getCustomer_assignments!: Sequelize.HasManyGetAssociationsMixin<customer_assignments>;
  setCustomer_assignments!: Sequelize.HasManySetAssociationsMixin<customer_assignments, customer_assignmentsId>;
  addCustomer_assignment!: Sequelize.HasManyAddAssociationMixin<customer_assignments, customer_assignmentsId>;
  addCustomer_assignments!: Sequelize.HasManyAddAssociationsMixin<customer_assignments, customer_assignmentsId>;
  createCustomer_assignment!: Sequelize.HasManyCreateAssociationMixin<customer_assignments>;
  removeCustomer_assignment!: Sequelize.HasManyRemoveAssociationMixin<customer_assignments, customer_assignmentsId>;
  removeCustomer_assignments!: Sequelize.HasManyRemoveAssociationsMixin<customer_assignments, customer_assignmentsId>;
  hasCustomer_assignment!: Sequelize.HasManyHasAssociationMixin<customer_assignments, customer_assignmentsId>;
  hasCustomer_assignments!: Sequelize.HasManyHasAssociationsMixin<customer_assignments, customer_assignmentsId>;
  countCustomer_assignments!: Sequelize.HasManyCountAssociationsMixin;
  // salesmen belongsTo users via id
  id_user!: users;
  getId_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setId_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createId_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof salesmen {
    return salesmen.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: "salesmen_employee_id_key"
    },
    full_name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    photo_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    territory: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("active","inactive"),
      allowNull: false,
      defaultValue: "active"
    },
    joining_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'salesmen',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "salesmen_employee_id_key",
        unique: true,
        fields: [
          { name: "employee_id" },
        ]
      },
      {
        name: "salesmen_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
