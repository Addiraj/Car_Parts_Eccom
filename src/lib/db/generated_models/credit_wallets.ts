import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { credit_billing_statements, credit_billing_statementsId } from './credit_billing_statements';
import type { credit_payments, credit_paymentsId } from './credit_payments';
import type { credit_transactions, credit_transactionsId } from './credit_transactions';
import type { profiles, profilesId } from './profiles';

export interface credit_walletsAttributes {
  id: string;
  user_id: string;
  credit_limit: number;
  available_balance: number;
  currency: string;
  is_active: boolean;
  payment_terms_days: number;
  auto_freeze_on_overdue: boolean;
  frozen_at?: Date;
  freeze_reason?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type credit_walletsPk = "id";
export type credit_walletsId = credit_wallets[credit_walletsPk];
export type credit_walletsOptionalAttributes = "id" | "credit_limit" | "available_balance" | "currency" | "is_active" | "payment_terms_days" | "auto_freeze_on_overdue" | "frozen_at" | "freeze_reason" | "notes" | "created_at" | "updated_at";
export type credit_walletsCreationAttributes = Optional<credit_walletsAttributes, credit_walletsOptionalAttributes>;

export class credit_wallets extends Model<credit_walletsAttributes, credit_walletsCreationAttributes> implements credit_walletsAttributes {
  id!: string;
  user_id!: string;
  credit_limit!: number;
  available_balance!: number;
  currency!: string;
  is_active!: boolean;
  payment_terms_days!: number;
  auto_freeze_on_overdue!: boolean;
  frozen_at?: Date;
  freeze_reason?: string;
  notes?: string;
  created_at!: Date;
  updated_at!: Date;

  // credit_wallets hasMany credit_billing_statements via wallet_id
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
  // credit_wallets hasMany credit_payments via wallet_id
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
  // credit_wallets hasMany credit_transactions via wallet_id
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
  // credit_wallets belongsTo profiles via user_id
  user!: profiles;
  getUser!: Sequelize.BelongsToGetAssociationMixin<profiles>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<profiles, profilesId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<profiles>;

  static initModel(sequelize: Sequelize.Sequelize): typeof credit_wallets {
    return credit_wallets.init({
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
        model: 'profiles',
        key: 'id'
      },
      unique: "credit_wallets_user_id_key"
    },
    credit_limit: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.00
    },
    available_balance: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.00
    },
    currency: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "AED"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    payment_terms_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    auto_freeze_on_overdue: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    frozen_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    freeze_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'credit_wallets',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "credit_wallets_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "credit_wallets_user_id_key",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
  }
}
