import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface shipping_zonesAttributes {
  id: string;
  emirate: string;
  fee: number;
  free_over?: number;
  eta_days_min: number;
  eta_days_max: number;
}

export type shipping_zonesPk = "id";
export type shipping_zonesId = shipping_zones[shipping_zonesPk];
export type shipping_zonesOptionalAttributes = "id" | "fee" | "free_over" | "eta_days_min" | "eta_days_max";
export type shipping_zonesCreationAttributes = Optional<shipping_zonesAttributes, shipping_zonesOptionalAttributes>;

export class shipping_zones extends Model<shipping_zonesAttributes, shipping_zonesCreationAttributes> implements shipping_zonesAttributes {
  id!: string;
  emirate!: string;
  fee!: number;
  free_over?: number;
  eta_days_min!: number;
  eta_days_max!: number;


  static initModel(sequelize: Sequelize.Sequelize): typeof shipping_zones {
    return shipping_zones.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    emirate: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "shipping_zones_emirate_key"
    },
    fee: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    free_over: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    eta_days_min: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    eta_days_max: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    }
  }, {
    sequelize,
    tableName: 'shipping_zones',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "shipping_zones_emirate_key",
        unique: true,
        fields: [
          { name: "emirate" },
        ]
      },
      {
        name: "shipping_zones_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
