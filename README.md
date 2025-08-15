# Big Drip Kicks - Inventory Management System

A modern, full-featured inventory management system built with React, TypeScript, and Supabase for streetwear businesses.

## 🚀 Features

- **🔐 Secure Authentication** - Role-based access control (Admin, Staff, Cashier)
- **📦 Product Management** - Add, edit, delete products with barcode support
- **💰 Point of Sale (POS)** - Complete sales system with receipt generation
- **📊 Dashboard Analytics** - Real-time sales, inventory, and revenue tracking
- **🖨️ Receipt Printing** - Professional receipts with logo and contact info
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **🔄 Real-time Updates** - Live inventory and sales tracking
- **📈 Sales Reports** - Comprehensive sales history and analytics
- **🔍 Barcode Scanning** - Quick product lookup and sales
- **📋 Bulk Import** - CSV file upload for mass product addition

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Build Tool**: Vite

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/big-drip-kicks.git
   cd big-drip-kicks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase Database**
   - Create a new Supabase project
   - Run the SQL migrations in `supabase/migrations/`
   - Update your environment variables with the project credentials

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📊 Database Schema

The system uses the following main tables:
- `profiles` - User profiles and roles
- `products` - Product inventory
- `sales` - Sales transactions
- `sale_items` - Individual items in sales
- `audit_logs` - System activity tracking

## 🔐 Authentication

The system supports three user roles:
- **Admin**: Full access to all features
- **Staff**: Product and sales management
- **Cashier**: Sales and basic inventory access

## 🎨 Customization

### Branding
- Update logo: Replace `public/logo.png`
- Update login background: Replace `public/login-bg.jpg`
- Modify contact info in receipt templates

### Styling
- Customize colors in `tailwind.config.js`
- Modify components in `src/components/`

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push

### Environment Variables for Production

Make sure to set these in your Vercel project:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📱 Usage

### Adding Products
1. Navigate to Inventory
2. Click "Add Product"
3. Fill in product details
4. Save to database

### Making Sales
1. Go to Sales page
2. Scan barcode or search product
3. Add items to cart
4. Process payment
5. Print/download receipt

### Viewing Reports
1. Check Dashboard for overview
2. View detailed sales in Sales page
3. Monitor inventory levels

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/     # React components
├── contexts/       # React contexts
├── lib/           # Utility libraries
├── types/         # TypeScript types
└── App.tsx        # Main app component
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@bigdripkicks.com or create an issue on GitHub.

---

**Big Drip Kicks** - Premium Streetwear Inventory Management
