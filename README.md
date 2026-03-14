Big Drip Kicks – Inventory Management System

Big Drip Kicks is a modern inventory and point-of-sale system designed for streetwear and retail businesses. The system helps store owners manage products, track sales, monitor inventory levels, and generate receipts through a simple and responsive interface.

The platform was built to support small and medium retail operations that need a reliable digital system for managing day-to-day sales and stock without complicated infrastructure.

Features
Secure Authentication

Role-based authentication ensures that users only access the features relevant to their responsibilities. The system supports three main roles: Admin, Staff, and Cashier.

Product Management

Users can add, update, or remove products from inventory. The system also supports barcode integration for easier product identification and faster checkout.

Point of Sale (POS)

The built-in POS system allows staff to process sales quickly, generate receipts, and track transaction history.

Dashboard Analytics

A dashboard provides a real-time overview of inventory levels, sales activity, and revenue performance.

Receipt Generation

The system generates professional receipts that include store branding, purchase details, and contact information.

Responsive Interface

The application is designed to work smoothly across desktops, tablets, and mobile devices.

Real-Time Inventory Updates

Inventory levels update automatically as sales occur, helping store owners avoid stock inconsistencies.

Sales Reporting

Detailed reports provide insights into sales history and overall store performance.

Barcode Support

Barcode scanning allows for faster product lookup and quicker checkout processes.

Bulk Product Import

Products can be imported using CSV files, making it easier to add large inventories at once.

Technology Stack

Frontend

React 18

TypeScript

Tailwind CSS

Backend / Infrastructure

Supabase (PostgreSQL database, authentication, real-time updates)

Deployment

Vercel

Build Tools

Vite

UI Icons

Lucide React

Getting Started
Prerequisites

Node.js 18 or later

npm or yarn

A Supabase account

Installation
1. Clone the repository
git clone https://github.com/yourusername/big-drip-kicks.git
cd big-drip-kicks

2. Install dependencies
npm install

3. Configure environment variables

Create a .env file in the root directory and add the following variables:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Set up the database

Create a new Supabase project.

Run the SQL migrations located in the supabase/migrations directory.

Update the environment variables with your project credentials.

5. Start the development server
npm run dev

Database Structure

The system uses the following primary tables:

profiles – stores user accounts and roles

products – manages inventory records

sales – records completed transactions

sale_items – stores individual products within each sale

audit_logs – tracks system activity and changes

Authentication and Roles

The platform uses role-based access control with three primary roles:

Admin

Full system access

Inventory management

Sales reports and user management

Staff

Product and inventory management

Sales processing

Cashier

Sales processing

Basic product lookup

Customization
Branding

You can customize store branding by updating the following files:

Replace public/logo.png with your store logo

Replace public/login-bg.jpg with a custom background

Update receipt information inside the receipt templates

Styling

The interface styling can be modified by editing:

tailwind.config.js

components in src/components

Deployment
Deploying with Vercel

Push the project to GitHub

git add .
git commit -m "Initial commit"
git push origin main


Connect the repository to Vercel.

Add the required environment variables in the Vercel dashboard.

Deploy. Future pushes to the main branch will automatically trigger new deployments.

Usage Overview
Adding Products

Navigate to the Inventory section.

Select Add Product.

Enter the product details and save.

Processing a Sale

Open the Sales page.

Scan the barcode or search for the product.

Add items to the cart.

Complete the transaction.

Print or download the receipt.

Viewing Reports

The dashboard provides a high-level overview of store performance, while the Sales page provides detailed transaction history.

Development Scripts
npm run dev       # Start development server
npm run build     # Build production version
npm run preview   # Preview production build
npm run lint      # Run code linting

Project Structure
src/
├── components/
├── contexts/
├── lib/
├── types/
└── App.tsx

License

This project is released under the MIT License.
