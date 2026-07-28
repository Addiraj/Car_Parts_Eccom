import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { credit_billing_statements, credit_billing_statementsId } from './credit_billing_statements';
import type { credit_wallets, credit_walletsId } from './credit_wallets';
import type { profiles, profilesId } from './profiles';

export interface credit_paymentsAttributes {
  id: string;
  wallet_id: string;
  user_id: string;
  statement_id?: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  notes?: string;
  recorded_by: string;
  recorded_by_name?: string;
  created_at: Date;
}

export type credit_paymentsPk = "id";
export type credit_paymentsId = credit_payments[credit_paymentsPk];
export type credit_paymentsOptionalAttributes = "id" | "statement_id" | "payment_reference" | "payment_date" | "notes" | "recorded_by_name" | "created_at";
export type credit_paymentsCreationAttributes = Optional<credit_paymentsAttributes, credit_paymentsOptionalAttributes>;

export class credit_payments extends Model<credit_paymentsAttributes, credit_paymentsCreationAttributes> implements credit_paymentsAttributes {
  id!: string;
  wallet_id!: string;
  user_id!: string;
  statement_id?: string;
  amount!: number;
  payment_method!: string;
  payment_reference?: string;
  payment_date!: string;
  notes?: string;
  recorded_by!: string;
  recorded_by_name?: string;
  created_at!: Date;

  // credit_payments belongsTo credit_billing_statements via statement_id
  statement!: credit_billing_statements;
  getStatement!: Sequelize.BelongsToGetAssociationMixin<credit_billing_statements>;
  setStatement!: Sequelize.BelongsToSetAssociationMixin<credit_billing_statements, credit_billing_statementsId>;
  createStatement!: Sequelize.BelongsToCreateAssociationMixin<credit_billing_statements>;
  // credit_payments belongsTo credit_wallets via wallet_id
  wallet!: credit_wallets;
  getWallet!: Sequelize.BelongsToGetAssociationMixin<credit_wallets>;
  setWallet!: Sequelize.BelongsToSetAssociationMixin<credit_wallets, credit_walletsId>;
  createWallet!: Sequelize.BelongsToCreateAssociationMixin<credit_wallets>;
  // credit_payments belongsTo profiles via user_id
  user!: profiles;
  getUser!: Sequelize.BelongsToGetAssociationMixin<profiles>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<profiles, profilesId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<profiles>;

  static initModel(sequelize: Sequelize.Sequelize): typeof credit_payments {
    return credit_payments.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    statement_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'credit_billing_statements',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    payment_method: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    payment_reference: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_DATE')
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recorded_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    recorded_by_name: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'credit_payments',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "credit_payments_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ix_pay_wallet",
        fields: [
          { name: "wallet_id" },
          { name: "payment_date", order: "DESC" },
        ]
      },
    ]
  });
  }
}
