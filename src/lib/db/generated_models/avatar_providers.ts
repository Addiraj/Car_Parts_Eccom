import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface avatar_providersAttributes {
  id: string;
  provider: string;
  face_id?: string;
  voice_id?: string;
  model?: string;
  avatar_image_url?: string;
  avatar_image_path?: string;
  is_default: boolean;
  is_enabled: boolean;
  config: object;
  created_at: Date;
  updated_at: Date;
}

export type avatar_providersPk = "id";
export type avatar_providersId = avatar_providers[avatar_providersPk];
export type avatar_providersOptionalAttributes = "id" | "face_id" | "voice_id" | "model" | "avatar_image_url" | "avatar_image_path" | "is_enabled" | "config" | "created_at" | "updated_at";
export type avatar_providersCreationAttributes = Optional<avatar_providersAttributes, avatar_providersOptionalAttributes>;

export class avatar_providers extends Model<avatar_providersAttributes, avatar_providersCreationAttributes> implements avatar_providersAttributes {
  id!: string;
  provider!: string;
  face_id?: string;
  voice_id?: string;
  model?: string;
  avatar_image_url?: string;
  avatar_image_path?: string;
  is_default!: boolean;
  is_enabled!: boolean;
  config!: object;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof avatar_providers {
    return avatar_providers.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    provider: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "avatar_providers_provider_key"
    },
    face_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    voice_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    model: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatar_image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatar_image_path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    sequelize,
    tableName: 'avatar_providers',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "avatar_providers_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "avatar_providers_provider_key",
        unique: true,
        fields: [
          { name: "provider" },
        ]
      },
    ]
  });
  }
}
