import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface promo_sectionsAttributes {
  id: string;
  slot: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  badge?: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type promo_sectionsPk = "id";
export type promo_sectionsId = promo_sections[promo_sectionsPk];
export type promo_sectionsOptionalAttributes = "id" | "description" | "image_url" | "link_url" | "badge" | "display_order" | "is_active" | "created_at" | "updated_at";
export type promo_sectionsCreationAttributes = Optional<promo_sectionsAttributes, promo_sectionsOptionalAttributes>;

export class promo_sections extends Model<promo_sectionsAttributes, promo_sectionsCreationAttributes> implements promo_sectionsAttributes {
  id!: string;
  slot!: string;
  title!: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  badge?: string;
  display_order!: number;
  is_active!: boolean;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof promo_sections {
    return promo_sections.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    slot: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    link_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    badge: {
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
    }
  }, {
    sequelize,
    tableName: 'promo_sections',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "promo_sections_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
