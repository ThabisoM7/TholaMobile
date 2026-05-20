const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

// Setup or update vendor loyalty program
exports.setupProgram = async (req, res) => {
  try {
    const { stamps_needed, reward_description } = req.body;

    if (!stamps_needed || !reward_description) {
      return res.status(400).json({ error: 'Stamps needed and reward description are required.' });
    }

    // Find vendor profile associated with authenticated user
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found for this account.' });
    }

    const program = await prisma.loyaltyProgram.upsert({
      where: { vendor_id: vendor.id },
      update: {
        stamps_needed: parseInt(stamps_needed),
        reward_description
      },
      create: {
        vendor_id: vendor.id,
        stamps_needed: parseInt(stamps_needed),
        reward_description
      }
    });

    return res.status(200).json(program);
  } catch (error) {
    console.error('Error setting up loyalty program:', error);
    return res.status(500).json({ error: 'Failed to configure loyalty program.' });
  }
};

// Get the active loyalty program for current vendor
exports.getProgramMe = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found.' });
    }

    const program = await prisma.loyaltyProgram.findUnique({
      where: { vendor_id: vendor.id }
    });

    if (!program) {
      return res.status(404).json({ message: 'No active loyalty program setup yet.' });
    }

    return res.status(200).json(program);
  } catch (error) {
    console.error('Error fetching vendor program:', error);
    return res.status(500).json({ error: 'Failed to retrieve program.' });
  }
};

// Get loyalty program for a specific vendor (public endpoint)
exports.getProgram = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const program = await prisma.loyaltyProgram.findUnique({
      where: { vendor_id: vendorId }
    });

    if (!program) {
      return res.status(404).json({ error: 'Loyalty program not active for this vendor.' });
    }

    return res.status(200).json(program);
  } catch (error) {
    console.error('Error fetching loyalty program:', error);
    return res.status(500).json({ error: 'Failed to retrieve program.' });
  }
};

// Generate the cryptographically signed daily QR payload string (Vendor-only)
exports.getVendorQR = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found.' });
    }

    // Daily rotating date string
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Compute secure HMAC signature
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured in the environment.');
    }
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
    hmac.update(`${vendor.id}-${dateStr}`);
    const signature = hmac.digest('hex');

    const qrPayload = JSON.stringify({
      vendor_id: vendor.id,
      date: dateStr,
      signature
    });

    return res.status(200).json({ qrPayload });
  } catch (error) {
    console.error('Error generating loyalty QR payload:', error);
    return res.status(500).json({ error: 'Failed to generate signed QR token.' });
  }
};

// Fetch active loyalty cards for the customer
exports.getUserCards = async (req, res) => {
  try {
    const cards = await prisma.loyaltyCard.findMany({
      where: { user_id: req.user.id },
      include: {
        vendor: {
          select: {
            id: true,
            business_name: true,
            category: true,
            logo_url: true,
            banner_url: true,
            township: true,
            loyaltyProgram: {
              select: {
                stamps_needed: true,
                reward_description: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.status(200).json(cards);
  } catch (error) {
    console.error('Error fetching user cards:', error);
    return res.status(500).json({ error: 'Failed to retrieve stamp cards.' });
  }
};

// Scan QR code and claim stamp
exports.claimStamp = async (req, res) => {
  try {
    const { vendor_id, date, signature } = req.body;

    if (!vendor_id || !date || !signature) {
      return res.status(400).json({ error: 'Invalid barcode payload. Required fields missing.' });
    }

    // 1. Verify date - Must match active server date (YYYY-MM-DD)
    const serverDate = new Date().toISOString().split('T')[0];
    if (date !== serverDate) {
      return res.status(400).json({ error: 'QR Code stamp has expired. Ask the vendor to show a fresh code.' });
    }

    // 2. Validate cryptographic signature
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured in the environment.');
    }
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
    hmac.update(`${vendor_id}-${date}`);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Cryptographic validation failed. This QR code signature is forged or invalid.' });
    }

    // 3. Find the loyalty program for rules
    const program = await prisma.loyaltyProgram.findUnique({
      where: { vendor_id }
    });

    if (!program) {
      return res.status(404).json({ error: 'This vendor does not support active stamp programs.' });
    }

    // 4. Query card and check 4-hour anti-spam cooldown
    const existingCard = await prisma.loyaltyCard.findUnique({
      where: {
        user_id_vendor_id: {
          user_id: req.user.id,
          vendor_id
        }
      }
    });

    const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 Hours
    if (existingCard && !existingCard.is_completed) {
      const msSinceLastUpdate = Date.now() - new Date(existingCard.updatedAt).getTime();
      if (msSinceLastUpdate < COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((COOLDOWN_MS - msSinceLastUpdate) / 60000);
        return res.status(400).json({
          error: `Stamp cooldown active. You already claimed a stamp from this vendor recently. Try again in ${remainingMinutes} minutes.`
        });
      }
    }

    // 5. Update or create loyalty stamp count
    const stampsNeeded = program.stamps_needed;
    let newCount = (existingCard ? existingCard.stamps_count : 0) + 1;
    let isCompleted = newCount >= stampsNeeded;

    const card = await prisma.loyaltyCard.upsert({
      where: {
        user_id_vendor_id: {
          user_id: req.user.id,
          vendor_id
        }
      },
      update: {
        stamps_count: newCount,
        is_completed: isCompleted
      },
      create: {
        user_id: req.user.id,
        vendor_id,
        stamps_count: newCount,
        is_completed: isCompleted
      },
      include: {
        vendor: {
          select: {
            business_name: true,
            category: true,
            logo_url: true
          }
        }
      }
    });

    return res.status(200).json({
      message: isCompleted 
        ? `Congratulations! You unlocked a reward at ${card.vendor.business_name}: "${program.reward_description}"`
        : `Stamp registered! You have collected ${card.stamps_count} of ${stampsNeeded} stamps at ${card.vendor.business_name}.`,
      card,
      rewardUnlocked: isCompleted
    });
  } catch (error) {
    console.error('Error claiming loyalty stamp:', error);
    return res.status(500).json({ error: 'Failed to process stamp scan.' });
  }
};

// Redeem reward card
exports.redeemCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await prisma.loyaltyCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Loyalty card not found.' });
    }

    if (card.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this loyalty card.' });
    }

    if (!card.is_completed) {
      return res.status(400).json({ error: 'You have not unlocked the reward on this card yet.' });
    }

    // Reset card progress
    const updatedCard = await prisma.loyaltyCard.update({
      where: { id: cardId },
      data: {
        stamps_count: 0,
        is_completed: false
      }
    });

    return res.status(200).json({
      message: 'Reward redeemed successfully! Your card is reset so you can begin collecting stamps again.',
      card: updatedCard
    });
  } catch (error) {
    console.error('Error redeeming loyalty card:', error);
    return res.status(500).json({ error: 'Failed to redeem reward card.' });
  }
};
