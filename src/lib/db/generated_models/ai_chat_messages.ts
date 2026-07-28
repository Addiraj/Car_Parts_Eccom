import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ai_chat_threads, ai_chat_threadsId } from './ai_chat_threads';

export interface ai_chat_messagesAttributes {
  id: string;
  thread_id: string;
  role: string;
  text?: string;
  parts: object;
  attachments: object;
  intent?: string;
  metadata: object;
  created_at: Date;
}

export type ai_chat_messagesPk = "id";
export type ai_chat_messagesId = ai_chat_messages[ai_chat_messagesPk];
export type ai_chat_messagesOptionalAttributes = "id" | "text" | "parts" | "attachments" | "intent" | "metadata" | "created_at";
export type ai_chat_messagesCreationAttributes = Optional<ai_chat_messagesAttributes, ai_chat_messagesOptionalAttributes>;

export class ai_chat_messages extends Model<ai_chat_messagesAttributes, ai_chat_messagesCreationAttributes> implements ai_chat_messagesAttributes {
  id!: string;
  thread_id!: string;
  role!: string;
  text?: string;
  parts!: object;
  attachments!: object;
  intent?: string;
  metadata!: object;
  created_at!: Date;

  // ai_chat_messages belongsTo ai_chat_threads via thread_id
  thread!: ai_chat_threads;
  getThread!: Sequelize.BelongsToGetAssociationMixin<ai_chat_threads>;
  setThread!: Sequelize.BelongsToSetAssociationMixin<ai_chat_threads, ai_chat_threadsId>;
  createThread!: Sequelize.BelongsToCreateAssociationMixin<ai_chat_threads>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ai_chat_messages {
    return ai_chat_messages.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    thread_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ai_chat_threads',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    parts: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    intent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    sequelize,
    tableName: 'ai_chat_messages',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "ai_chat_messages_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ai_chat_messages_thread_idx",
        fields: [
          { name: "thread_id" },
          { name: "created_at" },
        ]
      },
    ]
  });
  }
}
