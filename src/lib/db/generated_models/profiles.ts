import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { credit_billing_statements, credit_billing_statementsId } from './credit_billing_statements';
import type { credit_payments, credit_paymentsId } from './credit_payments';
import type { credit_transactions, credit_transactionsId } from './credit_transactions';
import type { credit_wallets, credit_walletsCreationAttributes, credit_walletsId } from './credit_wallets';
import type { customer_assignments, customer_assignmentsCreationAttributes, customer_assignmentsId } from './customer_assignments';
import type { quotations, quotationsId } from './quotations';
import type { users, usersId } from './users';

export interface profilesAttributes {
  id: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
  customer_type: "IND" | "GAR" | "EXP";
  status: "pending" | "active" | "suspended";
  admin_notes?: string;
  approved_at?: Date;
  approved_by?: string;
  company_name?: string;
  trade_license?: string;
  vat_number?: string;
  credit_limit: number;
}

export type profilesPk = "id";
export type profilesId = profiles[profilesPk];
export type profilesOptionalAttributes = "full_name" | "phone" | "avatar_url" | "created_at" | "updated_at" | "customer_type" | "status" | "admin_notes" | "approved_at" | "approved_by" | "company_name" | "trade_license" | "vat_number" | "credit_limit";
export type profilesCreationAttributes = Optional<profilesAttributes, profilesOptionalAttributes>;

export class profiles extends Model<profilesAttributes, profilesCreationAttributes> implements profilesAttributes {
  id!: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at!: Date;
  updated_at!: Date;
  customer_type!: "IND" | "GAR" | "EXP";
  status!: "pending" | "active" | "suspended";
  admin_notes?: string;
  approved_at?: Date;
  approved_by?: string;
  company_name?: string;
  trade_license?: string;
  vat_number?: string;
  credit_limit!: number;

  // profiles hasMany credit_billing_statements via user_id
  credit_billing_statements!: credit_billing_statements[];
  getCredit_billing_statements!: Sequelize.HasManyGetAssociationsMixin<credit_billing_statements>;
  setCredit_billing_statements!: Sequelize.HasManySetAssociationsMixin<credit_billing_statements, credit_billing_statementsId>;
  addCredit_billing_statement!: Sequelize.HasManyAddAssociationMixin<credit_billing_statements, credit_billing_statementsId>;
  addCredit_billing_statements!: Sequelize.HasManyAddAssociationsMixin<credit_billing_statements, credit_billing_statementsId>;
  createCredit_billing_statement!: Sequelize.HasManyCreateAssociationMixin<credit_billing_statements>;
  removeCredit_billing_statement!: Sequelize.HasManyRemoveAssociationMixin<credit_billing_statements, credit_billing_statementsId>;
  removeCredit_billing_statements!: Sequelize.HasManyRemoveAssociationsMixin<credit_billing_statements, credit_billing_statementsId>;
  hasCredit_billing_statement!: Sequelize.HasManyHasAssociationMixin<credit_billing_statements, credit_billing_statementsId>;
  hasCredit_billing_statements!: Sequelize.HasManyHasAssociationsMixin<credit_billing_statements, credit_billing_statementsId>;
  countCredit_billing_statements!: Sequelize.HasManyCountAssociationsMixin;
  // profiles hasMany credit_payments via user_id
  credit_payments!: credit_payments[];
  getCredit_payments!: Sequelize.HasManyGetAssociationsMixin<credit_payments>;
  setCredit_payments!: Sequelize.HasManySetAssociationsMixin<credit_payments, credit_paymentsId>;
  addCredit_payment!: Sequelize.HasManyAddAssociationMixin<credit_payments, credit_paymentsId>;
  addCredit_payments!: Sequelize.HasManyAddAssociationsMixin<credit_payments, credit_paymentsId>;
  createCredit_payment!: Sequelize.HasManyCreateAssociationMixin<credit_payments>;
  removeCredit_payment!: Sequelize.HasManyRemoveAssociationMixin<credit_payments, credit_paymentsId>;
  removeCredit_payments!: Sequelize.HasManyRemoveAssociationsMixin<credit_payments, credit_paymentsId>;
  hasCredit_payment!: Sequelize.HasManyHasAssociationMixin<credit_payments, credit_paymentsId>;
  hasCredit_payments!: Sequelize.HasManyHasAssociationsMixin<credit_payments, credit_paymentsId>;
  countCredit_payments!: Sequelize.HasManyCountAssociationsMixin;
  // profiles hasMany credit_transactions via user_id
  credit_transactions!: credit_transactions[];
  getCredit_transactions!: Sequelize.HasManyGetAssociationsMixin<credit_transactions>;
  setCredit_transactions!: Sequelize.HasManySetAssociationsMixin<credit_transactions, credit_transactionsId>;
  addCredit_transaction!: Sequelize.HasManyAddAssociationMixin<credit_transactions, credit_transactionsId>;
  addCredit_transactions!: Sequelize.HasManyAddAssociationsMixin<credit_transactions, credit_transactionsId>;
  createCredit_transaction!: Sequelize.HasManyCreateAssociationMixin<credit_transactions>;
  removeCredit_transaction!: Sequelize.HasManyRemoveAssociationMixin<credit_transactions, credit_transactionsId>;
  removeCredit_transactions!: Sequelize.HasManyRemoveAssociationsMixin<credit_transactions, credit_transactionsId>;
  hasCredit_transaction!: Sequelize.HasManyHasAssociationMixin<credit_transactions, credit_transactionsId>;
  hasCredit_transactions!: Sequelize.HasManyHasAssociationsMixin<credit_transactions, credit_transactionsId>;
  countCredit_transactions!: Sequelize.HasManyCountAssociationsMixin;
  // profiles hasOne credit_wallets via user_id
  credit_wallet!: credit_wallets;
  getCredit_wallet!: Sequelize.HasOneGetAssociationMixin<credit_wallets>;
  setCredit_wallet!: Sequelize.HasOneSetAssociationMixin<credit_wallets, credit_walletsId>;
  createCredit_wallet!: Sequelize.HasOneCreateAssociationMixin<credit_wallets>;
  // profiles hasOne customer_assignments via customer_id
  customer_assignment!: customer_assignments;
  getCustomer_assignment!: Sequelize.HasOneGetAssociationMixin<customer_assignments>;
  setCustomer_assignment!: Sequelize.HasOneSetAssociationMixin<customer_assignments, customer_assignmentsId>;
  createCustomer_assignment!: Sequelize.HasOneCreateAssociationMixin<customer_assignments>;
  // profiles hasMany quotations via customer_id
  quotations!: quotations[];
  getQuotations!: Sequelize.HasManyGetAssociationsMixin<quotations>;
  setQuotations!: Sequelize.HasManySetAssociationsMixin<quotations, quotationsId>;
  addQuotation!: Sequelize.HasManyAddAssociationMixin<quotations, quotationsId>;
  addQuotations!: Sequelize.HasManyAddAssociationsMixin<quotations, quotationsId>;
  createQuotation!: Sequelize.HasManyCreateAssociationMixin<quotations>;
  removeQuotation!: Sequelize.HasManyRemoveAssociationMixin<quotations, quotationsId>;
  removeQuotations!: Sequelize.HasManyRemoveAssociationsMixin<quotations, quotationsId>;
  hasQuotation!: Sequelize.HasManyHasAssociationMixin<quotations, quotationsId>;
  hasQuotations!: Sequelize.HasManyHasAssociationsMixin<quotations, quotationsId>;
  countQuotations!: Sequelize.HasManyCountAssociationsMixin;
  // profiles belongsTo users via id
  id_user!: users;
  getId_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setId_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createId_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof profiles {
    return profiles.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    full_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customer_type: {
      type: DataTypes.ENUM("IND","GAR","EXP"),
      allowNull: false,
      defaultValue: "IND"
    },
    status: {
      type: DataTypes.ENUM("pending","active","suspended"),
      allowNull: false,
      defaultValue: "active"
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    company_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trade_license: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vat_number: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    credit_limit: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'profiles',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "profiles_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
