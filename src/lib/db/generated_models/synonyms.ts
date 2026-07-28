import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface synonymsAttributes {
  id: string;
  term: string;
  canonical: string;
}

export type synonymsPk = "id";
export type synonymsId = synonyms[synonymsPk];
export type synonymsOptionalAttributes = "id";
export type synonymsCreationAttributes = Optional<synonymsAttributes, synonymsOptionalAttributes>;

export class synonyms extends Model<synonymsAttributes, synonymsCreationAttributes> implements synonymsAttributes {
  id!: string;
  term!: string;
  canonical!: string;


  static initModel(sequelize: Sequelize.Sequelize): typeof synonyms {
    return synonyms.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    term: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "synonyms_term_key"
    },
    canonical: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'synonyms',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "synonyms_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "synonyms_term_key",
        unique: true,
        fields: [
          { name: "term" },
        ]
      },
    ]
  });
  }
}
