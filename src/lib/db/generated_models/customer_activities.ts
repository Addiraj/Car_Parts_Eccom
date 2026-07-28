import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface customer_activitiesAttributes {
  id: string;
  customer_id: string;
  actor_id?: string;
  activity_type: "note_added" | "followup_created" | "followup_completed" | "followup_cancelled" | "quotation_created" | "order_placed" | "customer_assigned" | "customer_reassigned" | "customer_unassigned" | "status_changed" | "call_logged" | "email_sent" | "part_viewed" | "catalog_viewed" | "cart_item_added" | "cart_item_removed" | "wishlist_added" | "ai_prompt" | "ai_vin_asked" | "ai_part_asked";
  entity_type?: string;
  entity_id?: string;
  metadata: object;
  created_at: Date;
}

export type customer_activitiesPk = "id";
export type customer_activitiesId = customer_activities[customer_activitiesPk];
export type customer_activitiesOptionalAttributes = "id" | "actor_id" | "entity_type" | "entity_id" | "metadata" | "created_at";
export type customer_activitiesCreationAttributes = Optional<customer_activitiesAttributes, customer_activitiesOptionalAttributes>;

export class customer_activities extends Model<customer_activitiesAttributes, customer_activitiesCreationAttributes> implements customer_activitiesAttributes {
  id!: string;
  customer_id!: string;
  actor_id?: string;
  activity_type!: "note_added" | "followup_created" | "followup_completed" | "followup_cancelled" | "quotation_created" | "order_placed" | "customer_assigned" | "customer_reassigned" | "customer_unassigned" | "status_changed" | "call_logged" | "email_sent" | "part_viewed" | "catalog_viewed" | "cart_item_added" | "cart_item_removed" | "wishlist_added" | "ai_prompt" | "ai_vin_asked" | "ai_part_asked";
  entity_type?: string;
  entity_id?: string;
  metadata!: object;
  created_at!: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof customer_activities {
    return customer_activities.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    actor_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    activity_type: {
      type: DataTypes.ENUM("note_added","followup_created","followup_completed","followup_cancelled","quotation_created","order_placed","customer_assigned","customer_reassigned","customer_unassigned","status_changed","call_logged","email_sent","part_viewed","catalog_viewed","cart_item_added","cart_item_removed","wishlist_added","ai_prompt","ai_vin_asked","ai_part_asked"),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    entity_id: {
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
    tableName: 'customer_activities',
    schema: 'public',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        name: "customer_activities_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_activities_customer",
        fields: [
          { name: "customer_id" },
          { name: "created_at", order: "DESC" },
        ]
      },
    ]
  });
  }
}
