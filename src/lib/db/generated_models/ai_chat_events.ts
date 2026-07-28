import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ai_chat_threads, ai_chat_threadsId } from './ai_chat_threads';
import type { users, usersId } from './users';

export interface ai_chat_eventsAttributes {
  id: string;
  thread_id?: string;
  user_id?: string;
  event_type: string;
  payload: object;
  created_at: Date;
}

export type ai_chat_eventsPk = "id";
export type ai_chat_eventsId = ai_chat_events[ai_chat_eventsPk];
export type ai_chat_eventsOptionalAttributes = "id" | "thread_id" | "user_id" | "payload" | "created_at";
export type ai_chat_eventsCreationAttributes = Optional<ai_chat_eventsAttributes, ai_chat_eventsOptionalAttributes>;

export class ai_chat_events extends Model<ai_chat_eventsAttributes, ai_chat_eventsCreationAttributes> implements ai_chat_eventsAttributes {
  id!: string;
  thread_id?: string;
  user_id?: string;
  event_type!: string;
  payload!: object;
  created_at!: Date;

  // ai_chat_events belongsTo ai_chat_threads via thread_id
  thread!: ai_chat_threads;
  getThread!: Sequelize.BelongsToGetAssociationMixin<ai_chat_threads>;
  setThread!: Sequelize.BelongsToSetAssociationMixin<ai_chat_threads, ai_chat_threadsId>;
  createThread!: Sequelize.BelongsToCreateAssociationMixin<ai_chat_threads>;
  // ai_chat_events belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ai_chat_events {
    return ai_chat_events.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    thread_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ai_chat_threads',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    event_type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    sequelize,
    tableName: 'ai_chat_events',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "ai_chat_events_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ai_chat_events_type_idx",
        fields: [
          { name: "event_type" },
          { name: "created_at", order: "DESC" },
        ]
      },
      {
        name: "ai_chat_events_user_idx",
        fields: [
          { name: "user_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
