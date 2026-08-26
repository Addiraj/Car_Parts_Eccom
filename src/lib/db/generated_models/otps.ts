import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface otpsAttributes {
  email: string;
  otp_code: string;
  expires_at: Date;
  attempts?: number;
}

export type otpsPk = "email";
export type otpsId = otps[otpsPk];
export type otpsOptionalAttributes = "attempts";
export type otpsCreationAttributes = Optional<otpsAttributes, otpsOptionalAttributes>;

export class otps extends Model<otpsAttributes, otpsCreationAttributes> implements otpsAttributes {
  email!: string;
  otp_code!: string;
  expires_at!: Date;
  attempts!: number;

  static initModel(sequelize: Sequelize.Sequelize): typeof otps {
    return otps.init({
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true
    },
    otp_code: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'otps',
    schema: 'public',
    hasTrigger: false,
    timestamps: false,
    indexes: [
      {
        name: "otps_pkey",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
    ]
  });
  }
}
