import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface site_settingsAttributes {
  id: string;
  data: object;
  updated_at: Date;
}

export type site_settingsPk = "id";
export type site_settingsId = site_settings[site_settingsPk];
export type site_settingsOptionalAttributes = "data" | "updated_at";
export type site_settingsCreationAttributes = Optional<site_settingsAttributes, site_settingsOptionalAttributes>;

export class site_settings extends Model<site_settingsAttributes, site_settingsCreationAttributes> implements site_settingsAttributes {
  id!: string;
  data!: object;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof site_settings {
    return site_settings.init({
    id: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    sequelize,
    tableName: 'site_settings',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: false,
    updatedAt: "updated_at",
    indexes: [
      {
        name: "site_settings_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
