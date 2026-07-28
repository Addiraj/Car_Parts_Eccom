import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface recently_viewedAttributes {
  id: string;
  user_id: string;
  part_id: string;
  viewed_at: Date;
}

export type recently_viewedPk = "id";
export type recently_viewedId = recently_viewed[recently_viewedPk];
export type recently_viewedOptionalAttributes = "id" | "viewed_at";
export type recently_viewedCreationAttributes = Optional<recently_viewedAttributes, recently_viewedOptionalAttributes>;

export class recently_viewed extends Model<recently_viewedAttributes, recently_viewedCreationAttributes> implements recently_viewedAttributes {
  id!: string;
  user_id!: string;
  part_id!: string;
  viewed_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof recently_viewed {
    return recently_viewed.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: "recently_viewed_user_id_part_id_key"
    },
    part_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: "recently_viewed_user_id_part_id_key"
    },
    viewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'recently_viewed',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "idx_rv_user",
        fields: [
          { name: "user_id" },
          { name: "viewed_at", order: "DESC" },
        ]
      },
      {
        name: "recently_viewed_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "recently_viewed_user_id_part_id_key",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "part_id" },
        ]
      },
    ]
  });
  }
}
