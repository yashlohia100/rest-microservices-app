import { model, Schema } from 'mongoose';

const eventSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

export const Event = model('Event', eventSchema);
