const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage for payment receipts
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `receipt-${Date.now()}-${Math.round(Math.random() * 1e5)}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from workspace root
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));

// Database Helper
function getDb() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Database read error:', err);
    return { products: [], orders: [], inquiries: [], settings: {} };
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Database write error:', err);
    return false;
  }
}

// Admin Auth Middleware
function requireAdmin(req, res, next) {
  const db = getDb();
  const authHeader = req.headers.authorization;
  const pin = req.headers['x-admin-pin'] || req.query.pin;

  if (
    authHeader === 'Bearer khyxx-admin-session' ||
    pin === db.settings.adminPin ||
    req.body.adminPin === db.settings.adminPin
  ) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Invalid Admin Credentials' });
}

// ==================== PUBLIC API ENDPOINTS ==================== //

// 1. Get Store Settings (Public)
app.get('/api/settings', (req, res) => {
  const db = getDb();
  const { adminPin, ...publicSettings } = db.settings;
  res.json(publicSettings);
});

// 2. Get Products Catalog
app.get('/api/products', (req, res) => {
  const db = getDb();
  res.json(db.products || []);
});

// 3. Get Single Product
app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  const product = (db.products || []).find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// 4. Create Order
app.post('/api/orders', (req, res) => {
  const { customer, event, items, paymentMethod, paymentReference } = req.body;

  if (!customer?.name || !customer?.email || !items || !items.length) {
    return res.status(400).json({ error: 'Missing required customer or items data' });
  }

  const db = getDb();
  const orderNumber = Math.floor(1000 + Math.random() * 9000);
  const orderId = `KHYXX-2026-${orderNumber}`;

  // Calculate accurate total
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  // Generate template links from product catalog
  const templateLinks = items.map(item => {
    const prod = (db.products || []).find(p => p.name === item.name || p.id === item.id);
    return {
      name: `${item.name} Canva Suite`,
      url: prod?.canvaUrl || 'https://khyxxdigitals.my.canva.site/template'
    };
  });

  const newOrder = {
    id: orderId,
    createdAt: new Date().toISOString(),
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim(),
      phone: customer.phone ? customer.phone.trim() : ''
    },
    event: {
      coupleNames: event?.coupleNames || '',
      weddingDate: event?.weddingDate || '',
      facebookLink: event?.facebookLink || '',
      content: event?.content || ''
    },
    items,
    total,
    paymentMethod: paymentMethod || 'gcash',
    paymentReference: paymentReference ? paymentReference.trim() : '',
    paymentReceipt: null,
    status: paymentReference ? 'payment_submitted' : 'pending_payment',
    digitalDelivered: false,
    templateLinks,
    adminNotes: ''
  };

  db.orders.unshift(newOrder);
  saveDb(db);

  res.status(201).json({
    success: true,
    orderId,
    order: newOrder
  });
});

// 5. Get Order Details (For Tracking)
app.get('/api/orders/:id', (req, res) => {
  const db = getDb();
  const cleanId = req.params.id.trim().toUpperCase();
  const order = db.orders.find(o => o.id.toUpperCase() === cleanId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found with that tracking code.' });
  }

  // If order is paid or completed, deliver digital items
  const isDelivered = order.status === 'paid' || order.status === 'completed';

  res.json({
    ...order,
    templateLinks: isDelivered ? order.templateLinks : [],
    canvaAccessUnlocked: isDelivered,
    guides: [
      {
        title: 'Khyxx Digitals - Canva Editing Guide (PDF)',
        description: 'Step-by-step instructions on customizing your fonts, colors, and layout.',
        url: 'guides/Canva_Editing_Guide.pdf'
      },
      {
        title: 'Wedding Stationery & Printing Guide',
        description: 'Recommended paper GSM, bleed margins, and printing shops in PH.',
        url: 'guides/Printing_Recommendations.pdf'
      }
    ]
  });
});

// 6. Upload Payment Proof / Reference for Order
app.post('/api/orders/:id/payment', upload.single('receipt'), (req, res) => {
  const db = getDb();
  const cleanId = req.params.id.trim().toUpperCase();
  const orderIndex = db.orders.findIndex(o => o.id.toUpperCase() === cleanId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const order = db.orders[orderIndex];
  const { referenceNumber, paymentMethod } = req.body;

  if (referenceNumber) order.paymentReference = referenceNumber.trim();
  if (paymentMethod) order.paymentMethod = paymentMethod;
  if (req.file) order.paymentReceipt = `/uploads/${req.file.filename}`;

  // Automatically update status to payment_submitted if previously pending
  if (order.status === 'pending_payment') {
    order.status = 'payment_submitted';
  }

  db.orders[orderIndex] = order;
  saveDb(db);

  res.json({
    success: true,
    message: 'Payment verification details uploaded successfully.',
    order
  });
});

// 7. Submit Contact Inquiry
app.post('/api/inquiries', (req, res) => {
  const { name, email, eventType, eventDate, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please provide your name, email, and message.' });
  }

  const db = getDb();
  const inquiryId = `INQ-2026-${Math.floor(100 + Math.random() * 900)}`;

  const newInquiry = {
    id: inquiryId,
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    eventType: eventType || 'Wedding Template Inquiry',
    eventDate: eventDate || '',
    message: message.trim(),
    status: 'new'
  };

  db.inquiries.unshift(newInquiry);
  saveDb(db);

  res.status(201).json({
    success: true,
    inquiryId,
    message: 'Inquiry received. Khye will get back to you within 24 hours!'
  });
});

// ==================== ADMIN API ENDPOINTS ==================== //

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  const db = getDb();

  if (pin === db.settings.adminPin) {
    return res.json({
      success: true,
      token: 'khyxx-admin-session',
      storeName: db.settings.storeName
    });
  }
  res.status(401).json({ error: 'Invalid admin PIN' });
});

// Admin Stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const db = getDb();
  const orders = db.orders || [];
  const inquiries = db.inquiries || [];

  const totalRevenue = orders
    .filter(o => o.status === 'paid' || o.status === 'completed')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingCount = orders.filter(
    o => o.status === 'pending_payment' || o.status === 'payment_submitted'
  ).length;

  const paidCount = orders.filter(o => o.status === 'paid' || o.status === 'completed').length;
  const unreadInquiries = inquiries.filter(i => i.status === 'new').length;

  res.json({
    totalRevenue,
    orderCount: orders.length,
    pendingOrders: pendingCount,
    paidOrders: paidCount,
    totalInquiries: inquiries.length,
    unreadInquiries
  });
});

// Admin List Orders
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const db = getDb();
  let list = db.orders || [];
  if (req.query.status && req.query.status !== 'all') {
    list = list.filter(o => o.status === req.query.status);
  }
  res.json(list);
});

// Admin Update Order Status / Notes
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const { status, adminNotes, digitalDelivered, templateLinks } = req.body;
  const order = db.orders[orderIndex];

  if (status) order.status = status;
  if (adminNotes !== undefined) order.adminNotes = adminNotes;
  if (digitalDelivered !== undefined) order.digitalDelivered = digitalDelivered;
  if (templateLinks) order.templateLinks = templateLinks;

  db.orders[orderIndex] = order;
  saveDb(db);

  res.json({ success: true, order });
});

// Admin Delete Order
app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const initialLen = db.orders.length;
  db.orders = db.orders.filter(o => o.id !== req.params.id);

  if (db.orders.length === initialLen) {
    return res.status(404).json({ error: 'Order not found' });
  }

  saveDb(db);
  res.json({ success: true, message: 'Order deleted successfully' });
});

// Admin Inquiries
app.get('/api/admin/inquiries', requireAdmin, (req, res) => {
  const db = getDb();
  res.json(db.inquiries || []);
});

// Admin Update Inquiry
app.patch('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const inq = db.inquiries.find(i => i.id === req.params.id);
  if (!inq) return res.status(404).json({ error: 'Inquiry not found' });

  if (req.body.status) inq.status = req.body.status;
  saveDb(db);
  res.json({ success: true, inquiry: inq });
});

// Admin Update Settings
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const db = getDb();
  db.settings = { ...db.settings, ...req.body };
  saveDb(db);
  const { adminPin, ...publicSettings } = db.settings;
  res.json({ success: true, settings: publicSettings });
});

// Admin Update Product
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  db.products[idx] = { ...db.products[idx], ...req.body };
  saveDb(db);
  res.json({ success: true, product: db.products[idx] });
});

// Fallback for HTML routing
app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'track-order.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`✦ Khyxx Digitals Server running on http://localhost:${PORT} ✦`);
});

