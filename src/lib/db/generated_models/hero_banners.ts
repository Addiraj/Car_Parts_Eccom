import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface hero_bannersAttributes {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  cta_label?: string;
  cta_url?: string;
  display_order: number;
  is_active: boolean;
  starts_at?: Date;
  ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type hero_bannersPk = "id";
export type hero_bannersId = hero_banners[hero_bannersPk];
export type hero_bannersOptionalAttributes = "id" | "subtitle" | "cta_label" | "cta_url" | "display_order" | "is_active" | "starts_at" | "ends_at" | "created_at" | "updated_at";
export type hero_bannersCreationAttributes = Optional<hero_bannersAttributes, hero_bannersOptionalAttributes>;

export class hero_banners extends Model<hero_bannersAttributes, hero_bannersCreationAttributes> implements hero_bannersAttributes {
  id!: string;
  title!: string;
  subtitle?: string;
  image_url!: string;
  cta_label?: string;
  cta_url?: string;
  display_order!: number;
  is_active!: boolean;
  starts_at?: Date;
  ends_at?: Date;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof hero_banners {
    return hero_banners.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subtitle: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cta_label: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cta_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'hero_banners',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "hero_banners_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
