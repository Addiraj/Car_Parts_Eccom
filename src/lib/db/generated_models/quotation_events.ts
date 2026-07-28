import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { quotations, quotationsId } from './quotations';
import type { users, usersId } from './users';

export interface quotation_eventsAttributes {
  id: string;
  quotation_id: string;
  event_type: string;
  actor_id?: string;
  note?: string;
  meta?: object;
  created_at: Date;
}

export type quotation_eventsPk = "id";
export type quotation_eventsId = quotation_events[quotation_eventsPk];
export type quotation_eventsOptionalAttributes = "id" | "actor_id" | "note" | "meta" | "created_at";
export type quotation_eventsCreationAttributes = Optional<quotation_eventsAttributes, quotation_eventsOptionalAttributes>;

export class quotation_events extends Model<quotation_eventsAttributes, quotation_eventsCreationAttributes> implements quotation_eventsAttributes {
  id!: string;
  quotation_id!: string;
  event_type!: string;
  actor_id?: string;
  note?: string;
  meta?: object;
  created_at!: Date;

  // quotation_events belongsTo quotations via quotation_id
  quotation!: quotations;
  getQuotation!: Sequelize.BelongsToGetAssociationMixin<quotations>;
  setQuotation!: Sequelize.BelongsToSetAssociationMixin<quotations, quotationsId>;
  createQuotation!: Sequelize.BelongsToCreateAssociationMixin<quotations>;
  // quotation_events belongsTo users via actor_id
  actor!: users;
  getActor!: Sequelize.BelongsToGetAssociationMixin<users>;
  setActor!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createActor!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof quotation_events {
    return quotation_events.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quotation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'quotations',
        key: 'id'
      }
    },
    event_type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    actor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    meta: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'quotation_events',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "quotation_events_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "quotation_events_q_idx",
        fields: [
          { name: "quotation_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
