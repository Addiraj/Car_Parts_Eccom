import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface couponsAttributes {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_uses?: number;
  used_count: number;
  expires_at?: Date;
  active: boolean;
  created_at: Date;
}

export type couponsPk = "id";
export type couponsId = coupons[couponsPk];
export type couponsOptionalAttributes = "id" | "min_order" | "max_uses" | "used_count" | "expires_at" | "active" | "created_at";
export type couponsCreationAttributes = Optional<couponsAttributes, couponsOptionalAttributes>;

export class coupons extends Model<couponsAttributes, couponsCreationAttributes> implements couponsAttributes {
  id!: string;
  code!: string;
  discount_type!: string;
  discount_value!: number;
  min_order!: number;
  max_uses?: number;
  used_count!: number;
  expires_at?: Date;
  active!: boolean;
  created_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof coupons {
    return coupons.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "coupons_code_key"
    },
    discount_type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    discount_value: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    min_order: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    max_uses: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    used_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'coupons',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "coupons_code_key",
        unique: true,
        fields: [
          { name: "code" },
        ]
      },
      {
        name: "coupons_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
