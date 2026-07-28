import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { credit_transactions, credit_transactionsId } from './credit_transactions';
import type { order_events, order_eventsId } from './order_events';
import type { order_items, order_itemsId } from './order_items';
import type { quotations, quotationsId } from './quotations';

export interface ordersAttributes {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  payment_method: string;
  subtotal: number;
  vat: number;
  shipping_fee: number;
  discount: number;
  total: number;
  currency: string;
  coupon_code?: string;
  shipping_address: object;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  customer_type?: "IND" | "GAR" | "EXP";
  courier?: string;
  tracking_number?: string;
  tracking_url?: string;
  paid_at?: Date;
  shipped_at?: Date;
  delivered_at?: Date;
  cancelled_at?: Date;
  refunded_at?: Date;
  refund_amount?: number;
  refund_reason?: string;
  internal_notes?: string;
  payment_provider?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  payment_status?: string;
  amount_paid?: number;
  payment_currency?: string;
}

export type ordersPk = "id";
export type ordersId = orders[ordersPk];
export type ordersOptionalAttributes = "id" | "order_number" | "status" | "payment_method" | "subtotal" | "vat" | "shipping_fee" | "discount" | "total" | "currency" | "coupon_code" | "notes" | "created_at" | "updated_at" | "customer_type" | "courier" | "tracking_number" | "tracking_url" | "paid_at" | "shipped_at" | "delivered_at" | "cancelled_at" | "refunded_at" | "refund_amount" | "refund_reason" | "internal_notes" | "payment_provider" | "stripe_session_id" | "stripe_payment_intent_id" | "payment_status" | "amount_paid" | "payment_currency";
export type ordersCreationAttributes = Optional<ordersAttributes, ordersOptionalAttributes>;

export class orders extends Model<ordersAttributes, ordersCreationAttributes> implements ordersAttributes {
  id!: string;
  order_number!: string;
  user_id!: string;
  status!: string;
  payment_method!: string;
  subtotal!: number;
  vat!: number;
  shipping_fee!: number;
  discount!: number;
  total!: number;
  currency!: string;
  coupon_code?: string;
  shipping_address!: object;
  notes?: string;
  created_at!: Date;
  updated_at!: Date;
  customer_type?: "IND" | "GAR" | "EXP";
  courier?: string;
  tracking_number?: string;
  tracking_url?: string;
  paid_at?: Date;
  shipped_at?: Date;
  delivered_at?: Date;
  cancelled_at?: Date;
  refunded_at?: Date;
  refund_amount?: number;
  refund_reason?: string;
  internal_notes?: string;
  payment_provider?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  payment_status?: string;
  amount_paid?: number;
  payment_currency?: string;

  // orders hasMany credit_transactions via order_id
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
  // orders hasMany order_events via order_id
  order_events!: order_events[];
  getOrder_events!: Sequelize.HasManyGetAssociationsMixin<order_events>;
  setOrder_events!: Sequelize.HasManySetAssociationsMixin<order_events, order_eventsId>;
  addOrder_event!: Sequelize.HasManyAddAssociationMixin<order_events, order_eventsId>;
  addOrder_events!: Sequelize.HasManyAddAssociationsMixin<order_events, order_eventsId>;
  createOrder_event!: Sequelize.HasManyCreateAssociationMixin<order_events>;
  removeOrder_event!: Sequelize.HasManyRemoveAssociationMixin<order_events, order_eventsId>;
  removeOrder_events!: Sequelize.HasManyRemoveAssociationsMixin<order_events, order_eventsId>;
  hasOrder_event!: Sequelize.HasManyHasAssociationMixin<order_events, order_eventsId>;
  hasOrder_events!: Sequelize.HasManyHasAssociationsMixin<order_events, order_eventsId>;
  countOrder_events!: Sequelize.HasManyCountAssociationsMixin;
  // orders hasMany order_items via order_id
  order_items!: order_items[];
  getOrder_items!: Sequelize.HasManyGetAssociationsMixin<order_items>;
  setOrder_items!: Sequelize.HasManySetAssociationsMixin<order_items, order_itemsId>;
  addOrder_item!: Sequelize.HasManyAddAssociationMixin<order_items, order_itemsId>;
  addOrder_items!: Sequelize.HasManyAddAssociationsMixin<order_items, order_itemsId>;
  createOrder_item!: Sequelize.HasManyCreateAssociationMixin<order_items>;
  removeOrder_item!: Sequelize.HasManyRemoveAssociationMixin<order_items, order_itemsId>;
  removeOrder_items!: Sequelize.HasManyRemoveAssociationsMixin<order_items, order_itemsId>;
  hasOrder_item!: Sequelize.HasManyHasAssociationMixin<order_items, order_itemsId>;
  hasOrder_items!: Sequelize.HasManyHasAssociationsMixin<order_items, order_itemsId>;
  countOrder_items!: Sequelize.HasManyCountAssociationsMixin;
  // orders hasMany quotations via converted_order_id
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

  static initModel(sequelize: Sequelize.Sequelize): typeof orders {
    return orders.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_number: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "(((CPD-",
      unique: "orders_order_number_key"
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "placed"
    },
    payment_method: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "cod"
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    vat: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    shipping_fee: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    discount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "AED"
    },
    coupon_code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    shipping_address: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customer_type: {
      type: DataTypes.ENUM("IND","GAR","EXP"),
      allowNull: true
    },
    courier: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tracking_number: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tracking_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    shipped_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refund_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0
    },
    refund_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    internal_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_provider: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stripe_session_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stripe_payment_intent_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_status: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount_paid: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    payment_currency: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'orders',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "idx_orders_user",
        fields: [
          { name: "user_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "orders_order_number_key",
        unique: true,
        fields: [
          { name: "order_number" },
        ]
      },
      {
        name: "orders_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "orders_stripe_payment_intent_id_idx",
        fields: [
          { name: "stripe_payment_intent_id" },
        ]
      },
      {
        name: "orders_stripe_session_id_idx",
        fields: [
          { name: "stripe_session_id" },
        ]
      },
    ]
  });
  }
}
