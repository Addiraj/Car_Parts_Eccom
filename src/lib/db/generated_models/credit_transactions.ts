import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { credit_wallets, credit_walletsId } from './credit_wallets';
import type { orders, ordersId } from './orders';
import type { profiles, profilesId } from './profiles';

export interface credit_transactionsAttributes {
  id: string;
  wallet_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  order_id?: string;
  reason?: string;
  remarks?: string;
  updated_by?: string;
  updated_by_name?: string;
  updated_by_email?: string;
  created_at: Date;
}

export type credit_transactionsPk = "id";
export type credit_transactionsId = credit_transactions[credit_transactionsPk];
export type credit_transactionsOptionalAttributes = "id" | "order_id" | "reason" | "remarks" | "updated_by" | "updated_by_name" | "updated_by_email" | "created_at";
export type credit_transactionsCreationAttributes = Optional<credit_transactionsAttributes, credit_transactionsOptionalAttributes>;

export class credit_transactions extends Model<credit_transactionsAttributes, credit_transactionsCreationAttributes> implements credit_transactionsAttributes {
  id!: string;
  wallet_id!: string;
  user_id!: string;
  type!: string;
  amount!: number;
  balance_after!: number;
  order_id?: string;
  reason?: string;
  remarks?: string;
  updated_by?: string;
  updated_by_name?: string;
  updated_by_email?: string;
  created_at!: Date;

  // credit_transactions belongsTo credit_wallets via wallet_id
  wallet!: credit_wallets;
  getWallet!: Sequelize.BelongsToGetAssociationMixin<credit_wallets>;
  setWallet!: Sequelize.BelongsToSetAssociationMixin<credit_wallets, credit_walletsId>;
  createWallet!: Sequelize.BelongsToCreateAssociationMixin<credit_wallets>;
  // credit_transactions belongsTo orders via order_id
  order!: orders;
  getOrder!: Sequelize.BelongsToGetAssociationMixin<orders>;
  setOrder!: Sequelize.BelongsToSetAssociationMixin<orders, ordersId>;
  createOrder!: Sequelize.BelongsToCreateAssociationMixin<orders>;
  // credit_transactions belongsTo profiles via user_id
  user!: profiles;
  getUser!: Sequelize.BelongsToGetAssociationMixin<profiles>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<profiles, profilesId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<profiles>;

  static initModel(sequelize: Sequelize.Sequelize): typeof credit_transactions {
    return credit_transactions.init({
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
    type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    balance_after: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    updated_by_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated_by_email: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'credit_transactions',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "credit_transactions_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ix_credit_tx_user",
        fields: [
          { name: "user_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "ix_credit_tx_wallet",
        fields: [
          { name: "wallet_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
