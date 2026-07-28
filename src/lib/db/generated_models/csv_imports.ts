import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { users, usersId } from './users';

export interface csv_importsAttributes {
  id: string;
  filename: string;
  storage_path: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  inserted_rows: number;
  updated_rows: number;
  failed_rows: number;
  error_log: object;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export type csv_importsPk = "id";
export type csv_importsId = csv_imports[csv_importsPk];
export type csv_importsOptionalAttributes = "id" | "status" | "total_rows" | "processed_rows" | "inserted_rows" | "updated_rows" | "failed_rows" | "error_log" | "created_by" | "created_at" | "updated_at";
export type csv_importsCreationAttributes = Optional<csv_importsAttributes, csv_importsOptionalAttributes>;

export class csv_imports extends Model<csv_importsAttributes, csv_importsCreationAttributes> implements csv_importsAttributes {
  id!: string;
  filename!: string;
  storage_path!: string;
  status!: string;
  total_rows!: number;
  processed_rows!: number;
  inserted_rows!: number;
  updated_rows!: number;
  failed_rows!: number;
  error_log!: object;
  created_by?: string;
  created_at!: Date;
  updated_at!: Date;

  // csv_imports belongsTo users via created_by
  created_by_user!: users;
  getCreated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setCreated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createCreated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof csv_imports {
    return csv_imports.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    filename: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    storage_path: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "pending"
    },
    total_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    processed_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    inserted_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    updated_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    failed_rows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    error_log: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'csv_imports',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "csv_imports_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
