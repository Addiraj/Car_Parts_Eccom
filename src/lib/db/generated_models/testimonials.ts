import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface testimonialsAttributes {
  id: string;
  author_name: string;
  author_role?: string;
  avatar_url?: string;
  rating: number;
  quote: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type testimonialsPk = "id";
export type testimonialsId = testimonials[testimonialsPk];
export type testimonialsOptionalAttributes = "id" | "author_role" | "avatar_url" | "rating" | "display_order" | "is_active" | "created_at" | "updated_at";
export type testimonialsCreationAttributes = Optional<testimonialsAttributes, testimonialsOptionalAttributes>;

export class testimonials extends Model<testimonialsAttributes, testimonialsCreationAttributes> implements testimonialsAttributes {
  id!: string;
  author_name!: string;
  author_role?: string;
  avatar_url?: string;
  rating!: number;
  quote!: string;
  display_order!: number;
  is_active!: boolean;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof testimonials {
    return testimonials.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    author_name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    author_role: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    },
    quote: {
      type: DataTypes.TEXT,
      allowNull: false
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'testimonials',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "testimonials_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
