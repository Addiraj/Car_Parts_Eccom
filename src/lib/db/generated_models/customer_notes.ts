import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface customer_notesAttributes {
  id: string;
  customer_id: string;
  author_id: string;
  body: string;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export type customer_notesPk = "id";
export type customer_notesId = customer_notes[customer_notesPk];
export type customer_notesOptionalAttributes = "id" | "created_at" | "updated_at";
export type customer_notesCreationAttributes = Optional<customer_notesAttributes, customer_notesOptionalAttributes>;

export class customer_notes extends Model<customer_notesAttributes, customer_notesCreationAttributes> implements customer_notesAttributes {
  id!: string;
  customer_id!: string;
  author_id!: string;
  body!: string;
  pinned!: boolean;
  created_at!: Date;
  updated_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof customer_notes {
    return customer_notes.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    pinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'customer_notes',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "customer_notes_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_customer_notes_customer",
        fields: [
          { name: "customer_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
