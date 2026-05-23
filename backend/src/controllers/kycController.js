const prisma = require('../config/db');
const axios = require('axios');

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

// @desc    Create idnorm verification session
// @route   GET /kyc/idnorm-session
// @access  Private (Vendor only)
const createIdnormSession = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id },
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor profile not found. Register business first.');
    }

    // Call idnorm API to create a verification session
    // We pass our IDNORM_API_KEY securely from the backend environment
    const apiKey = process.env.IDNORM_API_KEY;
    
    // In a real idnorm implementation, this would be a POST to their session endpoint
    // with your vendor's ID as the reference.
    // Example: 
    // const response = await axios.post('https://api.idnorm.com/v1/sessions', {
    //   reference: vendor.id,
    //   webhook_url: 'https://your-api.com/api/kyc/idnorm-callback'
    // }, { headers: { Authorization: `Bearer ${apiKey}` } });
    
    // Since we don't have the exact idnorm URL, we generate a mock URL that 
    // the frontend WebBrowser will open. 
    const mockSessionUrl = `https://idnorm.com/verify?session_id=${vendor.id}&api_key_valid=${apiKey ? 'true' : 'false'}`;

    res.status(200).json({ 
      sessionUrl: mockSessionUrl, 
      reference: vendor.id 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Webhook/Poll callback for idnorm completion
// @route   POST /kyc/idnorm-callback
// @access  Public (idnorm server hits this, or we poll it)
const handleIdnormCallback = async (req, res, next) => {
  try {
    // In a webhook, idnorm would send the status and reference ID.
    // For this implementation, we assume the frontend hits this with the vendor_id after the webview closes.
    const { vendor_id, status } = req.body;

    if (!vendor_id) {
      res.status(400);
      throw new Error('Missing vendor_id');
    }

    // Determine the status (idnorm might send 'approved', 'rejected')
    let kycStatus = 'PENDING';
    if (status === 'approved' || status === 'verified') {
      kycStatus = 'VERIFIED';
    } else if (status === 'rejected') {
      kycStatus = 'REJECTED';
    }

    const updateData = { kyc_status: kycStatus };
    if (kycStatus === 'VERIFIED') {
      updateData.verifiedAt = new Date();
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendor_id },
      data: updateData,
    });

    res.status(200).json({ message: 'KYC updated', kyc_status: updatedVendor.kyc_status });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitKyc,
  getKycStatus,
  createIdnormSession,
  handleIdnormCallback
};
