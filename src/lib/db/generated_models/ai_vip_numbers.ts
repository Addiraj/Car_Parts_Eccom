import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { users, usersId } from './users';

export interface ai_vip_numbersAttributes {
  id: string;
  phone: string;
  label?: string;
  created_by?: string;
  created_at: Date;
}

export type ai_vip_numbersPk = "id";
export type ai_vip_numbersId = ai_vip_numbers[ai_vip_numbersPk];
export type ai_vip_numbersOptionalAttributes = "id" | "label" | "created_by" | "created_at";
export type ai_vip_numbersCreationAttributes = Optional<ai_vip_numbersAttributes, ai_vip_numbersOptionalAttributes>;

export class ai_vip_numbers extends Model<ai_vip_numbersAttributes, ai_vip_numbersCreationAttributes> implements ai_vip_numbersAttributes {
  id!: string;
  phone!: string;
  label?: string;
  created_by?: string;
  created_at!: Date;

  // ai_vip_numbers belongsTo users via created_by
  created_by_user!: users;
  getCreated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setCreated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createCreated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ai_vip_numbers {
    return ai_vip_numbers.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "ai_vip_numbers_phone_key"
    },
    label: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'ai_vip_numbers',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "ai_vip_numbers_phone_key",
        unique: true,
        fields: [
          { name: "phone" },
        ]
      },
      {
        name: "ai_vip_numbers_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
