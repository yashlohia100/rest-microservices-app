import { model, Schema } from 'mongoose';

const EVENT_TYPES = [
  'postCreated',
  'postUpdated',
  'postDeleted',
  'userCreated',
  'userUpdated',
  'userDeleted',
] as const;

const SERVICE_NAMES = ['postService', 'userService'] as const;

const eventSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: EVENT_TYPES,
    },
    serviceName: {
      type: String,
      required: true,
      enum: SERVICE_NAMES,
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

eventSchema.index({ type: 1 });
eventSchema.index({ serviceName: 1 });

export const Event = model('Event', eventSchema);
export { EVENT_TYPES, SERVICE_NAMES };
