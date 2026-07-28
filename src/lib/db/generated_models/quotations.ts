import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { orders, ordersId } from './orders';
import type { profiles, profilesId } from './profiles';
import type { quotation_events, quotation_eventsId } from './quotation_events';
import type { quotation_items, quotation_itemsId } from './quotation_items';
import type { users, usersId } from './users';

export interface quotationsAttributes {
  id: string;
  quotation_number: string;
  customer_id?: string;
  customer_snapshot: object;
  status: "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";
  currency: string;
  subtotal: number;
  discount_type: "percent" | "fixed";
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  grand_total: number;
  notes?: string;
  terms?: string;
  valid_until?: Date;
  share_token: string;
  created_by?: string;
  sent_at?: Date;
  approved_at?: Date;
  rejected_at?: Date;
  converted_at?: Date;
  converted_order_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type quotationsPk = "id";
export type quotationsId = quotations[quotationsPk];
export type quotationsOptionalAttributes = "id" | "quotation_number" | "customer_id" | "customer_snapshot" | "status" | "currency" | "subtotal" | "discount_type" | "discount_value" | "discount_amount" | "tax_rate" | "tax_amount" | "shipping_amount" | "grand_total" | "notes" | "terms" | "valid_until" | "share_token" | "created_by" | "sent_at" | "approved_at" | "rejected_at" | "converted_at" | "converted_order_id" | "created_at" | "updated_at";
export type quotationsCreationAttributes = Optional<quotationsAttributes, quotationsOptionalAttributes>;

export class quotations extends Model<quotationsAttributes, quotationsCreationAttributes> implements quotationsAttributes {
  id!: string;
  quotation_number!: string;
  customer_id?: string;
  customer_snapshot!: object;
  status!: "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";
  currency!: string;
  subtotal!: number;
  discount_type!: "percent" | "fixed";
  discount_value!: number;
  discount_amount!: number;
  tax_rate!: number;
  tax_amount!: number;
  shipping_amount!: number;
  grand_total!: number;
  notes?: string;
  terms?: string;
  valid_until?: Date;
  share_token!: string;
  created_by?: string;
  sent_at?: Date;
  approved_at?: Date;
  rejected_at?: Date;
  converted_at?: Date;
  converted_order_id?: string;
  created_at!: Date;
  updated_at!: Date;

  // quotations belongsTo orders via converted_order_id
  converted_order!: orders;
  getConverted_order!: Sequelize.BelongsToGetAssociationMixin<orders>;
  setConverted_order!: Sequelize.BelongsToSetAssociationMixin<orders, ordersId>;
  createConverted_order!: Sequelize.BelongsToCreateAssociationMixin<orders>;
  // quotations belongsTo profiles via customer_id
  customer!: profiles;
  getCustomer!: Sequelize.BelongsToGetAssociationMixin<profiles>;
  setCustomer!: Sequelize.BelongsToSetAssociationMixin<profiles, profilesId>;
  createCustomer!: Sequelize.BelongsToCreateAssociationMixin<profiles>;
  // quotations hasMany quotation_events via quotation_id
  quotation_events!: quotation_events[];
  getQuotation_events!: Sequelize.HasManyGetAssociationsMixin<quotation_events>;
  setQuotation_events!: Sequelize.HasManySetAssociationsMixin<quotation_events, quotation_eventsId>;
  addQuotation_event!: Sequelize.HasManyAddAssociationMixin<quotation_events, quotation_eventsId>;
  addQuotation_events!: Sequelize.HasManyAddAssociationsMixin<quotation_events, quotation_eventsId>;
  createQuotation_event!: Sequelize.HasManyCreateAssociationMixin<quotation_events>;
  removeQuotation_event!: Sequelize.HasManyRemoveAssociationMixin<quotation_events, quotation_eventsId>;
  removeQuotation_events!: Sequelize.HasManyRemoveAssociationsMixin<quotation_events, quotation_eventsId>;
  hasQuotation_event!: Sequelize.HasManyHasAssociationMixin<quotation_events, quotation_eventsId>;
  hasQuotation_events!: Sequelize.HasManyHasAssociationsMixin<quotation_events, quotation_eventsId>;
  countQuotation_events!: Sequelize.HasManyCountAssociationsMixin;
  // quotations hasMany quotation_items via quotation_id
  quotation_items!: quotation_items[];
  getQuotation_items!: Sequelize.HasManyGetAssociationsMixin<quotation_items>;
  setQuotation_items!: Sequelize.HasManySetAssociationsMixin<quotation_items, quotation_itemsId>;
  addQuotation_item!: Sequelize.HasManyAddAssociationMixin<quotation_items, quotation_itemsId>;
  addQuotation_items!: Sequelize.HasManyAddAssociationsMixin<quotation_items, quotation_itemsId>;
  createQuotation_item!: Sequelize.HasManyCreateAssociationMixin<quotation_items>;
  removeQuotation_item!: Sequelize.HasManyRemoveAssociationMixin<quotation_items, quotation_itemsId>;
  removeQuotation_items!: Sequelize.HasManyRemoveAssociationsMixin<quotation_items, quotation_itemsId>;
  hasQuotation_item!: Sequelize.HasManyHasAssociationMixin<quotation_items, quotation_itemsId>;
  hasQuotation_items!: Sequelize.HasManyHasAssociationsMixin<quotation_items, quotation_itemsId>;
  countQuotation_items!: Sequelize.HasManyCountAssociationsMixin;
  // quotations belongsTo users via created_by
  created_by_user!: users;
  getCreated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setCreated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createCreated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof quotations {
    return quotations.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quotation_number: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('next_quotation_number'),
      unique: "quotations_quotation_number_key"
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'profiles',
        key: 'id'
      }
    },
    customer_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM("draft","sent","approved","rejected","expired","converted"),
      allowNull: false,
      defaultValue: "draft"
    },
    currency: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "AED"
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    discount_type: {
      type: DataTypes.ENUM("percent","fixed"),
      allowNull: false,
      defaultValue: "percent"
    },
    discount_value: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    discount_amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    tax_rate: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 5
    },
    tax_amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    shipping_amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    grand_total: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    share_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "encode(gen_random_bytes(16), hex",
      unique: "quotations_share_token_key"
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    converted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    converted_order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'quotations',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "quotations_created_idx",
        fields: [
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "quotations_customer_idx",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "quotations_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "quotations_quotation_number_key",
        unique: true,
        fields: [
          { name: "quotation_number" },
        ]
      },
      {
        name: "quotations_share_token_key",
        unique: true,
        fields: [
          { name: "share_token" },
        ]
      },
      {
        name: "quotations_status_idx",
        fields: [
          { name: "status" },
        ]
      },
    ]
  });
  }
}
