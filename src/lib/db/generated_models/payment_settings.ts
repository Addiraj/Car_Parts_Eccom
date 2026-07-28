import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface payment_settingsAttributes {
  id: string;
  setting_key: string;
  setting_value: object;
  description?: string;
  updated_by?: string;
  updated_at: Date;
  created_at: Date;
}

export type payment_settingsPk = "id";
export type payment_settingsId = payment_settings[payment_settingsPk];
export type payment_settingsOptionalAttributes = "id" | "setting_value" | "description" | "updated_by" | "updated_at" | "created_at";
export type payment_settingsCreationAttributes = Optional<payment_settingsAttributes, payment_settingsOptionalAttributes>;

export class payment_settings extends Model<payment_settingsAttributes, payment_settingsCreationAttributes> implements payment_settingsAttributes {
  id!: string;
  setting_key!: string;
  setting_value!: object;
  description?: string;
  updated_by?: string;
  updated_at!: Date;
  created_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof payment_settings {
    return payment_settings.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    setting_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "payment_settings_setting_key_key"
    },
    setting_value: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'payment_settings',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "payment_settings_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "payment_settings_setting_key_key",
        unique: true,
        fields: [
          { name: "setting_key" },
        ]
      },
    ]
  });
  }
}
