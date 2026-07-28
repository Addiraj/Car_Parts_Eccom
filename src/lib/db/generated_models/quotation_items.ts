import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { parts, partsId } from './parts';
import type { quotations, quotationsId } from './quotations';

export interface quotation_itemsAttributes {
  id: string;
  quotation_id: string;
  part_id?: string;
  part_snapshot: object;
  quantity: number;
  unit_price: number;
  custom_price?: number;
  line_discount: number;
  line_total: number;
  sort_order: number;
  created_at: Date;
}

export type quotation_itemsPk = "id";
export type quotation_itemsId = quotation_items[quotation_itemsPk];
export type quotation_itemsOptionalAttributes = "id" | "part_id" | "part_snapshot" | "quantity" | "unit_price" | "custom_price" | "line_discount" | "line_total" | "sort_order" | "created_at";
export type quotation_itemsCreationAttributes = Optional<quotation_itemsAttributes, quotation_itemsOptionalAttributes>;

export class quotation_items extends Model<quotation_itemsAttributes, quotation_itemsCreationAttributes> implements quotation_itemsAttributes {
  id!: string;
  quotation_id!: string;
  part_id?: string;
  part_snapshot!: object;
  quantity!: number;
  unit_price!: number;
  custom_price?: number;
  line_discount!: number;
  line_total!: number;
  sort_order!: number;
  created_at!: Date;

  // quotation_items belongsTo parts via part_id
  part!: parts;
  getPart!: Sequelize.BelongsToGetAssociationMixin<parts>;
  setPart!: Sequelize.BelongsToSetAssociationMixin<parts, partsId>;
  createPart!: Sequelize.BelongsToCreateAssociationMixin<parts>;
  // quotation_items belongsTo quotations via quotation_id
  quotation!: quotations;
  getQuotation!: Sequelize.BelongsToGetAssociationMixin<quotations>;
  setQuotation!: Sequelize.BelongsToSetAssociationMixin<quotations, quotationsId>;
  createQuotation!: Sequelize.BelongsToCreateAssociationMixin<quotations>;

  static initModel(sequelize: Sequelize.Sequelize): typeof quotation_items {
    return quotation_items.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quotation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'quotations',
        key: 'id'
      }
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'parts',
        key: 'id'
      }
    },
    part_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    unit_price: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    custom_price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    line_discount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    line_total: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'quotation_items',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "quotation_items_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "quotation_items_q_idx",
        fields: [
          { name: "quotation_id" },
        ]
      },
    ]
  });
  }
}
