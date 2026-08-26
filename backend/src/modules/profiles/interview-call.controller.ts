import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { prisma } from '@/lib/prisma';
import { getBusinessDateString } from '@/utils/businessDate';

export const createInterviewCall = asyncHandler(async (req: Request, res: Response) => {
  const { companyName, position, number, callerName, notes } = req.body;
  const profileId = req.params.id;
  const recruiterId = req.user!.sub;

  if (!companyName || !position || !number) {
    res.status(400).json({ success: false, error: 'companyName, position, and number are required mandatory fields' });
    return;
  }

  const todayBusinessDate = getBusinessDateString(new Date());
  const businessDate = new Date(`${todayBusinessDate}T00:00:00.000Z`);

  const interviewCall = await prisma.interviewCall.create({
    data: {
      profileId,
      recruiterId,
      companyName,
      position,
      number,
      callerName,
      notes,
      businessDate,
    },
  });

  res.status(201).json({ success: true, data: interviewCall });
});

export const getInterviewCalls = asyncHandler(async (req: Request, res: Response) => {
  const interviewCalls = await prisma.interviewCall.findMany({
    where: { profileId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, data: interviewCalls });
});
