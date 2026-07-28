import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ai_prompt_revisions, ai_prompt_revisionsId } from './ai_prompt_revisions';
import type { users, usersId } from './users';

export interface ai_promptsAttributes {
  id: string;
  key: string;
  name: string;
  description?: string;
  content: string;
  model: string;
  temperature: number;
  version: number;
  is_active: boolean;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  aliases_text?: string;
  clarification_rules_text?: string;
  reference_file_path?: string;
  reference_file_name?: string;
  reference_text?: string;
}

export type ai_promptsPk = "id";
export type ai_promptsId = ai_prompts[ai_promptsPk];
export type ai_promptsOptionalAttributes = "id" | "description" | "model" | "temperature" | "version" | "is_active" | "updated_by" | "created_at" | "updated_at" | "aliases_text" | "clarification_rules_text" | "reference_file_path" | "reference_file_name" | "reference_text";
export type ai_promptsCreationAttributes = Optional<ai_promptsAttributes, ai_promptsOptionalAttributes>;

export class ai_prompts extends Model<ai_promptsAttributes, ai_promptsCreationAttributes> implements ai_promptsAttributes {
  id!: string;
  key!: string;
  name!: string;
  description?: string;
  content!: string;
  model!: string;
  temperature!: number;
  version!: number;
  is_active!: boolean;
  updated_by?: string;
  created_at!: Date;
  updated_at!: Date;
  aliases_text?: string;
  clarification_rules_text?: string;
  reference_file_path?: string;
  reference_file_name?: string;
  reference_text?: string;

  // ai_prompts hasMany ai_prompt_revisions via prompt_id
  ai_prompt_revisions!: ai_prompt_revisions[];
  getAi_prompt_revisions!: Sequelize.HasManyGetAssociationsMixin<ai_prompt_revisions>;
  setAi_prompt_revisions!: Sequelize.HasManySetAssociationsMixin<ai_prompt_revisions, ai_prompt_revisionsId>;
  addAi_prompt_revision!: Sequelize.HasManyAddAssociationMixin<ai_prompt_revisions, ai_prompt_revisionsId>;
  addAi_prompt_revisions!: Sequelize.HasManyAddAssociationsMixin<ai_prompt_revisions, ai_prompt_revisionsId>;
  createAi_prompt_revision!: Sequelize.HasManyCreateAssociationMixin<ai_prompt_revisions>;
  removeAi_prompt_revision!: Sequelize.HasManyRemoveAssociationMixin<ai_prompt_revisions, ai_prompt_revisionsId>;
  removeAi_prompt_revisions!: Sequelize.HasManyRemoveAssociationsMixin<ai_prompt_revisions, ai_prompt_revisionsId>;
  hasAi_prompt_revision!: Sequelize.HasManyHasAssociationMixin<ai_prompt_revisions, ai_prompt_revisionsId>;
  hasAi_prompt_revisions!: Sequelize.HasManyHasAssociationsMixin<ai_prompt_revisions, ai_prompt_revisionsId>;
  countAi_prompt_revisions!: Sequelize.HasManyCountAssociationsMixin;
  // ai_prompts belongsTo users via updated_by
  updated_by_user!: users;
  getUpdated_by_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUpdated_by_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUpdated_by_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ai_prompts {
    return ai_prompts.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "ai_prompts_key_key"
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    model: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "openai\/gpt-5-mini"
    },
    temperature: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.4
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    },
    reference_text: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ai_prompts',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "ai_prompts_key_key",
        unique: true,
        fields: [
          { name: "key" },
        ]
      },
      {
        name: "ai_prompts_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
