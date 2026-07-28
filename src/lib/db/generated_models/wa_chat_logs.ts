import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface wa_chat_logsAttributes {
  id: string;
  whatsapp_user_id: string;
  user_locale?: string;
  user_message: string;
  bot_response: string;
  intent?: string;
  occurred_at: Date;
  created_at: Date;
}

export type wa_chat_logsPk = "id";
export type wa_chat_logsId = wa_chat_logs[wa_chat_logsPk];
export type wa_chat_logsOptionalAttributes = "id" | "user_locale" | "intent" | "occurred_at" | "created_at";
export type wa_chat_logsCreationAttributes = Optional<wa_chat_logsAttributes, wa_chat_logsOptionalAttributes>;

export class wa_chat_logs extends Model<wa_chat_logsAttributes, wa_chat_logsCreationAttributes> implements wa_chat_logsAttributes {
  id!: string;
  whatsapp_user_id!: string;
  user_locale?: string;
  user_message!: string;
  bot_response!: string;
  intent?: string;
  occurred_at!: Date;
  created_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof wa_chat_logs {
    return wa_chat_logs.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    whatsapp_user_id: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    user_locale: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    user_message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    bot_response: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    intent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'wa_chat_logs',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "wa_chat_logs_occurred_at_idx",
        fields: [
          { name: "occurred_at", order: "DESC" },
        ]
      },
      {
        name: "wa_chat_logs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "wa_chat_logs_user_idx",
        fields: [
          { name: "whatsapp_user_id" },
        ]
      },
    ]
  });
  }
}
