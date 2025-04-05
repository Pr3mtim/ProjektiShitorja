const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const ratelimit = require('express-rate-limit');
require('dotenv').config();
const {Parsor} = require('json2csv');
const { error } = require('console');


const app = express ();
// Middleware
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:3000', // your React app's URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} `, req.body);
    next();
});

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser:true,
    useUnifiedTopology:true
})
.then(() => console.log("Mongo DB Connected"))
.catch(err => console.error("MONGO Db connection Error" , err ));


const authenticate = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1]; // safer split approach

    if (!token) {
        return res.status(401).json({ message: 'No Token Provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid Token' });
    }
};


const Admin = mongoose.model('Admin',new mongoose.Schema({
    username : {type:String,Unique:true},
    password : String
}));

    const Brand = mongoose.model('Brand', new mongoose.Schema({
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, required: true, min: 0 },
        lastRestocked: Date
    }));

    const saleSchema = new mongoose.Schema({
        brand: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Brand', 
            required: true 
        },
        quantity: { 
            type: Number, 
            required: true, 
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer value'
            }
        },
        totalAmount: { 
            type: Number, 
            required: true, 
            min: 0.01 
        },
        amountReceived: { 
            type: Number, 
            required: true,
            validate: {
                validator: function(value) {
                    // Allow for tiny floating point differences
                    return Math.abs(value - this.totalAmount) >= -0.01;
                },
                message: 'Amount received ({VALUE}) must be >= total amount ({this.totalAmount})'
            }
        },
        saleType: { 
            type: String, 
            enum: ['single', 'multi'], 
            default: 'single' 
        },
        date: { 
            type: Date, 
            default: Date.now 
        }
    }, {
        timestamps: true
    });

    const Sale = mongoose.model('Sale', saleSchema);

    saleSchema.index({brand:1,date:-1});
    saleSchema.index({date:-1});

    app.post('/register' , async(req,res)=>{
        try{
            const{username,password} = req.body;
            if(!username || !password){
                return res.status(400).json({message:'Username and Password Required'});
            }
            const hashedPassword = await bcrypt.hash(password,10);
            const admin = new Admin({username,password:hashedPassword});
            await admin.save();
            res.json({message:'Admin has been registered'});
        }catch(err){
            res.status(500).json({message:'Registration failed', error:err.message});
        }
    
    });

    app.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const admin = await Admin.findOne({ username });
            if (!admin) return res.status(400).json({ message: 'Invalid credentials' });
            
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
            
            const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        } catch (err) {
            res.status(500).json({ message: 'Login failed', error: err.message });
        }
    });

    app.post('/brands', async (req, res) => {
        try {
            const { name, price, stock } = req.body;
            const brand = new Brand({ name, price, stock, lastRestocked: new Date() });
            await brand.save();
            res.json(brand);
        } catch (err) {
            res.status(500).json({ message: 'Failed to add brand', error: err.message });
        }
    });

    app.get('/brands',async (req, res) => {
        try {
            const brands = await Brand.find();
            res.json(brands);
        
        }catch(err){
            res.status(500).json({message:'Failed to fetch products', error: err.message});
        }
    });

    app.put('/brands/:id', async (req, res) => {
        try {
            const { stock } = req.body;
            const brand = await Brand.findByIdAndUpdate(
                req.params.id, 
                { stock, lastRestocked: new Date() }, 
                { new: true }
            );
            res.json(brand);
        } catch (err) {
            res.status(500).json({ message: 'Failed to update brand', error: err.message });
        }
    });


    app.post('/sales', authenticate, async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const { brandId, quantity, totalAmount, amountReceived } = req.body;
    
            // Enhanced input validation
            if (!brandId || quantity === undefined || totalAmount === undefined || amountReceived === undefined) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    success: false,
                    message: 'Missing required fields',
                    required: {
                        brandId: 'string (valid brand ID)',
                        quantity: 'number (integer >= 1)',
                        totalAmount: 'number (>= 0.01)',
                        amountReceived: 'number (>= totalAmount)'
                    },
                    received: req.body
                });
            }
    
            if (amountReceived < totalAmount) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    success: false,
                    message: 'Amount received must be greater than or equal to total amount',
                    details: {
                        amountReceived,
                        totalAmount,
                        difference: amountReceived - totalAmount
                    }
                });
            }
    
            // Check brand exists with better error handling
            const brand = await Brand.findById(brandId).session(session);
            if (!brand) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ 
                    success: false,
                    message: 'Brand not found',
                    brandId,
                    suggestion: 'Check /brands endpoint for valid brand IDs'
                });
            }
    
            // Stock validation with clearer message
            if (brand.stock < quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    success: false,
                    message: 'Insufficient stock',
                    details: {
                        brand: brand.name,
                        availableStock: brand.stock,
                        requestedQuantity: quantity,
                        remainingAfterSale: brand.stock - quantity
                    }
                });
            }
    
            // Create sale record with additional validation
            const sale = new Sale({
                brand: brandId,
                quantity,
                totalAmount,
                amountReceived,
                saleType: quantity > 1 ? 'multi' : 'single',
                changeGiven: amountReceived - totalAmount
            });
    
            // Validate before saving
            const validationError = sale.validateSync();
            if (validationError) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    success: false,
                    message: 'Validation failed',
                    errors: validationError.errors
                });
            }
    
            // Update brand stock
            brand.stock -= quantity;
            
            // Execute transaction with timeout
            await Promise.all([
                sale.save({ session }),
                brand.save({ session })
            ]);
            
            await session.commitTransaction();
            session.endSession();
    
            // Enhanced response
            res.status(201).json({
                success: true,
                message: 'Sale recorded successfully',
                data: {
                    sale: {
                        id: sale._id,
                        brand: {
                            id: brand._id,
                            name: brand.name
                        },
                        quantity,
                        totalAmount,
                        amountReceived,
                        changeGiven: amountReceived - totalAmount,
                        date: sale.date
                    },
                    inventoryUpdate: {
                        brandId: brand._id,
                        previousStock: brand.stock + quantity,
                        newStock: brand.stock
                    }
                }
            });
    
        } catch (err) {
            // Transaction failed
            await session.abortTransaction();
            session.endSession();
            
            console.error('Sale transaction error:', err);
            
            // Enhanced error responses
            if (err.name === 'ValidationError') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Validation failed',
                    errors: Object.keys(err.errors).reduce((acc, key) => {
                        acc[key] = {
                            message: err.errors[key].message,
                            value: err.errors[key].value
                        };
                        return acc;
                    }, {})
                });
            }
            
            if (err.name === 'CastError') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid ID format',
                    details: {
                        path: err.path,
                        value: err.value,
                        suggestion: 'Ensure you are using valid MongoDB ObjectIDs'
                    }
                });
            }
    
            res.status(500).json({ 
                success: false,
                message: 'Failed to record sale',
                error: process.env.NODE_ENV === 'development' ? {
                    message: err.message,
                    stack: err.stack
                } : 'Internal server error'
            });
        }
    });

    app.post('/sales/bulk', authenticate, async (req, res) => {
        try {
            const { sales } = req.body;
            
            // Validate request structure
            if (!sales || !Array.isArray(sales)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Request body must contain a sales array'
                });
            }
    
            const results = [];
            
            for (const [index, sale] of sales.entries()) {
                try {
                    // Round amounts to 2 decimal places to avoid floating point issues
                    const roundedSale = {
                        brandId: sale.brandId,
                        quantity: sale.quantity,
                        totalAmount: parseFloat(Number(sale.totalAmount).toFixed(2)),
                        amountReceived: parseFloat(Number(sale.amountReceived).toFixed(2))
                    };
    
                    const { brandId, quantity, totalAmount, amountReceived } = roundedSale;
    
                    // Validate amounts
                    if (amountReceived < totalAmount) {
                        throw new Error(
                            `Amount received (${amountReceived}) is less than total amount (${totalAmount})`
                        );
                    }
    
                    // Check brand exists
                    const brand = await Brand.findById(brandId);
                    if (!brand) {
                        throw new Error(`Brand not found: ${brandId}`);
                    }
    
                    // Check stock
                    if (brand.stock < quantity) {
                        throw new Error(
                            `Insufficient stock for ${brand.name} (Available: ${brand.stock}, Requested: ${quantity})`
                        );
                    }
    
                    // Create and save sale
                    const newSale = await Sale.create({
                        brand: brandId,
                        quantity,
                        totalAmount,
                        amountReceived,
                        saleType: quantity > 1 ? 'multi' : 'single'
                    });
    
                    // Update brand stock
                    brand.stock -= quantity;
                    await brand.save();
                    
                    results.push(newSale);
    
                } catch (err) {
                    console.error(`Error processing sale ${index}:`, err.message);
                    return res.status(400).json({ 
                        success: false,
                        message: `Failed to process sale at index ${index}`,
                        error: err.message,
                        saleIndex: index
                    });
                }
            }
    
            res.status(201).json({
                success: true,
                message: `${results.length} sales recorded successfully`,
                data: results
            });
    
        } catch (err) {
            console.error('Bulk sale error:', err);
            res.status(500).json({ 
                success: false,
                message: 'Failed to record sales',
                error: process.env.NODE_ENV === 'development' ? err.message : null
            });
        }
    });
    
    app.get('/sales', async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const sales = await Sale.find()
                .populate('brand')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ date: -1 });
                
            const count = await Sale.countDocuments();
            
            res.json({
                sales,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            });
        } catch (err) {
            res.status(500).json({ message: 'Failed to fetch sales', error: err.message });
        }
    });
    
    // Enhanced Report Routes
    app.get('/sales/advanced-report', async (req, res) => {
        try {
            const { period, saleType, brandId, startDate: start, endDate: end } = req.query;
            let startDate = new Date();
            let endDate = new Date();
    
            // Date range calculation
            switch (period) {
                case 'day': startDate.setDate(startDate.getDate() - 1); break;
                case 'week': startDate.setDate(startDate.getDate() - 7); break;
                case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
                case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
                case 'custom': 
                    startDate = new Date(start);
                    endDate = new Date(end);
                    break;
                default: return res.status(400).json({ message: 'Invalid period' });
            }
    
            // Build query
            let query = { date: { $gte: startDate, $lte: endDate } };
            if (saleType && saleType !== 'all') query.saleType = saleType;
            if (brandId && brandId !== 'all') query.brand = brandId;
    
            // Get sales data
            const sales = await Sale.find(query).populate('brand');
            
            // Calculate metrics
            const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const amountReceived = sales.reduce((sum, sale) => sum + sale.amountReceived, 0);
            const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
            
            // Group by brand
            const brandStats = sales.reduce((acc, sale) => {
                const brandName = sale.brand?.name || 'Unknown';
                if (!acc[brandName]) {
                    acc[brandName] = {
                        quantity: 0,
                        totalAmount: 0,
                        amountReceived: 0
                    };
                }
                acc[brandName].quantity += sale.quantity;
                acc[brandName].totalAmount += sale.totalAmount;
                acc[brandName].amountReceived += sale.amountReceived;
                return acc;
            }, {});
    
            // Group by date
            const dailyStats = sales.reduce((acc, sale) => {
                const date = sale.date.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = {
                        quantity: 0,
                        totalAmount: 0,
                        amountReceived: 0,
                        count: 0
                    };
                }
                acc[date].quantity += sale.quantity;
                acc[date].totalAmount += sale.totalAmount;
                acc[date].amountReceived += sale.amountReceived;
                acc[date].count++;
                return acc;
            }, {});
    
            res.json({ 
                summary: {
                    totalSales: sales.length,
                    totalAmount,
                    amountReceived,
                    totalQuantity,
                    balance: amountReceived - totalAmount,
                    singleProductSales: sales.filter(s => s.saleType === 'single').length,
                    multiProductSales: sales.filter(s => s.saleType === 'multi').length,
                    averageSaleValue: totalAmount / sales.length || 0,
                    averageQuantity: totalQuantity / sales.length || 0
                },
                brandStats,
                dailyStats,
                sales // Include raw sales data if needed
            });
        } catch (err) {
            res.status(500).json({ message: 'Failed to generate report', error: err.message });
        }
    });
    
    app.get('/sales/advanced-report/download', async (req, res) => {
        try {
            const { period, format = 'csv', startDate: start, endDate: end } = req.query;
            let startDate = new Date();
            let endDate = new Date();
    
            switch (period) {
                case 'day': startDate.setDate(startDate.getDate() - 1); break;
                case 'week': startDate.setDate(startDate.getDate() - 7); break;
                case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
                case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
                case 'custom': 
                    startDate = new Date(start);
                    endDate = new Date(end);
                    break;
                default: return res.status(400).json({ message: 'Invalid period' });
            }
    
            const sales = await Sale.find({
                date: { $gte: startDate, $lte: endDate }
            }).populate('brand');
    
            if (format === 'excel') {
                // Create Excel workbook
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Sales Report');
                
                // Add headers
                worksheet.columns = [
                    { header: 'Date', key: 'date', width: 15 },
                    { header: 'Brand', key: 'brand', width: 20 },
                    { header: 'Quantity', key: 'quantity', width: 10 },
                    { header: 'Sale Type', key: 'saleType', width: 15 },
                    { header: 'Unit Price', key: 'unitPrice', width: 12 },
                    { header: 'Total Amount', key: 'totalAmount', width: 15 },
                    { header: 'Amount Received', key: 'amountReceived', width: 18 },
                    { header: 'Balance', key: 'balance', width: 12 }
                ];
                
                // Add data
                sales.forEach(sale => {
                    worksheet.addRow({
                        date: sale.date.toISOString().split('T')[0],
                        brand: sale.brand?.name || 'Unknown',
                        quantity: sale.quantity,
                        saleType: sale.saleType === 'multi' ? 'Multi-Product' : 'Single Product',
                        unitPrice: (sale.totalAmount / sale.quantity).toFixed(2),
                        totalAmount: sale.totalAmount,
                        amountReceived: sale.amountReceived,
                        balance: (sale.amountReceived - sale.totalAmount).toFixed(2)
                    });
                });
                
                // Set response headers
                res.setHeader(
                    'Content-Type',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                );
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename=sales_report_${period}.xlsx`
                );
                
                // Send the workbook
                await workbook.xlsx.write(res);
                res.end();
            } else {
                // Standard CSV export
                const csvData = sales.map(sale => ({
                    Date: sale.date.toISOString().split('T')[0],
                    Brand: sale.brand?.name || 'Unknown',
                    Quantity: sale.quantity,
                    'Sale Type': sale.saleType === 'multi' ? 'Multi-Product' : 'Single Product',
                    'Unit Price': (sale.totalAmount / sale.quantity).toFixed(2),
                    'Total Amount': sale.totalAmount,
                    'Amount Received': sale.amountReceived,
                    'Balance': (sale.amountReceived - sale.totalAmount).toFixed(2)
                }));
    
                const json2csvParser = new Parser();
                const csv = json2csvParser.parse(csvData);
    
                res.header('Content-Type', 'text/csv');
                res.attachment(`sales_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
                res.send(csv);
            }
        } catch (err) {
            res.status(500).json({ message: 'Failed to generate report', error: err.message });
        }
    });

    app.use((err,req,res,next) => {
        console.error(err.stack);
        res.status(500).json({message:'Something went wrong' , error:err.message});
    });

    mongoose.set('debug',true);


    const PORT = process.env.PORT || 3500;
    app.listen(PORT,() => console.log(`Server is running on port ${PORT}`))
    
