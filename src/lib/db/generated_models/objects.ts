import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface objectsAttributes {
  id: string;
  bucket_id?: string;
  name?: string;
  owner?: string;
  created_at?: Date;
  updated_at?: Date;
  last_accessed_at?: Date;
  metadata?: object;
}

export type objectsPk = "id";
export type objectsId = objects[objectsPk];
export type objectsOptionalAttributes = "id" | "bucket_id" | "name" | "owner" | "created_at" | "updated_at" | "last_accessed_at" | "metadata";
export type objectsCreationAttributes = Optional<objectsAttributes, objectsOptionalAttributes>;

export class objects extends Model<objectsAttributes, objectsCreationAttributes> implements objectsAttributes {
  id!: string;
  bucket_id?: string;
  name?: string;
  owner?: string;
  created_at?: Date;
  updated_at?: Date;
  last_accessed_at?: Date;
  metadata?: object;


  static initModel(sequelize: Sequelize.Sequelize): typeof objects {
    return objects.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bucket_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    owner: {
      type: DataTypes.UUID,
      allowNull: true
    },
    last_accessed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'objects',
    schema: 'storage',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "objects_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
