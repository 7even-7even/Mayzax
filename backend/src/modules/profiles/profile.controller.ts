import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as profileService from './profile.service';
import { prisma } from '@/lib/prisma';

function actor(req: Request) {
  return { id: req.user!.sub, role: req.user!.role };
}
function meta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined };
}

export const createProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await profileService.createProfile(req.body, actor(req), meta(req));
  res.status(201).json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await profileService.updateProfile(req.params.id, req.body, actor(req), meta(req));
  res.status(200).json({ success: true, data: profile });
});

export const deleteProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.deleteProfile(req.params.id, actor(req), meta(req));
  res.status(200).json({ success: true, data: result });
});

export const assignRecruiter = asyncHandler(async (req: Request, res: Response) => {
  const recruiterIds = req.body.assignedRecruiterIds ?? (req.body.assignedRecruiterId ? [req.body.assignedRecruiterId] : []);
  const profile = await profileService.assignRecruiter(req.params.id, recruiterIds, actor(req), meta(req));
  res.status(200).json({ success: true, data: profile });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await profileService.getProfile(req.params.id, actor(req));
  res.status(200).json({ success: true, data: profile });
});

export const listProfiles = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.listProfiles(req.query as any, actor(req));
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const bulkAssignProfiles = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.bulkAssignProfiles(req.body.profileIds, req.body.assignedRecruiterIds, actor(req), meta(req));
  res.status(200).json({ success: true, data: result });
});

export const bulkDeleteProfiles = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.bulkDeleteProfiles(req.body.profileIds, actor(req), meta(req));
  res.status(200).json({ success: true, data: result });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.resetPassword(req.params.id, actor(req), meta(req));
  res.status(200).json({ success: true, data: result });
});

export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.getPaymentHistory(req.params.id, actor(req));
  res.status(200).json({ success: true, data: result });
});

export const downloadPaymentReceipt = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.clientProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) {
    res.status(404).json({ success: false, error: 'Profile not found' });
    return;
  }
  const payments = await profileService.getPaymentHistory(req.params.id, actor(req));
  const { ref } = req.query as { ref?: string };

  const payment = ref ? payments.find((p) => p.paymentRef === ref) : payments[0];
  if (!payment) {
    res.status(404).json({ success: false, error: 'Receipt not found' });
    return;
  }

  const PLAN_COLORS: Record<string, string> = {
    Basic: '#6366f1',
    Gold: '#f59e0b',
    Premium: '#8b5cf6',
  };
  const color = PLAN_COLORS[profile.planSelected ?? ''] ?? '#6366f1';
  const paidDate = payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const typeLabel = `Installment #${payment.installmentNo}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Mayzax Solutions - Payment Receipt</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 32px; }
  .receipt { 
    background: #fff; 
    border-radius: 24px; 
    box-shadow: 0 10px 40px rgba(0,0,0,0.06); 
    max-width: 600px; 
    width: 100%; 
    padding: 32px; 
    border: 1px solid #e2e8f0; 
    position: relative; 
    overflow: hidden; 
  }
  .watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.02;
    font-size: 48px;
    font-weight: 900;
    letter-spacing: 0.2em;
    transform: rotate(12deg);
    pointer-events: none;
    user-select: none;
    color: #0f172a;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 20px;
    margin-bottom: 20px;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logo-m {
    height: 28px;
    width: 28px;
    background: #4f46e5;
    color: #fff;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 14px;
  }
  .logo-text {
    font-size: 18px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: 0.05em;
  }
  .status-area {
    text-align: right;
  }
  .badge {
    display: inline-block;
    background: #d1fae5;
    color: #065f46;
    border-radius: 99px;
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .receipt-id {
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    margin-top: 8px;
  }
  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    font-size: 12px;
    margin-bottom: 24px;
  }
  .section-title {
    font-size: 9px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }
  .detail-bold {
    font-weight: 700;
    color: #1e293b;
  }
  .detail-sub {
    color: #64748b;
    margin-top: 2px;
  }
  .table-section {
    border-top: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
    padding: 16px 0;
    margin-bottom: 24px;
  }
  .table-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }
  .table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    font-size: 12px;
    font-weight: 700;
    color: #1e293b;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .footer {
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    line-height: 1.6;
  }
  @media print {
    body { background: white; padding: 0; }
    .receipt { box-shadow: none; border: none; max-width: 100%; padding: 0; }
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="watermark">MAYZAX SOLUTIONS</div>
  <div class="header">
    <div class="logo-area">
      <div class="logo-m">M</div>
      <div class="logo-text">MAYZAX SOLUTIONS</div>
    </div>
    <div class="status-area">
      <div class="badge">PAYMENT COMPLETED</div>
      <div class="receipt-id">Receipt: MZ-${payment.paymentRef ? payment.paymentRef.slice(0, 8).toUpperCase() : 'RECEIPT'}</div>
    </div>
  </div>
  <div class="details-grid">
    <div>
      <div class="section-title">Bill To</div>
      <div class="detail-bold">${profile.candidateName}</div>
      <div class="detail-sub">${profile.email}</div>
      <div class="detail-sub">${profile.phone}</div>
    </div>
    <div class="text-right">
      <div class="section-title">Transaction Info</div>
      <div class="detail-bold">Reference: <span style="font-family: monospace;">${payment.paymentRef || 'N/A'}</span></div>
      <div class="detail-sub">Paid: $${(payment.amount ?? 0).toLocaleString()}.00</div>
      <div class="detail-sub">Date: ${paidDate}</div>
    </div>
  </div>
  <div class="table-section">
    <div class="table-header">
      <div>Description</div>
      <div class="text-center">Plan</div>
      <div class="text-right">Total</div>
    </div>
    <div class="table-row">
      <div>Onboarding &amp; Profile Setup Fee (${typeLabel})</div>
      <div class="text-center" style="color: #475569;">${profile.planSelected || 'Basic'}</div>
      <div class="text-right" style="color: #4f46e5;">$${(payment.amount ?? 0).toLocaleString()}.00</div>
    </div>
  </div>
  <div class="footer">
    <p>Thank you for choosing Mayzax Solutions. A confirmation email has been sent.</p>
    <p style="margin-top: 2px;">Please allow 24 hours for administrative document verification.</p>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export const payInstallment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentRef } = req.body;
  if (!paymentRef) {
    res.status(400).json({ success: false, error: 'paymentRef is required' });
    return;
  }
  const result = await profileService.payInstallment(req.params.id, req.params.paymentId, paymentRef, actor(req));
  res.status(200).json({ success: true, data: result });
});

export const unblockPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileService.unblockPayment(req.params.id, actor(req));
  res.status(200).json({ success: true, data: result });
});

export const postPaymentDetails = asyncHandler(async (req: Request, res: Response) => {
  const { planSelected, payments } = req.body;
  if (!planSelected) {
    res.status(400).json({ success: false, error: 'planSelected is required' });
    return;
  }
  if (!payments || !Array.isArray(payments)) {
    res.status(400).json({ success: false, error: 'payments array is required' });
    return;
  }
  const result = await profileService.postPaymentDetails(req.params.id, planSelected, payments, actor(req));
  res.status(200).json({ success: true, data: result });
});


