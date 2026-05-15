const prisma = require('../config/db');

// @desc    Submit KYC documents
// @route   POST /kyc
// @access  Private (Vendor only)
const submitKyc = async (req, res, next) => {
  try {
    const { id_document_url, selfie_url } = req.body;

    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id },
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor profile not found. Register business first.');
    }

    // Check if KYC already submitted
    const existingKyc = await prisma.kyc.findUnique({
      where: { vendor_id: vendor.id },
    });

    if (existingKyc) {
      res.status(400);
      throw new Error('KYC already submitted for this vendor');
    }

    const kyc = await prisma.kyc.create({
      data: {
        vendor_id: vendor.id,
        id_document_url,
        selfie_url,
        verification_status: 'PENDING',
      },
    });

    // Simulate Smile ID verification (Auto verify for MVP)
    setTimeout(async () => {
      await prisma.kyc.update({
        where: { id: kyc.id },
        data: { verification_status: 'VERIFIED' },
      });
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { kyc_status: 'VERIFIED' },
      });
      console.log(`KYC for vendor ${vendor.id} automatically verified.`);
    }, 5000);

    res.status(201).json(kyc);
  } catch (error) {
    next(error);
  }
};

// @desc    Get KYC status
// @route   GET /kyc/status
// @access  Private (Vendor only)
const getKycStatus = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id },
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor profile not found');
    }

    const kyc = await prisma.kyc.findUnique({
      where: { vendor_id: vendor.id },
    });

    if (!kyc) {
      return res.status(200).json({ status: 'NOT_SUBMITTED' });
    }

    res.status(200).json({ status: kyc.verification_status, kyc });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitKyc,
  getKycStatus,
};
