import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface addressesAttributes {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  emirate: string;
  area: string;
  street: string;
  building?: string;
  landmark?: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export type addressesPk = "id";
export type addressesId = addresses[addressesPk];
export type addressesOptionalAttributes = "id" | "building" | "landmark" | "created_at" | "updated_at";
export type addressesCreationAttributes = Optional<addressesAttributes, addressesOptionalAttributes>;

export class addresses extends Model<addressesAttributes, addressesCreationAttributes> implements addressesAttributes {
  id!: string;
  user_id!: string;
  full_name!: string;
  phone!: string;
  emirate!: string;
  area!: string;
  street!: string;
  building?: string;
  landmark?: string;
  is_default!: boolean;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof addresses {
    return addresses.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    full_name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    emirate: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    area: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    street: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    building: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    landmark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'addresses',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "addresses_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
