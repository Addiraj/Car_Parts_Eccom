import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface cms_pagesAttributes {
  id: string;
  slug: string;
  title: string;
  body_html: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type cms_pagesPk = "id";
export type cms_pagesId = cms_pages[cms_pagesPk];
export type cms_pagesOptionalAttributes = "id" | "body_html" | "meta_title" | "meta_description" | "published_at" | "created_at" | "updated_at";
export type cms_pagesCreationAttributes = Optional<cms_pagesAttributes, cms_pagesOptionalAttributes>;

export class cms_pages extends Model<cms_pagesAttributes, cms_pagesCreationAttributes> implements cms_pagesAttributes {
  id!: string;
  slug!: string;
  title!: string;
  body_html!: string;
  meta_title?: string;
  meta_description?: string;
  is_published!: boolean;
  published_at?: Date;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof cms_pages {
    return cms_pages.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    slug: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "cms_pages_slug_key"
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    body_html: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ""
    },
    meta_title: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'cms_pages',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "cms_pages_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "cms_pages_slug_key",
        unique: true,
        fields: [
          { name: "slug" },
        ]
      },
    ]
  });
  }
}
