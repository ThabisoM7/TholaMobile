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
    const apiKey = process.env.IDNORM_API_KEY;
    const configId = process.env.IDNORM_CONFIG_ID || 'default_config';
    
    if (!apiKey) {
      console.warn("IDNORM_API_KEY is not set in environment variables");
    }

    try {
      const response = await axios.post('https://api.idnorm.com/api/v1/create_session', {
        configId: configId,
        externalUserId: vendor.id,
        // Replace with your actual production backend URL for the webhook
        callbackUrl: 'https://thola-api.up.railway.app/api/kyc/idnorm-callback'
      }, { 
        headers: { 
          'Idnorm-License-Key': apiKey,
          'Content-Type': 'application/json'
        } 
      });
      
      res.status(200).json({ 
        sessionUrl: response.data.verificationUrl, 
        reference: vendor.id 
      });
    } catch (apiError) {
      console.error('IDNORM API Error:', apiError.response?.data || apiError.message);
      // Fallback for development if the API key isn't working/set
      res.status(500);
      throw new Error('Failed to create IDNORM verification session');
    }
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
