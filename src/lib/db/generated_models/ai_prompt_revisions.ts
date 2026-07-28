import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ai_prompts, ai_promptsId } from './ai_prompts';
import type { users, usersId } from './users';

export interface ai_prompt_revisionsAttributes {
  id: string;
  prompt_id: string;
  key: string;
  version: number;
  content: string;
  model: string;
  temperature: number;
  updated_by?: string;
  created_at: Date;
  aliases_text?: string;
  clarification_rules_text?: string;
  reference_file_path?: string;
  reference_file_name?: string;
}

export type ai_prompt_revisionsPk = "id";
export type ai_prompt_revisionsId = ai_prompt_revisions[ai_prompt_revisionsPk];
export type ai_prompt_revisionsOptionalAttributes = "id" | "updated_by" | "created_at" | "aliases_text" | "clarification_rules_text" | "reference_file_path" | "reference_file_name";
export type ai_prompt_revisionsCreationAttributes = Optional<ai_prompt_revisionsAttributes, ai_prompt_revisionsOptionalAttributes>;

export class ai_prompt_revisions extends Model<ai_prompt_revisionsAttributes, ai_prompt_revisionsCreationAttributes> implements ai_prompt_revisionsAttributes {
  id!: string;
  prompt_id!: string;
  key!: string;
  version!: number;
  content!: string;
  model!: string;
  temperature!: number;
  updated_by?: string;
  created_at!: Date;
  aliases_text?: string;
  clarification_rules_text?: string;
  reference_file_path?: string;
  reference_file_name?: string;

  // ai_prompt_revisions belongsTo ai_prompts via prompt_id
  prompt!: ai_prompts;
  getPrompt!: Sequelize.BelongsToGetAssociationMixin<ai_prompts>;
  setPrompt!: Sequelize.BelongsToSetAssociationMixin<ai_prompts, ai_promptsId>;
  createPrompt!: Sequelize.BelongsToCreateAssociationMixin<ai_prompts>;
  // ai_prompt_revisions belongsTo users via updated_by
  updated_by_user!: users;
  getUpdated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUpdated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUpdated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ai_prompt_revisions {
    return ai_prompt_revisions.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    prompt_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ai_prompts',
        key: 'id'
      }
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    model: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    temperature: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    aliases_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    clarification_rules_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reference_file_path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reference_file_name: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ai_prompt_revisions',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "ai_prompt_revisions_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ai_prompt_revisions_prompt_idx",
        fields: [
          { name: "prompt_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
