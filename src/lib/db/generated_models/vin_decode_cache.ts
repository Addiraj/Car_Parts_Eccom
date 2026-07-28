import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface vin_decode_cacheAttributes {
  vin: string;
  payload: object;
  decoded_at: Date;
}

export type vin_decode_cachePk = "vin";
export type vin_decode_cacheId = vin_decode_cache[vin_decode_cachePk];
export type vin_decode_cacheOptionalAttributes = "decoded_at";
export type vin_decode_cacheCreationAttributes = Optional<vin_decode_cacheAttributes, vin_decode_cacheOptionalAttributes>;

export class vin_decode_cache extends Model<vin_decode_cacheAttributes, vin_decode_cacheCreationAttributes> implements vin_decode_cacheAttributes {
  vin!: string;
  payload!: object;
  decoded_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof vin_decode_cache {
    return vin_decode_cache.init({
    vin: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    decoded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'vin_decode_cache',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "vin_decode_cache_pkey",
        unique: true,
        fields: [
          { name: "vin" },
        ]
      },
    ]
  });
  }
}
