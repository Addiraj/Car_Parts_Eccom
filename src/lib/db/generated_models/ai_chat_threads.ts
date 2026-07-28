import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ai_chat_events, ai_chat_eventsId } from './ai_chat_events';
import type { ai_chat_messages, ai_chat_messagesId } from './ai_chat_messages';
import type { ai_leads, ai_leadsId } from './ai_leads';
import type { users, usersId } from './users';

export interface ai_chat_threadsAttributes {
  id: string;
  user_id?: string;
  guest_token?: string;
  title: string;
  vehicle_context: object;
  language: string;
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;
}

export type ai_chat_threadsPk = "id";
export type ai_chat_threadsId = ai_chat_threads[ai_chat_threadsPk];
export type ai_chat_threadsOptionalAttributes = "id" | "user_id" | "guest_token" | "title" | "vehicle_context" | "language" | "last_message_at" | "created_at" | "updated_at";
export type ai_chat_threadsCreationAttributes = Optional<ai_chat_threadsAttributes, ai_chat_threadsOptionalAttributes>;

export class ai_chat_threads extends Model<ai_chat_threadsAttributes, ai_chat_threadsCreationAttributes> implements ai_chat_threadsAttributes {
  id!: string;
  user_id?: string;
  guest_token?: string;
  title!: string;
  vehicle_context!: object;
  language!: string;
  last_message_at!: Date;
  created_at!: Date;
  updated_at!: Date;

  // ai_chat_threads hasMany ai_chat_events via thread_id
  ai_chat_events!: ai_chat_events[];
  getAi_chat_events!: Sequelize.HasManyGetAssociationsMixin<ai_chat_events>;
  setAi_chat_events!: Sequelize.HasManySetAssociationsMixin<ai_chat_events, ai_chat_eventsId>;
  addAi_chat_event!: Sequelize.HasManyAddAssociationMixin<ai_chat_events, ai_chat_eventsId>;
  addAi_chat_events!: Sequelize.HasManyAddAssociationsMixin<ai_chat_events, ai_chat_eventsId>;
  createAi_chat_event!: Sequelize.HasManyCreateAssociationMixin<ai_chat_events>;
  removeAi_chat_event!: Sequelize.HasManyRemoveAssociationMixin<ai_chat_events, ai_chat_eventsId>;
  removeAi_chat_events!: Sequelize.HasManyRemoveAssociationsMixin<ai_chat_events, ai_chat_eventsId>;
  hasAi_chat_event!: Sequelize.HasManyHasAssociationMixin<ai_chat_events, ai_chat_eventsId>;
  hasAi_chat_events!: Sequelize.HasManyHasAssociationsMixin<ai_chat_events, ai_chat_eventsId>;
  countAi_chat_events!: Sequelize.HasManyCountAssociationsMixin;
  // ai_chat_threads hasMany ai_chat_messages via thread_id
  ai_chat_messages!: ai_chat_messages[];
  getAi_chat_messages!: Sequelize.HasManyGetAssociationsMixin<ai_chat_messages>;
  setAi_chat_messages!: Sequelize.HasManySetAssociationsMixin<ai_chat_messages, ai_chat_messagesId>;
  addAi_chat_message!: Sequelize.HasManyAddAssociationMixin<ai_chat_messages, ai_chat_messagesId>;
  addAi_chat_messages!: Sequelize.HasManyAddAssociationsMixin<ai_chat_messages, ai_chat_messagesId>;
  createAi_chat_message!: Sequelize.HasManyCreateAssociationMixin<ai_chat_messages>;
  removeAi_chat_message!: Sequelize.HasManyRemoveAssociationMixin<ai_chat_messages, ai_chat_messagesId>;
  removeAi_chat_messages!: Sequelize.HasManyRemoveAssociationsMixin<ai_chat_messages, ai_chat_messagesId>;
  hasAi_chat_message!: Sequelize.HasManyHasAssociationMixin<ai_chat_messages, ai_chat_messagesId>;
  hasAi_chat_messages!: Sequelize.HasManyHasAssociationsMixin<ai_chat_messages, ai_chat_messagesId>;
  countAi_chat_messages!: Sequelize.HasManyCountAssociationsMixin;
  // ai_chat_threads hasMany ai_leads via thread_id
  ai_leads!: ai_leads[];
  getAi_leads!: Sequelize.HasManyGetAssociationsMixin<ai_leads>;
  setAi_leads!: Sequelize.HasManySetAssociationsMixin<ai_leads, ai_leadsId>;
  addAi_lead!: Sequelize.HasManyAddAssociationMixin<ai_leads, ai_leadsId>;
  addAi_leads!: Sequelize.HasManyAddAssociationsMixin<ai_leads, ai_leadsId>;
  createAi_lead!: Sequelize.HasManyCreateAssociationMixin<ai_leads>;
  removeAi_lead!: Sequelize.HasManyRemoveAssociationMixin<ai_leads, ai_leadsId>;
  removeAi_leads!: Sequelize.HasManyRemoveAssociationsMixin<ai_leads, ai_leadsId>;
  hasAi_lead!: Sequelize.HasManyHasAssociationMixin<ai_leads, ai_leadsId>;
  hasAi_leads!: Sequelize.HasManyHasAssociationsMixin<ai_leads, ai_leadsId>;
  countAi_leads!: Sequelize.HasManyCountAssociationsMixin;
  // ai_chat_threads belongsTo users via user_id
  user!: users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ai_chat_threads {
    return ai_chat_threads.init({
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
    guest_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "New conversation"
    },
    vehicle_context: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    language: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "en"
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'ai_chat_threads',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        name: "ai_chat_threads_guest_idx",
        fields: [
          { name: "guest_token" },
        ]
      },
      {
        name: "ai_chat_threads_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ai_chat_threads_user_idx",
        fields: [
          { name: "user_id" },
          { name: "last_message_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
