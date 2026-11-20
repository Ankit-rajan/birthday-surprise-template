import mongoose from 'mongoose';

const timelineSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: null },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 3000 },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', default: null },
  },
  { timestamps: true },
);

export const TimelineEntry = mongoose.model('TimelineEntry', timelineSchema);
