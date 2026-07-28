import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { credit_payments, credit_paymentsId } from './credit_payments';
import type { credit_wallets, credit_walletsId } from './credit_wallets';
import type { profiles, profilesId } from './profiles';

export interface credit_billing_statementsAttributes {
  id: string;
  statement_number: string;
  wallet_id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  outstanding_amount: number;
  amount_paid: number;
  due_date: string;
  status: string;
  notes?: string;
  generated_by?: string;
  created_at: Date;
}

export type credit_billing_statementsPk = "id";
export type credit_billing_statementsId = credit_billing_statements[credit_billing_statementsPk];
export type credit_billing_statementsOptionalAttributes = "id" | "total_debits" | "total_credits" | "amount_paid" | "status" | "notes" | "generated_by" | "created_at";
export type credit_billing_statementsCreationAttributes = Optional<credit_billing_statementsAttributes, credit_billing_statementsOptionalAttributes>;

export class credit_billing_statements extends Model<credit_billing_statementsAttributes, credit_billing_statementsCreationAttributes> implements credit_billing_statementsAttributes {
  id!: string;
  statement_number!: string;
  wallet_id!: string;
  user_id!: string;
  period_start!: string;
  period_end!: string;
  opening_balance!: number;
  total_debits!: number;
  total_credits!: number;
  closing_balance!: number;
  outstanding_amount!: number;
  amount_paid!: number;
  due_date!: string;
  status!: string;
  notes?: string;
  generated_by?: string;
  created_at!: Date;

  // credit_billing_statements hasMany credit_payments via statement_id
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
  // credit_billing_statements belongsTo credit_wallets via wallet_id
  wallet!: credit_wallets;
  getWallet!: Sequelize.BelongsToGetAssociationMixin<credit_wallets>;
  setWallet!: Sequelize.BelongsToSetAssociationMixin<credit_wallets, credit_walletsId>;
  createWallet!: Sequelize.BelongsToCreateAssociationMixin<credit_wallets>;
  // credit_billing_statements belongsTo profiles via user_id
  user!: profiles;
  getUser!: Sequelize.BelongsToGetAssociationMixin<profiles>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<profiles, profilesId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<profiles>;

  static initModel(sequelize: Sequelize.Sequelize): typeof credit_billing_statements {
    return credit_billing_statements.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    statement_number: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "credit_billing_statements_statement_number_key"
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'credit_wallets',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'profiles',
        key: 'id'
      }
    },
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    opening_balance: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    total_debits: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    total_credits: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    closing_balance: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    outstanding_amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    amount_paid: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "unpaid"
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    generated_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'credit_billing_statements',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "credit_billing_statements_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "credit_billing_statements_statement_number_key",
        unique: true,
        fields: [
          { name: "statement_number" },
        ]
      },
      {
        name: "ix_stmts_wallet",
        fields: [
          { name: "wallet_id" },
          { name: "period_end", order: "DESC" },
        ]
      },
    ]
  });
  }
}
