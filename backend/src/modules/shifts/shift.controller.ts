import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as shiftService from './shift.service';
import { getShiftWindowForDate } from './shift.service';
import { getBusinessDateString } from '@/utils/businessDate';

export const getMyShift = asyncHandler(async (req: Request, res: Response) => {
  const cfg = await shiftService.resolveUserShiftConfig(req.user!.sub);
  const today = getBusinessDateString(new Date());
  const window = getShiftWindowForDate(today, cfg);
  res.json({
    success: true,
    data: {
      config: cfg,
      today: {
        businessDate: today,
        startAt: window.start,
        endAt: window.end,
      },
    },
  });
});
