import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { users, usersId } from './users';

export interface contactsAttributes {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export type contactsPk = "id";
export type contactsId = contacts[contactsPk];
export type contactsOptionalAttributes = "id" | "user_id" | "phone" | "status" | "created_at" | "updated_at";
export type contactsCreationAttributes = Optional<contactsAttributes, contactsOptionalAttributes>;

export class contacts extends Model<contactsAttributes, contactsCreationAttributes> implements contactsAttributes {
  id!: string;
  user_id?: string;
  name!: string;
  email!: string;
  phone?: string;
  subject!: string;
  message!: string;
  status!: string;
  created_at!: Date;
  updated_at!: Date;

  // contacts belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof contacts {
    return contacts.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subject: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "new"
    }
  }, {
    sequelize,
    tableName: 'contacts',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "contacts_created_at_idx",
        fields: [
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "contacts_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
