import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface wa_analytics_eventsAttributes {
  id: string;
  whatsapp_user_id: string;
  event_type: string;
  event_data: object;
  occurred_at: Date;
  created_at: Date;
}

export type wa_analytics_eventsPk = "id";
export type wa_analytics_eventsId = wa_analytics_events[wa_analytics_eventsPk];
export type wa_analytics_eventsOptionalAttributes = "id" | "event_data" | "occurred_at" | "created_at";
export type wa_analytics_eventsCreationAttributes = Optional<wa_analytics_eventsAttributes, wa_analytics_eventsOptionalAttributes>;

export class wa_analytics_events extends Model<wa_analytics_eventsAttributes, wa_analytics_eventsCreationAttributes> implements wa_analytics_eventsAttributes {
  id!: string;
  whatsapp_user_id!: string;
  event_type!: string;
  event_data!: object;
  occurred_at!: Date;
  created_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof wa_analytics_events {
    return wa_analytics_events.init({
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
    event_type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    event_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
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
    tableName: 'wa_analytics_events',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "wa_analytics_events_occurred_at_idx",
        fields: [
          { name: "occurred_at", order: "DESC" },
        ]
      },
      {
        name: "wa_analytics_events_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "wa_analytics_events_type_time_idx",
        fields: [
          { name: "event_type" },
          { name: "occurred_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
